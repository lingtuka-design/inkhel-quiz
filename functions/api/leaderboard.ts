import { Env, json, err, handleOptions, toCamelCase } from './_db'

export const onRequestOptions: PagesFunction = async () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url)
    const type = url.searchParams.get('type') || 'overall'
    const roundId = url.searchParams.get('roundId')
    const monthId = url.searchParams.get('monthId')
    const seasonId = url.searchParams.get('seasonId')

    if (type === 'round') {
      if (!roundId) return err('roundId is required')

      const { results: attempts } = await env.DB.prepare(
        `SELECT a.*, p.id as p_id, p.display_name as p_name, p.email as p_email, p.phone_number as p_phone, p.photo_url as p_photo, p.avatar_gradient as p_avatar, p.provider as p_provider
         FROM attempts a
         JOIN participants p ON a.participant_id = p.id
         WHERE a.round_id = ? AND a.status = 'completed' AND a.is_test_attempt = 0
         ORDER BY a.final_score DESC, a.correct_answers DESC, a.time_taken_seconds ASC, a.completed_at ASC`
      )
        .bind(roundId)
        .all<any>()

      // total questions in round
      const qCount = await env.DB.prepare('SELECT COUNT(*) as count FROM questions WHERE round_id = ?')
        .bind(roundId)
        .first<{ count: number }>()
      const totalQuestions = qCount?.count || 0

      const rows = attempts.map((a, i) => ({
        rank: i + 1,
        participant: {
          id: a.p_id,
          displayName: a.p_name,
          email: a.p_email,
          phoneNumber: a.p_phone || null,
          photoUrl: a.p_photo || null,
          avatarGradient: a.p_avatar,
          provider: a.p_provider,
        },
        correctAnswers: a.correct_answers,
        totalQuestions,
        timeTakenSeconds: a.time_taken_seconds || 0,
        score: a.final_score,
        completedAt: a.completed_at,
        attemptId: a.id,
        isCurrentUser: false,
      }))

      return json(rows)
    }

    if (type === 'month') {
      if (!monthId) return err('monthId is required')

      const { results: rows } = await env.DB.prepare(
        `SELECT 
            p.id as p_id, p.display_name as p_name, p.email as p_email, p.phone_number as p_phone, p.photo_url as p_photo, p.avatar_gradient as p_avatar, p.provider as p_provider,
            COUNT(DISTINCT a.id) as rounds_played,
            SUM(a.final_score) as total_points,
            SUM(a.correct_answers) as total_correct,
            AVG(a.time_taken_seconds) as avg_time,
            MAX(a.final_score) as best_score,
            MIN(a.final_score) as worst_score
         FROM attempts a
         JOIN rounds r ON a.round_id = r.id
         JOIN participants p ON a.participant_id = p.id
         WHERE r.month_id = ? AND a.status = 'completed' AND a.is_test_attempt = 0
         GROUP BY p.id
         ORDER BY total_points DESC, total_correct DESC, avg_time ASC`
      )
        .bind(monthId)
        .all<any>()

      const ranked = rows.map((r, i) => ({
        rank: i + 1,
        participant: {
          id: r.p_id,
          displayName: r.p_name,
          email: r.p_email,
          phoneNumber: r.p_phone || null,
          photoUrl: r.p_photo || null,
          avatarGradient: r.p_avatar,
          provider: r.p_provider,
        },
        rounds: r.rounds_played,
        points: r.total_points || 0,
        totalCorrect: r.total_correct || 0,
        avgTimeSeconds: Math.round(r.avg_time || 0),
        bestScore: r.best_score || 0,
        worstScore: r.worst_score || 0,
        isCurrentUser: false,
      }))

      return json(ranked)
    }

    if (type === 'season') {
      if (!seasonId) return err('seasonId is required')

      const { results: rows } = await env.DB.prepare(
        `SELECT 
            p.id as p_id, p.display_name as p_name, p.email as p_email, p.phone_number as p_phone, p.photo_url as p_photo, p.avatar_gradient as p_avatar, p.provider as p_provider,
            COUNT(DISTINCT a.id) as rounds_played,
            SUM(a.final_score) as total_points,
            SUM(a.correct_answers) as total_correct,
            AVG(a.time_taken_seconds) as avg_time,
            MAX(a.final_score) as best_score,
            MIN(a.final_score) as worst_score
         FROM attempts a
         JOIN rounds r ON a.round_id = r.id
         JOIN months m ON r.month_id = m.id
         JOIN participants p ON a.participant_id = p.id
         WHERE m.season_id = ? AND a.status = 'completed' AND a.is_test_attempt = 0
         GROUP BY p.id
         ORDER BY total_points DESC, total_correct DESC, avg_time ASC`
      )
        .bind(seasonId)
        .all<any>()

      const ranked = rows.map((r, i) => ({
        rank: i + 1,
        participant: {
          id: r.p_id,
          displayName: r.p_name,
          email: r.p_email,
          phoneNumber: r.p_phone || null,
          photoUrl: r.p_photo || null,
          avatarGradient: r.p_avatar,
          provider: r.p_provider,
        },
        rounds: r.rounds_played,
        points: r.total_points || 0,
        totalCorrect: r.total_correct || 0,
        avgTimeSeconds: Math.round(r.avg_time || 0),
        bestScore: r.best_score || 0,
        worstScore: r.worst_score || 0,
        isCurrentUser: false,
      }))

      return json(ranked)
    }

    // Overall ranking
    const { results: rows } = await env.DB.prepare(
      `SELECT 
          p.id as p_id, p.display_name as p_name, p.email as p_email, p.phone_number as p_phone, p.photo_url as p_photo, p.avatar_gradient as p_avatar, p.provider as p_provider,
          COUNT(DISTINCT a.id) as rounds_played,
          SUM(a.final_score) as total_points,
          SUM(a.correct_answers) as total_correct,
          AVG(a.time_taken_seconds) as avg_time,
          MAX(a.final_score) as best_score,
          MIN(a.final_score) as worst_score
       FROM attempts a
       JOIN participants p ON a.participant_id = p.id
       WHERE a.status = 'completed' AND a.is_test_attempt = 0
       GROUP BY p.id
       ORDER BY total_points DESC, total_correct DESC, avg_time ASC`
    ).all<any>()

    const ranked = rows.map((r, i) => ({
      rank: i + 1,
      participant: {
        id: r.p_id,
        displayName: r.p_name,
        email: r.p_email,
        phoneNumber: r.p_phone || null,
        photoUrl: r.p_photo || null,
        avatarGradient: r.p_avatar,
        provider: r.p_provider,
      },
      rounds: r.rounds_played,
      points: r.total_points || 0,
      totalCorrect: r.total_correct || 0,
      avgTimeSeconds: Math.round(r.avg_time || 0),
      bestScore: r.best_score || 0,
      worstScore: r.worst_score || 0,
      isCurrentUser: false,
    }))

    return json(ranked)
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}
