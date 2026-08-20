INSERT INTO polls (id, question, description, options, category, status, featured, total_votes, created_at, updated_at)
VALUES (
  'poll_pl_champion_2026',
  'Kumin Premier League Champion tur tunge ni a i hriat?',
  'Mizo football fans-te ngaihdan vote thlak rawh le.',
  '[{"id":"opt_1","text":"Arsenal"},{"id":"opt_2","text":"Manchester City"},{"id":"opt_3","text":"Liverpool"},{"id":"opt_4","text":"Manchester United"},{"id":"opt_5","text":"Chelsea"}]',
  'football',
  'active',
  1,
  0,
  datetime('now'),
  datetime('now')
)
ON CONFLICT(id) DO NOTHING;
