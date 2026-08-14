import { Env, json, err, handleOptions, verifyAdmin, toCamelCase } from './_db'

export const onRequestOptions: PagesFunction = async () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url)
    const roundId = url.searchParams.get('roundId')
    if (!roundId) return err('roundId is required')

    const isAdmin = await verifyAdmin(request, env.DB)

    const { results: questions } = await env.DB.prepare(
      'SELECT id, round_id, text, question_order, image_url, created_at, updated_at FROM questions WHERE round_id = ? ORDER BY question_order ASC'
    )
      .bind(roundId)
      .all()

    if (questions.length === 0) {
      return json([])
    }

    const qIds = questions.map((q: any) => `'${q.id}'`).join(',')
    const { results: options } = await env.DB.prepare(
      `SELECT id, question_id, option_key, text, is_correct, created_at, updated_at FROM question_options WHERE question_id IN (${qIds}) ORDER BY option_key ASC`
    ).all()

    const optMap: Record<string, any[]> = {}
    for (const opt of options as any[]) {
      if (!optMap[opt.question_id]) optMap[opt.question_id] = []
      
      const cleanOpt = {
        id: opt.id,
        questionId: opt.question_id,
        optionKey: opt.option_key,
        text: opt.text,
        isCorrect: Boolean(opt.is_correct),
      }
      optMap[opt.question_id].push(cleanOpt)
    }

    const fullQuestions = questions.map((q: any) => ({
      id: q.id,
      roundId: q.round_id,
      text: q.text,
      order: q.question_order,
      imageUrl: q.image_url,
      options: optMap[q.id] || [],
    }))

    return json(fullQuestions)
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const isAdmin = await verifyAdmin(request, env.DB)
    if (!isAdmin) return err('Unauthorized', 401)

    const body: any = await request.json()
    const { roundId, drafts } = body // drafts is array of QuestionDraft
    if (!roundId || !Array.isArray(drafts)) return err('roundId and drafts array required')

    const now = new Date().toISOString()

    // Delete existing questions and options for this round
    await env.DB.prepare('DELETE FROM questions WHERE round_id = ?').bind(roundId).run()

    // Insert new questions and options
    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i]
      const qid = draft.id || `q_${Date.now()}_${i}`
      const order = i + 1

      await env.DB.prepare(
        'INSERT INTO questions (id, round_id, text, question_order, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(qid, roundId, draft.text, order, draft.imageUrl || null, now, now)
        .run()

      for (const opt of draft.options) {
        const optId = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        const isCorrect = opt.key === draft.correctKey ? 1 : 0
        await env.DB.prepare(
          'INSERT INTO question_options (id, question_id, option_key, text, is_correct, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(optId, qid, opt.key, opt.text, isCorrect, now, now)
          .run()
      }
    }

    return json({ success: true, count: drafts.length })
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}
