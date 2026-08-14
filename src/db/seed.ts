import type {
  AdminUser,
  Attempt,
  AttemptAnswer,
  Episode,
  OptionKey,
  Participant,
  Question,
  QuestionOption,
  Season,
} from '../types'
import { nowIso } from '../lib/utils'
import { uid, hashPassword } from '../lib/crypto'
import { calculateScore } from '../services/scoring'

const DAY = 86_400_000

function iso(d: Date): string {
  return d.toISOString()
}

interface QuestionSpec {
  text: string
  correct: string
  wrong: [string, string, string]
}

interface AttemptSpec {
  participant: number
  episode: string
  correct: number
  seconds: number
  expired?: boolean
}

interface EpisodeSeed {
  id: string
  seasonId: string
  title: string
  description: string
  gradient: string
  icon: string
  timeLimitSeconds: number
  status: 'published' | 'draft' | 'archived'
  publishedOffsetDays: number
  questions: QuestionSpec[]
}

function buildQuestion(
  episodeId: string,
  qIndex: number,
  spec: QuestionSpec,
  questionId: string,
): { question: Question; options: QuestionOption[] } {
  const keys: OptionKey[] = ['A', 'B', 'C', 'D']
  const wrongShuffled = spec.wrong
  const correctIndex = qIndex % 4
  const optionTexts = keys.map((_, i) =>
    i === correctIndex ? spec.correct : wrongShuffled[((i - correctIndex + 3) % 4 + 3) % 4]!,
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
      episodeId,
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
  episodes: Episode[]
  questions: Question[]
  options: QuestionOption[]
  participants: Participant[]
  attempts: Attempt[]
  answers: AttemptAnswer[]
  admins: AdminUser[]
}> {
  const now = Date.now()
  const S1 = { start: now - 14 * DAY, months: 3 }
  const S1_END = S1.start + S1.months * 30 * DAY
  const S2_START = now - 9 * 30 * DAY
  const S2_END = S2_START + 3 * 30 * DAY

  const seasons: Season[] = [
    {
      id: 'season_1',
      name: 'Premier Season',
      description: 'The inaugural season of Inkhel. Four episodes, one champion.',
      seasonNumber: 1,
      durationMonths: 3,
      startDate: iso(new Date(S1.start)),
      endDate: iso(new Date(S1_END)),
      status: 'active',
      createdAt: iso(new Date(S1.start - 2 * DAY)),
      updatedAt: nowIso(),
    },
    {
      id: 'season_2',
      name: 'Championship Season',
      description: 'A completed season. Legends were made here.',
      seasonNumber: 2,
      durationMonths: 3,
      startDate: iso(new Date(S2_START)),
      endDate: iso(new Date(S2_END)),
      status: 'completed',
      createdAt: iso(new Date(S2_START - 2 * DAY)),
      updatedAt: nowIso(),
    },
  ]

  const episodeSeeds: EpisodeSeed[] = [
    {
      id: 'ep_gk',
      seasonId: 'season_1',
      title: 'General Knowledge Challenge',
      description: 'Ten rapid-fire questions across history, science and geography. How fast is your brain?',
      gradient: 'aurora',
      icon: 'Brain',
      timeLimitSeconds: 300,
      status: 'published',
      publishedOffsetDays: 12,
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
      id: 'ep_football',
      seasonId: 'season_1',
      title: 'Football Fever',
      description: 'From World Cups to wonder goals — prove you know the beautiful game.',
      gradient: 'forest',
      icon: 'Trophy',
      timeLimitSeconds: 180,
      status: 'published',
      publishedOffsetDays: 8,
      questions: [
        { text: 'How many players does a team have on the pitch?', correct: '11', wrong: ['9', '10', '12'] },
        { text: 'Which country won the 2022 FIFA World Cup?', correct: 'Argentina', wrong: ['France', 'Brazil', 'Germany'] },
        { text: 'Which superstar is known as "CR7"?', correct: 'Cristiano Ronaldo', wrong: ['Lionel Messi', 'Neymar', 'Kylian Mbappé'] },
        { text: 'What is the top European club competition called?', correct: 'UEFA Champions League', wrong: ['Europa League', 'Premier League', 'FIFA Club Cup'] },
        { text: 'Which club plays its home games at Anfield?', correct: 'Liverpool', wrong: ['Manchester City', 'Chelsea', 'Arsenal'] },
        { text: 'Who is the only outfield player allowed to handle the ball?', correct: 'Goalkeeper', wrong: ['Defender', 'Captain', 'Striker'] },
        { text: 'Which nation won the first FIFA World Cup in 1930?', correct: 'Uruguay', wrong: ['Brazil', 'Italy', 'Argentina'] },
        { text: 'How long is a standard football match?', correct: '90 minutes', wrong: ['60 minutes', '75 minutes', '120 minutes'] },
        { text: 'What is the world governing body of football?', correct: 'FIFA', wrong: ['UEFA', 'IOC', 'FIA'] },
        { text: 'Which country won Euro 2024?', correct: 'Spain', wrong: ['England', 'France', 'Portugal'] },
      ],
    },
    {
      id: 'ep_movies',
      seasonId: 'season_1',
      title: 'Movie Mania',
      description: 'Blockbusters, classics and cinematic trivia. Lights, camera, answer!',
      gradient: 'film',
      icon: 'Clapperboard',
      timeLimitSeconds: 240,
      status: 'published',
      publishedOffsetDays: 4,
      questions: [
        { text: 'Which movie features the line "May the Force be with you"?', correct: 'Star Wars', wrong: ['Star Trek', 'Avatar', 'Interstellar'] },
        { text: 'Who played Jack Dawson in Titanic?', correct: 'Leonardo DiCaprio', wrong: ['Brad Pitt', 'Tom Cruise', 'Johnny Depp'] },
        { text: 'Which animated film is about a rat who dreams of being a chef?', correct: 'Ratatouille', wrong: ['Finding Nemo', 'Coco', 'Toy Story'] },
        { text: 'Who directed Inception?', correct: 'Christopher Nolan', wrong: ['Steven Spielberg', 'James Cameron', 'Quentin Tarantino'] },
        { text: 'Which Marvel hero is played by Robert Downey Jr.?', correct: 'Iron Man', wrong: ['Thor', 'Captain America', 'Hulk'] },
        { text: 'Which film won Best Picture at the 2020 Oscars?', correct: 'Parasite', wrong: ['1917', 'Joker', 'Once Upon a Time in Hollywood'] },
        { text: 'In which fictional city does Batman operate?', correct: 'Gotham City', wrong: ['Metropolis', 'Star City', 'Central City'] },
        { text: 'What is the highest-grossing film of all time (unadjusted)?', correct: 'Avatar', wrong: ['Titanic', 'Avengers: Endgame', 'Jurassic Park'] },
      ],
    },
    {
      id: 'ep_mizoram',
      seasonId: 'season_1',
      title: 'Mizoram Heritage',
      description: 'History, culture and the land of the highlanders. A tribute to Mizoram.',
      gradient: 'heritage',
      icon: 'Landmark',
      timeLimitSeconds: 300,
      status: 'draft',
      publishedOffsetDays: 0,
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
      id: 'ep_finale',
      seasonId: 'season_2',
      title: 'Grand Finale Special',
      description: 'The Season 2 finale. Archived for history.',
      gradient: 'gold',
      icon: 'Crown',
      timeLimitSeconds: 300,
      status: 'archived',
      publishedOffsetDays: 30,
      questions: [
        { text: 'Which planet has the most moons?', correct: 'Saturn', wrong: ['Earth', 'Mars', 'Mercury'] },
        { text: 'What is the currency of Japan?', correct: 'Yen', wrong: ['Won', 'Yuan', 'Ringgit'] },
        { text: 'Which element has the symbol O?', correct: 'Oxygen', wrong: ['Osmium', 'Oganesson', 'Gold'] },
        { text: 'Who wrote "Pride and Prejudice"?', correct: 'Jane Austen', wrong: ['Emily Brontë', 'Charles Dickens', 'Mark Twain'] },
        { text: 'What is the smallest prime number?', correct: '2', wrong: ['1', '3', '0'] },
      ],
    },
  ]

  const episodes: Episode[] = []
  const questions: Question[] = []
  const options: QuestionOption[] = []

  for (const es of episodeSeeds) {
    episodes.push({
      id: es.id,
      seasonId: es.seasonId,
      title: es.title,
      slug: es.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: es.description,
      bannerGradient: es.gradient,
      bannerIcon: es.icon,
      bannerUrl: null,
      timeLimitSeconds: es.timeLimitSeconds,
      status: es.status,
      publishedAt: es.status === 'published' ? iso(new Date(now - es.publishedOffsetDays * DAY)) : es.status === 'archived' ? iso(new Date(now - 60 * DAY)) : null,
      createdAt: iso(new Date(now - es.publishedOffsetDays * DAY - 3 * DAY)),
      updatedAt: nowIso(),
    })
    es.questions.forEach((qs, qi) => {
      const qid = uid('q')
      const built = buildQuestion(es.id, qi, qs, qid)
      questions.push(built.question)
      options.push(...built.options)
    })
  }

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
    createdAt: iso(new Date(now - 30 * DAY)),
    updatedAt: nowIso(),
  }))

  const attempts: Attempt[] = []
  const answers: AttemptAnswer[] = []

  const baseStart = now - 11 * DAY
  const attemptSpecs: AttemptSpec[] = [
    { participant: 0, episode: 'ep_gk', correct: 9, seconds: 150 },
    { participant: 1, episode: 'ep_gk', correct: 8, seconds: 175 },
    { participant: 2, episode: 'ep_gk', correct: 8, seconds: 192 },
    { participant: 3, episode: 'ep_gk', correct: 7, seconds: 180 },
    { participant: 4, episode: 'ep_gk', correct: 6, seconds: 160 },
    { participant: 5, episode: 'ep_gk', correct: 5, seconds: 220 },
    { participant: 6, episode: 'ep_gk', correct: 4, seconds: 245 },
    { participant: 7, episode: 'ep_gk', correct: 3, seconds: 200 },
    { participant: 0, episode: 'ep_football', correct: 9, seconds: 90 },
    { participant: 2, episode: 'ep_football', correct: 8, seconds: 105 },
    { participant: 3, episode: 'ep_football', correct: 8, seconds: 118 },
    { participant: 1, episode: 'ep_football', correct: 7, seconds: 100 },
    { participant: 4, episode: 'ep_football', correct: 6, seconds: 130 },
    { participant: 5, episode: 'ep_football', correct: 4, seconds: 150 },
    { participant: 7, episode: 'ep_football', correct: 3, seconds: 90 },
    { participant: 1, episode: 'ep_movies', correct: 8, seconds: 120 },
    { participant: 0, episode: 'ep_movies', correct: 7, seconds: 150 },
    { participant: 3, episode: 'ep_movies', correct: 6, seconds: 165 },
    { participant: 2, episode: 'ep_movies', correct: 5, seconds: 110 },
    { participant: 4, episode: 'ep_movies', correct: 4, seconds: 190 },
    { participant: 6, episode: 'ep_movies', correct: 2, seconds: 210, expired: true },
    { participant: 0, episode: 'ep_finale', correct: 5, seconds: 120 },
    { participant: 1, episode: 'ep_finale', correct: 4, seconds: 140 },
    { participant: 2, episode: 'ep_finale', correct: 3, seconds: 160 },
  ]

  attemptSpecs.forEach((spec, ai) => {
    const episode = episodes.find((e) => e.id === spec.episode)!
    const epQuestions = questions.filter((q) => q.episodeId === episode.id).sort((a, b) => a.order - b.order)
    const start = new Date(baseStart - ai * 5 * 36_000_000)
    const completed = spec.expired
      ? new Date(start.getTime() + episode.timeLimitSeconds * 1000)
      : new Date(start.getTime() + spec.seconds * 1000)
    const score = calculateScore({
      totalQuestions: epQuestions.length,
      correctAnswers: spec.correct,
      unansweredQuestions: spec.expired ? epQuestions.length - spec.correct : 0,
      timeLimitSeconds: episode.timeLimitSeconds,
      timeTakenSeconds: spec.expired ? episode.timeLimitSeconds : spec.seconds,
      status: spec.expired ? 'expired' : 'completed',
    })
    const attemptId = uid('att')
    attempts.push({
      id: attemptId,
      participantId: participants[spec.participant]!.id,
      episodeId: episode.id,
      startedAt: start.toISOString(),
      completedAt: completed.toISOString(),
      status: spec.expired ? 'expired' : 'completed',
      timeTakenSeconds: spec.expired ? episode.timeLimitSeconds : spec.seconds,
      correctAnswers: spec.correct,
      incorrectAnswers: spec.expired ? 0 : epQuestions.length - spec.correct,
      unansweredQuestions: spec.expired ? epQuestions.length - spec.correct : 0,
      baseScore: score.baseScore,
      speedBonus: score.speedBonus,
      finalScore: score.finalScore,
      isTestAttempt: false,
      createdAt: start.toISOString(),
    })
    const correctKeys = new Set<OptionKey>()
    const usedIndexes = new Set<number>()
    for (let c = 0; c < spec.correct; c++) {
      const q = epQuestions[c]!
      const correctOption = options.find((o) => o.questionId === q.id && o.isCorrect)!
      correctKeys.add(correctOption.optionKey)
      usedIndexes.add(c)
    }
    epQuestions.forEach((q, qi) => {
      const answered = qi < spec.correct || (spec.expired && usedIndexes.has(qi))
      if (!answered) return
      const correctOption = options.find((o) => o.questionId === q.id && o.isCorrect)!
      const wrongOptions = options.filter((o) => o.questionId === q.id && !o.isCorrect)
      const pickedCorrect = correctKeys.has(correctOption.optionKey) && qi < spec.correct
      const selectedKey = pickedCorrect ? correctOption.optionKey : wrongOptions[qi % 3]!.optionKey
      answers.push({
        id: uid('ans'),
        attemptId,
        questionId: q.id,
        selectedOptionKey: selectedKey,
        isCorrect: pickedCorrect,
        answeredAt: new Date(start.getTime() + (spec.seconds / epQuestions.length) * (qi + 1) * 1000).toISOString(),
        elapsedSeconds: Math.round((spec.seconds / epQuestions.length) * (qi + 1)),
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

  return { seasons, episodes, questions, options, participants, attempts, answers, admins }
}
