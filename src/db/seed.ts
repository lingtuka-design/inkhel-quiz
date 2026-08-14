import type {
  AdminUser,
  Attempt,
  AttemptAnswer,
  Month,
  OptionKey,
  Participant,
  Question,
  QuestionOption,
  Round,
  Season,
} from '../types'
import { nowIso } from '../lib/utils'
import { uid, hashPassword } from '../lib/crypto'
import { calculateScore } from '../services/scoring'

const DAY = 86_400_000

function iso(d: Date): string {
  return d.toISOString()
}

function startOfMonth(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0, 1))
}

function endOfMonth(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0 + 1, 0, 23, 59, 59, 999))
}

interface QuestionSpec {
  text: string
  correct: string
  wrong: [string, string, string]
}

interface RoundSeed {
  id: string
  monthId: string
  title: string
  description: string
  gradient: string
  icon: string
  timeLimitSeconds: number
  status: 'published' | 'draft' | 'archived'
  questions: QuestionSpec[]
}

function buildQuestion(
  roundId: string,
  qIndex: number,
  spec: QuestionSpec,
  questionId: string,
): { question: Question; options: QuestionOption[] } {
  const keys: OptionKey[] = ['A', 'B', 'C', 'D']
  const correctIndex = qIndex % 4
  const optionTexts = keys.map((_, i) =>
    i === correctIndex
      ? spec.correct
      : spec.wrong[((i - correctIndex + 3) % 4 + 3) % 4]!,
  )
  const options: QuestionOption[] = keys.map((key, i) => ({
    id: uid('opt'),
    questionId,
    optionKey: key,
    text: optionTexts[i]!,
    isCorrect: key === keys[correctIndex],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }))
  return {
    question: {
      id: questionId,
      roundId,
      text: spec.text,
      order: qIndex + 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    options,
  }
}

export async function buildSeed(): Promise<{
  seasons: Season[]
  months: Month[]
  rounds: Round[]
  questions: Question[]
  options: QuestionOption[]
  participants: Participant[]
  attempts: Attempt[]
  answers: AttemptAnswer[]
  admins: AdminUser[]
}> {
  const now = Date.now()

  // ---------- Seasons + Months ----------
  const seasons: Season[] = [
    {
      id: 'season_1',
      name: 'Premier Season',
      description: 'Ten months of competitive rounds. One season, one champion.',
      seasonNumber: 1,
      durationMonths: 10,
      startDate: iso(startOfMonth(2026, 7)),
      endDate: iso(endOfMonth(2027, 4)),
      status: 'active',
      createdAt: iso(startOfMonth(2026, 6)),
      updatedAt: nowIso(),
    },
    {
      id: 'season_2',
      name: 'Championship Season',
      description: 'A completed season. Legends were made here.',
      seasonNumber: 2,
      durationMonths: 10,
      startDate: iso(startOfMonth(2025, 8)),
      endDate: iso(endOfMonth(2026, 5)),
      status: 'completed',
      createdAt: iso(startOfMonth(2025, 7)),
      updatedAt: nowIso(),
    },
  ]

  const months: Month[] = []
  const addMonths = (seasonId: string, startYear: number, startMonth0: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const m0 = startMonth0 + i
      const year = startYear + Math.floor(m0 / 12)
      const month = m0 % 12
      const label = new Date(Date.UTC(year, month, 1)).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
      months.push({
        id: `${seasonId}_m${i + 1}`,
        seasonId,
        monthNumber: i + 1,
        name: label,
        startDate: iso(startOfMonth(year, month)),
        endDate: iso(endOfMonth(year, month)),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      })
    }
  }
  addMonths('season_1', 2026, 7, 10) // Aug 2026 – May 2027
  addMonths('season_2', 2025, 8, 10) // Sep 2025 – Jun 2026
  const aug26 = months.find((m) => m.id === 'season_1_m1')!
  const sep25 = months.find((m) => m.id === 'season_2_m1')!
  const oct25 = months.find((m) => m.id === 'season_2_m2')!

  // ---------- Rounds ----------
  const roundSeeds: RoundSeed[] = [
    {
      id: 'round_gk',
      monthId: aug26.id,
      title: 'General Knowledge Challenge',
      description: 'Ten rapid-fire questions across history, science and geography. How fast is your brain?',
      gradient: 'aurora',
      icon: 'Brain',
      timeLimitSeconds: 300,
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
      monthId: aug26.id,
      title: 'Football Fever',
      description: 'From World Cups to wonder goals — prove you know the beautiful game.',
      gradient: 'forest',
      icon: 'Trophy',
      timeLimitSeconds: 180,
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
      monthId: aug26.id,
      title: 'Movie Mania',
      description: 'Blockbusters, classics and cinematic trivia. Lights, camera, answer!',
      gradient: 'film',
      icon: 'Clapperboard',
      timeLimitSeconds: 240,
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
      monthId: aug26.id,
      title: 'Mizoram Heritage',
      description: 'History, culture and the land of the highlanders. A tribute to Mizoram.',
      gradient: 'heritage',
      icon: 'Landmark',
      timeLimitSeconds: 300,
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
      monthId: sep25.id,
      title: 'Opening Night Special',
      description: 'The first round of Season 2. Closed when September ended.',
      gradient: 'ocean',
      icon: 'Rocket',
      timeLimitSeconds: 300,
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
      monthId: oct25.id,
      title: 'Grand Finale Special',
      description: 'The Season 2 finale. Archived to history when October ended.',
      gradient: 'gold',
      icon: 'Crown',
      timeLimitSeconds: 300,
      status: 'published',
      questions: [
        { text: 'Which planet has the most moons?', correct: 'Saturn', wrong: ['Earth', 'Mars', 'Mercury'] },
        { text: 'What is the tallest mountain in the world?', correct: 'Mount Everest', wrong: ['K2', 'Kangchenjunga', 'Kilimanjaro'] },
        { text: 'Which gas do plants absorb?', correct: 'Carbon dioxide', wrong: ['Oxygen', 'Nitrogen', 'Hydrogen'] },
        { text: 'Who developed the theory of relativity?', correct: 'Albert Einstein', wrong: ['Isaac Newton', 'Niels Bohr', 'Galileo'] },
        { text: 'What is the fastest aquatic animal?', correct: 'Sailfish', wrong: ['Dolphin', 'Shark', 'Tuna'] },
      ],
    },
  ]

  const rounds: Round[] = []
  const questions: Question[] = []
  const options: QuestionOption[] = []

  for (const rs of roundSeeds) {
    rounds.push({
      id: rs.id,
      monthId: rs.monthId,
      title: rs.title,
      slug: rs.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: rs.description,
      bannerGradient: rs.gradient,
      bannerIcon: rs.icon,
      bannerUrl: null,
      timeLimitSeconds: rs.timeLimitSeconds,
      status: rs.status,
      publishedAt: rs.status === 'published' ? nowIso() : null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })
    rs.questions.forEach((qs, qi) => {
      const qid = uid('q')
      const built = buildQuestion(rs.id, qi, qs, qid)
      questions.push(built.question)
      options.push(...built.options)
    })
  }

  // ---------- Participants ----------
  const participantNames = [
    'Alex Hunter', 'Maya Chen', 'Rohan Mehta', 'Sarah Kim',
    'Diego Ramos', 'Amina Yusuf', 'Luca Moretti', 'Priya Sharma',
  ]
  const participants: Participant[] = participantNames.map((name, i) => ({
    id: `part_${i + 1}`,
    displayName: name,
    email: null,
    avatarGradient: `avatar_${i + 1}`,
    provider: 'guest',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }))

  // ---------- Attempts ----------
  const attempts: Attempt[] = []
  const answers: AttemptAnswer[] = []

  const monthStartByRound: Record<string, number> = {
    round_gk: startOfMonth(2026, 7).getTime(),
    round_football: startOfMonth(2026, 7).getTime(),
    round_movies: startOfMonth(2026, 7).getTime(),
    round_opening: startOfMonth(2025, 8).getTime(),
    round_finale: startOfMonth(2025, 9).getTime(),
  }

  interface AttemptSpec {
    participant: number
    round: string
    correct: number
    seconds: number
    expired?: boolean
    dayOffsetHours?: number
  }

  const attemptSpecs: AttemptSpec[] = [
    // August 2026 — Season 1, current month
    { participant: 0, round: 'round_gk', correct: 9, seconds: 150 },
    { participant: 1, round: 'round_gk', correct: 8, seconds: 175 },
    { participant: 2, round: 'round_gk', correct: 8, seconds: 192 },
    { participant: 3, round: 'round_gk', correct: 7, seconds: 180 },
    { participant: 4, round: 'round_gk', correct: 6, seconds: 160 },
    { participant: 5, round: 'round_gk', correct: 5, seconds: 220 },
    { participant: 6, round: 'round_gk', correct: 4, seconds: 245 },
    { participant: 7, round: 'round_gk', correct: 3, seconds: 200 },
    { participant: 0, round: 'round_football', correct: 9, seconds: 90 },
    { participant: 2, round: 'round_football', correct: 8, seconds: 105 },
    { participant: 3, round: 'round_football', correct: 8, seconds: 118 },
    { participant: 1, round: 'round_football', correct: 7, seconds: 100 },
    { participant: 4, round: 'round_football', correct: 6, seconds: 130 },
    { participant: 5, round: 'round_football', correct: 4, seconds: 150 },
    { participant: 7, round: 'round_football', correct: 3, seconds: 90 },
    { participant: 1, round: 'round_movies', correct: 8, seconds: 120 },
    { participant: 0, round: 'round_movies', correct: 7, seconds: 150 },
    { participant: 3, round: 'round_movies', correct: 6, seconds: 165 },
    { participant: 2, round: 'round_movies', correct: 5, seconds: 110 },
    { participant: 4, round: 'round_movies', correct: 4, seconds: 190 },
    { participant: 6, round: 'round_movies', correct: 2, seconds: 210, expired: true },
    // Season 2 — historical, closed months
    { participant: 0, round: 'round_opening', correct: 5, seconds: 140, dayOffsetHours: 30 },
    { participant: 1, round: 'round_opening', correct: 4, seconds: 160, dayOffsetHours: 60 },
    { participant: 2, round: 'round_opening', correct: 3, seconds: 180, dayOffsetHours: 90 },
    { participant: 0, round: 'round_finale', correct: 5, seconds: 120, dayOffsetHours: 200 },
    { participant: 1, round: 'round_finale', correct: 4, seconds: 140, dayOffsetHours: 220 },
    { participant: 2, round: 'round_finale', correct: 3, seconds: 160, dayOffsetHours: 240 },
  ]

  attemptSpecs.forEach((spec, ai) => {
    const round = rounds.find((r) => r.id === spec.round)!
    const roundQuestions = questions
      .filter((q) => q.roundId === round.id)
      .sort((a, b) => a.order - b.order)
    const base = monthStartByRound[round.id]!
    const start = new Date(base + (spec.dayOffsetHours ?? ai * 5) * 3_600_000)
    const completed = spec.expired
      ? new Date(start.getTime() + round.timeLimitSeconds * 1000)
      : new Date(start.getTime() + spec.seconds * 1000)
    const score = calculateScore({
      totalQuestions: roundQuestions.length,
      correctAnswers: spec.correct,
      unansweredQuestions: spec.expired ? roundQuestions.length - spec.correct : 0,
      timeLimitSeconds: round.timeLimitSeconds,
      timeTakenSeconds: spec.expired ? round.timeLimitSeconds : spec.seconds,
      status: spec.expired ? 'expired' : 'completed',
    })
    const attemptId = uid('att')
    attempts.push({
      id: attemptId,
      participantId: participants[spec.participant]!.id,
      roundId: round.id,
      startedAt: start.toISOString(),
      completedAt: completed.toISOString(),
      status: spec.expired ? 'expired' : 'completed',
      timeTakenSeconds: spec.expired ? round.timeLimitSeconds : spec.seconds,
      correctAnswers: spec.correct,
      incorrectAnswers: spec.expired ? 0 : roundQuestions.length - spec.correct,
      unansweredQuestions: spec.expired ? roundQuestions.length - spec.correct : 0,
      baseScore: score.baseScore,
      speedBonus: score.speedBonus,
      finalScore: score.finalScore,
      isTestAttempt: false,
      createdAt: start.toISOString(),
    })
    roundQuestions.forEach((q, qi) => {
      const answered = !spec.expired || qi < spec.correct
      if (!answered) return
      const correctOption = options.find((o) => o.questionId === q.id && o.isCorrect)!
      const wrongOptions = options.filter((o) => o.questionId === q.id && !o.isCorrect)
      const pickedCorrect = qi < spec.correct
      const selectedKey = pickedCorrect
        ? correctOption.optionKey
        : wrongOptions[qi % 3]!.optionKey
      answers.push({
        id: uid('ans'),
        attemptId,
        questionId: q.id,
        selectedOptionKey: selectedKey,
        isCorrect: pickedCorrect,
        answeredAt: new Date(
          start.getTime() + (spec.seconds / roundQuestions.length) * (qi + 1) * 1000,
        ).toISOString(),
        elapsedSeconds: Math.round((spec.seconds / roundQuestions.length) * (qi + 1)),
      })
    })
  })

  const admins: AdminUser[] = [
    {
      id: 'admin_1',
      username: 'admin',
      passwordHash: await hashPassword('admin123'),
      sessionToken: null,
      createdAt: nowIso(),
    },
  ]

  return { seasons, months, rounds, questions, options, participants, attempts, answers, admins }
}
