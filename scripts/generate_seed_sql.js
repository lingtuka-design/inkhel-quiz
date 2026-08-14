import fs from 'fs';
import { createHash } from 'crypto';

function sha256(str) {
  return createHash('sha256').update(str).digest('hex');
}

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? '1' : '0';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function startOfMonth(year, month0) {
  return new Date(Date.UTC(year, month0, 1)).toISOString();
}

function endOfMonth(year, month0) {
  return new Date(Date.UTC(year, month0 + 1, 0, 23, 59, 59, 999)).toISOString();
}

const nowIso = new Date().toISOString();

const seasons = [
  {
    id: 'season_1',
    name: 'Premier Season',
    description: 'Ten months of competitive rounds. One season, one champion.',
    season_number: 1,
    duration_months: 10,
    start_date: startOfMonth(2026, 7),
    end_date: endOfMonth(2027, 4),
    status: 'active',
    created_at: startOfMonth(2026, 6),
    updated_at: nowIso,
  },
  {
    id: 'season_2',
    name: 'Championship Season',
    description: 'A completed season. Legends were made here.',
    season_number: 2,
    duration_months: 10,
    start_date: startOfMonth(2025, 8),
    end_date: endOfMonth(2026, 5),
    status: 'completed',
    created_at: startOfMonth(2025, 7),
    updated_at: nowIso,
  },
];

const months = [];
function addMonths(seasonId, startYear, startMonth0, count) {
  for (let i = 0; i < count; i++) {
    const m0 = startMonth0 + i;
    const year = startYear + Math.floor(m0 / 12);
    const month = m0 % 12;
    const label = new Date(Date.UTC(year, month, 1)).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    months.push({
      id: `${seasonId}_m${i + 1}`,
      season_id: seasonId,
      month_number: i + 1,
      name: label,
      start_date: startOfMonth(year, month),
      end_date: endOfMonth(year, month),
      created_at: nowIso,
      updated_at: nowIso,
    });
  }
}
addMonths('season_1', 2026, 7, 10);
addMonths('season_2', 2025, 8, 10);

const roundSeeds = [
  {
    id: 'round_gk',
    month_id: 'season_1_m1',
    title: 'General Knowledge Challenge',
    description: 'Ten rapid-fire questions across history, science and geography. How fast is your brain?',
    gradient: 'aurora',
    icon: 'Brain',
    time_limit_seconds: 300,
    status: 'published',
    questions: [
      { text: 'What is the capital of France?', correct: 'Paris', wrong: ['London', 'Madrid', 'Rome'] },
      { text: 'Which planet is known as the Red Planet?', correct: 'Mars', wrong: ['Venus', 'Jupiter', 'Saturn'] },
      { text: 'How many continents are there on Earth?', correct: 'Seven', wrong: ['Five', 'Six', 'Eight'] },
      { text: 'What is the largest ocean on Earth?', correct: 'Pacific Ocean', wrong: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'] },
      { text: 'Who painted the Mona Lisa?', correct: 'Leonardo da Vinci', wrong: ['Pablo Picasso', 'Vincent van Gogh', 'Claude Monet'] },
      { text: 'What is the hardest natural substance on Earth?', correct: 'Diamond', wrong: ['Gold', 'Iron', 'Quartz'] },
      { text: 'Which country is home to the kangaroo?', correct: 'Australia', wrong: ['New Zealand', 'South Africa', 'Brazil'] },
      { text: 'What is the chemical symbol for gold?', correct: 'Au', wrong: ['Ag', 'Go', 'Gd'] },
      { text: 'How many bones are in the adult human body?', correct: '206', wrong: ['186', '226', '256'] },
      { text: 'What is the fastest land animal?', correct: 'Cheetah', wrong: ['Lion', 'Horse', 'Greyhound'] },
    ],
  },
  {
    id: 'round_football',
    month_id: 'season_1_m1',
    title: 'Football Fever',
    description: 'From World Cups to wonder goals — prove you know the beautiful game.',
    gradient: 'forest',
    icon: 'Trophy',
    time_limit_seconds: 180,
    status: 'published',
    questions: [
      { text: 'How many players does a team have on the pitch?', correct: '11', wrong: ['9', '10', '12'] },
      { text: 'Which country won the 2022 FIFA World Cup?', correct: 'Argentina', wrong: ['France', 'Brazil', 'Germany'] },
      { text: 'Which superstar is known as "CR7"?', correct: 'Cristiano Ronaldo', wrong: ['Lionel Messi', 'Neymar', 'Kylian Mbappé'] },
      { text: 'What is the top European club competition called?', correct: 'UEFA Champions League', wrong: ['Europa League', 'Premier League', 'FIFA Club Cup'] },
      { text: 'Which club plays its home games at Anfield?', correct: 'Liverpool', wrong: ['Manchester City', 'Chelsea', 'Arsenal'] },
      { text: 'Who is the only player allowed to handle the ball in open play?', correct: 'Goalkeeper', wrong: ['Defender', 'Captain', 'Striker'] },
      { text: 'Which nation won the first FIFA World Cup in 1930?', correct: 'Uruguay', wrong: ['Brazil', 'Italy', 'Argentina'] },
      { text: 'How long is a standard football match?', correct: '90 minutes', wrong: ['60 minutes', '75 minutes', '120 minutes'] },
      { text: 'What is the world governing body of football?', correct: 'FIFA', wrong: ['UEFA', 'IOC', 'FIA'] },
      { text: 'Which country won Euro 2024?', correct: 'Spain', wrong: ['England', 'France', 'Portugal'] },
    ],
  },
  {
    id: 'round_movies',
    month_id: 'season_1_m1',
    title: 'Movie Mania',
    description: 'Blockbusters, classics and cinematic trivia. Lights, camera, answer!',
    gradient: 'film',
    icon: 'Clapperboard',
    time_limit_seconds: 240,
    status: 'published',
    questions: [
      { text: 'Which movie features the line "May the Force be with you"?', correct: 'Star Wars', wrong: ['Star Trek', 'Avatar', 'Interstellar'] },
      { text: 'Who played Jack Dawson in Titanic?', correct: 'Leonardo DiCaprio', wrong: ['Brad Pitt', 'Tom Cruise', 'Johnny Depp'] },
      { text: 'Which animated film is about a rat who dreams of being a chef?', correct: 'Ratatouille', wrong: ['Finding Nemo', 'Coco', 'Toy Story'] },
      { text: 'Who directed Inception?', correct: 'Christopher Nolan', wrong: ['Steven Spielberg', 'James Cameron', 'Quentin Tarantino'] },
      { text: 'Which Marvel hero is played by Robert Downey Jr.?', correct: 'Iron Man', wrong: ['Thor', 'Captain America', 'Hulk'] },
      { text: 'Which film won Best Picture at the 2020 Oscars?', correct: 'Parasite', wrong: ['1917', 'Joker', 'Once Upon a Time in Hollywood'] },
      { text: 'In which fictional city does Batman operate?', correct: 'Gotham City', wrong: ['Metropolis', 'Star City', 'Central City'] },
      { text: 'What is the highest-grossing film of all time (unadjusted)?', correct: 'Avatar', wrong: ['Titanic', 'Avengers: Endgame', 'Jurassic Park'] },
      { text: 'Which studio produced Toy Story?', correct: 'Pixar', wrong: ['DreamWorks', 'Illumination', 'Blue Sky'] },
      { text: 'Who played Iron Man in the MCU?', correct: 'Robert Downey Jr.', wrong: ['Chris Evans', 'Mark Ruffalo', 'Chris Hemsworth'] },
    ],
  },
  {
    id: 'round_mizoram',
    month_id: 'season_1_m1',
    title: 'Mizoram Heritage',
    description: 'History, culture and the land of the highlanders. A tribute to Mizoram.',
    gradient: 'heritage',
    icon: 'Landmark',
    time_limit_seconds: 300,
    status: 'draft',
    questions: [
      { text: 'What is the capital of Mizoram?', correct: 'Aizawl', wrong: ['Lunglei', 'Champhai', 'Serchhip'] },
      { text: 'What is the primary language spoken in Mizoram?', correct: 'Mizo', wrong: ['Assamese', 'Bengali', 'Khasi'] },
      { text: 'Which is the most celebrated spring festival of Mizoram?', correct: 'Chapchar Kut', wrong: ['Bihu', 'Hornbill', 'Losoong'] },
      { text: 'What is the highest peak in Mizoram?', correct: 'Phawngpui', wrong: ['Hmuifang', 'Lunglenkawm', 'Reiek'] },
      { text: 'Which river flows through Aizawl?', correct: 'Tlawng', wrong: ['Brahmaputra', 'Chhimtuipui', 'Khoupum'] },
      { text: 'What does the name "Mizoram" literally mean?', correct: 'Land of the Mizos', wrong: ['Land of the Hills', 'Land of Rivers', 'Land of the Brave'] },
      { text: 'The traditional Cheraw dance is associated with which community?', correct: 'The Mizo community', wrong: ['The Nagas', 'The Khasis', 'The Garos'] },
      { text: 'In which year did Mizoram become a full state of India?', correct: '1987', wrong: ['1972', '1980', '1990'] },
      { text: 'Which is the largest lake in Mizoram?', correct: 'Palak Lake', wrong: ['Tam Dil', 'Rih Dil', 'Paltan Lake'] },
      { text: 'What is the traditional Mizo drum called?', correct: 'Khuang', wrong: ['Dhol', 'Chende', 'Mridangam'] },
    ],
  },
  {
    id: 'round_opening',
    month_id: 'season_2_m1',
    title: 'Opening Night Special',
    description: 'The first round of Season 2. Closed when September ended.',
    gradient: 'ocean',
    icon: 'Rocket',
    time_limit_seconds: 300,
    status: 'published',
    questions: [
      { text: 'Which planet is known as the Blue Planet?', correct: 'Earth', wrong: ['Mars', 'Venus', 'Neptune'] },
      { text: 'What is the currency of Japan?', correct: 'Yen', wrong: ['Won', 'Yuan', 'Ringgit'] },
      { text: 'Which element has the symbol O?', correct: 'Oxygen', wrong: ['Osmium', 'Oganesson', 'Gold'] },
      { text: 'Who wrote "Pride and Prejudice"?', correct: 'Jane Austen', wrong: ['Emily Brontë', 'Charles Dickens', 'Mark Twain'] },
      { text: 'What is the smallest prime number?', correct: '2', wrong: ['1', '3', '0'] },
      { text: 'How many legs does a spider have?', correct: 'Eight', wrong: ['Six', 'Ten', 'Twelve'] },
    ],
  },
  {
    id: 'round_finale',
    month_id: 'season_2_m2',
    title: 'Grand Finale Special',
    description: 'The Season 2 finale. Archived to history when October ended.',
    gradient: 'gold',
    icon: 'Crown',
    time_limit_seconds: 300,
    status: 'published',
    questions: [
      { text: 'Which planet has the most moons?', correct: 'Saturn', wrong: ['Earth', 'Mars', 'Mercury'] },
      { text: 'What is the tallest mountain in the world?', correct: 'Mount Everest', wrong: ['K2', 'Kangchenjunga', 'Kilimanjaro'] },
      { text: 'Which gas do plants absorb?', correct: 'Carbon dioxide', wrong: ['Oxygen', 'Nitrogen', 'Hydrogen'] },
      { text: 'Who developed the theory of relativity?', correct: 'Albert Einstein', wrong: ['Isaac Newton', 'Niels Bohr', 'Galileo'] },
      { text: 'What is the fastest aquatic animal?', correct: 'Sailfish', wrong: ['Dolphin', 'Shark', 'Tuna'] },
    ],
  },
];

const rounds = [];
const questions = [];
const options = [];

let qCounter = 1;
let optCounter = 1;

for (const rs of roundSeeds) {
  rounds.push({
    id: rs.id,
    month_id: rs.month_id,
    title: rs.title,
    slug: rs.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: rs.description,
    banner_gradient: rs.gradient,
    banner_icon: rs.icon,
    banner_url: null,
    time_limit_seconds: rs.time_limit_seconds,
    status: rs.status,
    published_at: rs.status === 'published' ? nowIso : null,
    created_at: nowIso,
    updated_at: nowIso,
  });

  rs.questions.forEach((qs, qi) => {
    const qid = `q_${qCounter++}`;
    questions.push({
      id: qid,
      round_id: rs.id,
      text: qs.text,
      question_order: qi + 1,
      image_url: null,
      created_at: nowIso,
      updated_at: nowIso,
    });

    const keys = ['A', 'B', 'C', 'D'];
    const correctIndex = qi % 4;
    const optionTexts = keys.map((_, i) =>
      i === correctIndex ? qs.correct : qs.wrong[((i - correctIndex + 3) % 4 + 3) % 4]
    );

    keys.forEach((key, i) => {
      options.push({
        id: `opt_${optCounter++}`,
        question_id: qid,
        option_key: key,
        text: optionTexts[i],
        is_correct: key === keys[correctIndex] ? 1 : 0,
        created_at: nowIso,
        updated_at: nowIso,
      });
    });
  });
}

const participantNames = [
  'Alex Hunter', 'Maya Chen', 'Rohan Mehta', 'Sarah Kim',
  'Diego Ramos', 'Amina Yusuf', 'Luca Moretti', 'Priya Sharma',
];
const participants = participantNames.map((name, i) => ({
  id: `part_${i + 1}`,
  display_name: name,
  email: null,
  avatar_gradient: `avatar_${i + 1}`,
  provider: 'guest',
  created_at: nowIso,
  updated_at: nowIso,
}));

const adminPasswordHash = sha256('admin123');
const admins = [
  {
    id: 'admin_1',
    username: 'admin',
    password_hash: adminPasswordHash,
    session_token: null,
    created_at: nowIso,
  },
];

let sql = '-- Seed Data for Cloudflare D1\n\n';

for (const s of seasons) {
  sql += `INSERT OR IGNORE INTO seasons (id, name, description, season_number, duration_months, start_date, end_date, status, created_at, updated_at) VALUES (${esc(s.id)}, ${esc(s.name)}, ${esc(s.description)}, ${s.season_number}, ${s.duration_months}, ${esc(s.start_date)}, ${esc(s.end_date)}, ${esc(s.status)}, ${esc(s.created_at)}, ${esc(s.updated_at)});\n`;
}

for (const m of months) {
  sql += `INSERT OR IGNORE INTO months (id, season_id, month_number, name, start_date, end_date, created_at, updated_at) VALUES (${esc(m.id)}, ${esc(m.season_id)}, ${m.month_number}, ${esc(m.name)}, ${esc(m.start_date)}, ${esc(m.end_date)}, ${esc(m.created_at)}, ${esc(m.updated_at)});\n`;
}

for (const r of rounds) {
  sql += `INSERT OR IGNORE INTO rounds (id, month_id, title, slug, description, banner_gradient, banner_icon, banner_url, time_limit_seconds, status, published_at, created_at, updated_at) VALUES (${esc(r.id)}, ${esc(r.month_id)}, ${esc(r.title)}, ${esc(r.slug)}, ${esc(r.description)}, ${esc(r.banner_gradient)}, ${esc(r.banner_icon)}, ${esc(r.banner_url)}, ${r.time_limit_seconds}, ${esc(r.status)}, ${esc(r.published_at)}, ${esc(r.created_at)}, ${esc(r.updated_at)});\n`;
}

for (const q of questions) {
  sql += `INSERT OR IGNORE INTO questions (id, round_id, text, question_order, image_url, created_at, updated_at) VALUES (${esc(q.id)}, ${esc(q.round_id)}, ${esc(q.text)}, ${q.question_order}, ${esc(q.image_url)}, ${esc(q.created_at)}, ${esc(q.updated_at)});\n`;
}

for (const o of options) {
  sql += `INSERT OR IGNORE INTO question_options (id, question_id, option_key, text, is_correct, created_at, updated_at) VALUES (${esc(o.id)}, ${esc(o.question_id)}, ${esc(o.option_key)}, ${esc(o.text)}, ${o.is_correct}, ${esc(o.created_at)}, ${esc(o.updated_at)});\n`;
}

for (const p of participants) {
  sql += `INSERT OR IGNORE INTO participants (id, display_name, email, avatar_gradient, provider, created_at, updated_at) VALUES (${esc(p.id)}, ${esc(p.display_name)}, ${esc(p.email)}, ${esc(p.avatar_gradient)}, ${esc(p.provider)}, ${esc(p.created_at)}, ${esc(p.updated_at)});\n`;
}

for (const a of admins) {
  sql += `INSERT OR IGNORE INTO admin_users (id, username, password_hash, session_token, created_at) VALUES (${esc(a.id)}, ${esc(a.username)}, ${esc(a.password_hash)}, ${esc(a.session_token)}, ${esc(a.created_at)});\n`;
}

fs.writeFileSync('migrations/0002_seed.sql', sql);
console.log('Seed SQL generated successfully!');
