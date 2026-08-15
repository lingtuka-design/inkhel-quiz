import { Env, json, err, handleOptions, toCamelCase } from './_db'

export const onRequestOptions: PagesFunction = async () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const roundId = url.searchParams.get('roundId')
    const participantId = url.searchParams.get('participantId')

    if (id) {
      const attempt = await env.DB.prepare('SELECT * FROM attempts WHERE id = ?').bind(id).first()
      if (!attempt) return err('Attempt not found', 404)

      const round = await env.DB.prepare('SELECT * FROM rounds WHERE id = ?').bind((attempt as any).round_id).first()
      const participant = await env.DB.prepare('SELECT * FROM participants WHERE id = ?').bind((attempt as any).participant_id).first()

      // Fetch answers
      const { results: answers } = await env.DB.prepare(
        'SELECT * FROM attempt_answers WHERE attempt_id = ?'
      )
        .bind(id)
        .all()

      // Fetch review questions if attempt completed/expired
      let reviewQuestions: any[] = []
      if ((attempt as any).status === 'completed' || (attempt as any).status === 'expired') {
        const { results: questions } = await env.DB.prepare(
          'SELECT id, round_id, text, question_order FROM questions WHERE round_id = ? ORDER BY question_order ASC'
        )
          .bind((attempt as any).round_id)
          .all()

        const qIds = questions.map((q: any) => `'${q.id}'`).join(',')
        const { results: options } = qIds
          ? await env.DB.prepare(`SELECT * FROM question_options WHERE question_id IN (${qIds})`).all()
          : { results: [] }

        const answerMap = new Map((answers as any[]).map((a) => [a.question_id, a]))
        const optionsByQ: Record<string, any[]> = {}
        for (const opt of options as any[]) {
          if (!optionsByQ[opt.question_id]) optionsByQ[opt.question_id] = []
          optionsByQ[opt.question_id].push({
            key: opt.option_key,
            text: opt.text,
            isCorrect: Boolean(opt.is_correct),
          })
        }

        reviewQuestions = questions.map((q: any) => {
          const ans = answerMap.get(q.id)
          return {
            id: q.id,
            text: q.text,
            order: q.question_order,
            options: optionsByQ[q.id] || [],
            selectedKey: ans?.selected_option_key || null,
            isCorrect: Boolean(ans?.is_correct),
            answered: Boolean(ans),
          }
        })
      }

      // Calculate authoritative rank for this attempt in this round
      const rankResult = await env.DB.prepare(
        `SELECT COUNT(*) + 1 as rank
         FROM attempts
         WHERE round_id = ?
           AND status IN ('completed', 'expired')
           AND is_test_attempt = 0
           AND (
             final_score > ?
             OR (final_score = ? AND correct_answers > ?)
             OR (final_score = ? AND correct_answers = ? AND time_taken_seconds < ?)
             OR (final_score = ? AND correct_answers = ? AND time_taken_seconds = ? AND completed_at < ?)
           )`
      )
        .bind(
          (attempt as any).round_id,
          (attempt as any).final_score ?? 0,
          (attempt as any).final_score ?? 0,
          (attempt as any).correct_answers ?? 0,
          (attempt as any).final_score ?? 0,
          (attempt as any).correct_answers ?? 0,
          (attempt as any).time_taken_seconds ?? 0,
          (attempt as any).final_score ?? 0,
          (attempt as any).correct_answers ?? 0,
          (attempt as any).time_taken_seconds ?? 0,
          (attempt as any).completed_at ?? new Date().toISOString(),
        )
        .first<{ rank: number }>()

      return json({
        attempt: toCamelCase(attempt),
        round: toCamelCase(round),
        participant: toCamelCase(participant),
        answers: toCamelCase(answers),
        reviewQuestions,
        rank: rankResult?.rank || 1,
      })
    }

    if (roundId && participantId) {
      const attempt = await env.DB.prepare(
        'SELECT * FROM attempts WHERE round_id = ? AND participant_id = ? ORDER BY created_at DESC'
      )
        .bind(roundId, participantId)
        .first()

      if (!attempt) return json({ attempt: null })
      return json({ attempt: toCamelCase(attempt) })
    }

    return err('Missing query parameters')
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body: any = await request.json()
    const { action } = body
    const now = new Date()
    const nowIso = now.toISOString()

    if (action === 'start') {
      const { roundId, participantId, displayName, email, photoUrl, avatarGradient, provider } = body
      if (!roundId || !participantId) return err('roundId and participantId are required')

      const round = await env.DB.prepare('SELECT * FROM rounds WHERE id = ?').bind(roundId).first<any>()
      if (!round) return err('Round not found', 404)

      // Ensure participant exists in D1 table to satisfy Foreign Key constraint
      const part = await env.DB.prepare('SELECT id FROM participants WHERE id = ?').bind(participantId).first()
      if (!part) {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO participants (id, display_name, email, photo_url, avatar_gradient, provider, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            participantId,
            displayName || 'Player',
            email || null,
            photoUrl || null,
            avatarGradient || 'from-indigo-500 to-sky-500',
            provider || 'guest',
            nowIso,
            nowIso,
          )
          .run()
      }

      // Check existing attempt
      const existing = await env.DB.prepare(
        'SELECT * FROM attempts WHERE round_id = ? AND participant_id = ? ORDER BY created_at DESC'
      )
        .bind(roundId, participantId)
        .first<any>()

      if (existing) {
        if (existing.status === 'in_progress') {
          // Check if expired
          const startedAt = new Date(existing.started_at).getTime()
          const deadline = startedAt + round.time_limit_seconds * 1000 + 5000 // 5s grace
          if (now.getTime() > deadline) {
            // Mark expired
            await env.DB.prepare("UPDATE attempts SET status = 'expired', completed_at = ? WHERE id = ?")
              .bind(new Date(startedAt + round.time_limit_seconds * 1000).toISOString(), existing.id)
              .run()
            existing.status = 'expired'
            return json({ attempt: toCamelCase(existing), alreadyCompleted: true })
          }
          return json({ attempt: toCamelCase(existing) })
        }
        return json({ attempt: toCamelCase(existing), alreadyCompleted: true })
      }

      const attemptId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      await env.DB.prepare(
        `INSERT INTO attempts (id, participant_id, round_id, started_at, status, created_at)
         VALUES (?, ?, ?, ?, 'in_progress', ?)`
      )
        .bind(attemptId, participantId, roundId, nowIso, nowIso)
        .run()

      const created = await env.DB.prepare('SELECT * FROM attempts WHERE id = ?').bind(attemptId).first()
      return json({ attempt: toCamelCase(created) })
    }

    if (action === 'answer') {
      const { attemptId, questionId, selectedOptionKey, elapsedSeconds = 0 } = body
      if (!attemptId || !questionId) return err('attemptId and questionId are required')

      const attempt = await env.DB.prepare('SELECT * FROM attempts WHERE id = ?').bind(attemptId).first<any>()
      if (!attempt || attempt.status !== 'in_progress') return err('Invalid or closed attempt', 400)

      // Verify correctness
      let isCorrect = 0
      if (selectedOptionKey) {
        const opt = await env.DB.prepare(
          'SELECT is_correct FROM question_options WHERE question_id = ? AND option_key = ?'
        )
          .bind(questionId, selectedOptionKey)
          .first<{ is_correct: number }>()

        isCorrect = opt?.is_correct ? 1 : 0
      }

      const answerId = `ans_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      
      // Delete existing answer if any, then insert
      await env.DB.prepare('DELETE FROM attempt_answers WHERE attempt_id = ? AND question_id = ?')
        .bind(attemptId, questionId)
        .run()

      await env.DB.prepare(
        `INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option_key, is_correct, answered_at, elapsed_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(answerId, attemptId, questionId, selectedOptionKey, isCorrect, nowIso, elapsedSeconds)
        .run()

      return json({ success: true })
    }

    if (action === 'finalize') {
      const { attemptId, forceExpired } = body
      if (!attemptId) return err('attemptId is required')

      const attempt = await env.DB.prepare('SELECT * FROM attempts WHERE id = ?').bind(attemptId).first<any>()
      if (!attempt) return err('Attempt not found', 404)
      if (attempt.status !== 'in_progress') {
        return json({ attempt: toCamelCase(attempt) })
      }

      const round = await env.DB.prepare('SELECT * FROM rounds WHERE id = ?').bind(attempt.round_id).first<any>()
      const { results: questions } = await env.DB.prepare('SELECT id FROM questions WHERE round_id = ?')
        .bind(attempt.round_id)
        .all()
      const { results: answers } = await env.DB.prepare('SELECT * FROM attempt_answers WHERE attempt_id = ?')
        .bind(attemptId)
        .all<any>()

      const totalQuestions = questions.length
      const correctAnswers = answers.filter((a) => a.is_correct === 1).length
      const answeredCount = answers.length
      const unansweredQuestions = Math.max(0, totalQuestions - answeredCount)
      const incorrectAnswers = totalQuestions - correctAnswers - unansweredQuestions

      const startedAt = new Date(attempt.started_at).getTime()
      const totalElapsed = Math.min(round.time_limit_seconds, Math.max(1, Math.round((now.getTime() - startedAt) / 1000)))
      const isExpired = Boolean(forceExpired) || now.getTime() > (startedAt + round.time_limit_seconds * 1000 + 2000)

      const baseScore = correctAnswers * 10
      let speedBonus = 0
      if (!isExpired && unansweredQuestions === 0) {
        const remaining = Math.max(0, round.time_limit_seconds - totalElapsed)
        speedBonus = Math.round((20 * remaining) / round.time_limit_seconds)
      }
      const finalScore = baseScore + speedBonus
      const finalStatus = isExpired ? 'expired' : 'completed'

      await env.DB.prepare(
        `UPDATE attempts SET
          status = ?,
          completed_at = ?,
          time_taken_seconds = ?,
          correct_answers = ?,
          incorrect_answers = ?,
          unanswered_questions = ?,
          base_score = ?,
          speed_bonus = ?,
          final_score = ?
         WHERE id = ?`
      )
        .bind(
          finalStatus,
          nowIso,
          totalElapsed,
          correctAnswers,
          incorrectAnswers,
          unansweredQuestions,
          baseScore,
          speedBonus,
          finalScore,
          attemptId,
        )
        .run()

      const updated = await env.DB.prepare('SELECT * FROM attempts WHERE id = ?').bind(attemptId).first()
      return json({ attempt: toCamelCase(updated) })
    }

    return err('Unknown action')
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}
