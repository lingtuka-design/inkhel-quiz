export type SeasonStatus = 'draft' | 'active' | 'completed' | 'archived'
export type MonthStatus = 'upcoming' | 'open' | 'completed'
export type RoundStatus = 'draft' | 'published' | 'archived'
export type AttemptStatus = 'in_progress' | 'completed' | 'expired' | 'abandoned'
export type OptionKey = 'A' | 'B' | 'C' | 'D'

export interface Season {
  id: string
  name: string
  description: string
  seasonNumber: number
  durationMonths: number
  startDate: string
  endDate: string
  status: SeasonStatus
  createdAt: string
  updatedAt: string
}

export interface Month {
  id: string
  seasonId: string
  monthNumber: number
  name: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export interface Round {
  id: string
  monthId: string
  title: string
  slug: string
  description: string
  bannerGradient: string
  bannerIcon: string
  bannerUrl: string | null
  timeLimitSeconds: number
  status: RoundStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Question {
  id: string
  roundId: string
  text: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface QuestionOption {
  id: string
  questionId: string
  optionKey: OptionKey
  text: string
  isCorrect: boolean
  createdAt: string
  updatedAt: string
}

export interface Participant {
  id: string
  displayName: string
  email: string | null
  avatarGradient: string
  provider: 'guest' | 'google'
  createdAt: string
  updatedAt: string
}

export interface Attempt {
  id: string
  participantId: string
  roundId: string
  startedAt: string
  completedAt: string | null
  status: AttemptStatus
  timeTakenSeconds: number | null
  correctAnswers: number
  incorrectAnswers: number
  unansweredQuestions: number
  baseScore: number
  speedBonus: number
  finalScore: number
  isTestAttempt: boolean
  createdAt: string
}

export interface AttemptAnswer {
  id: string
  attemptId: string
  questionId: string
  selectedOptionKey: OptionKey | null
  isCorrect: boolean
  answeredAt: string
  elapsedSeconds: number
}

export interface AdminUser {
  id: string
  username: string
  passwordHash: string
  sessionToken: string | null
  createdAt: string
}

export interface QuizQuestion {
  id: string
  text: string
  order: number
  options: { key: OptionKey; text: string }[]
}

export interface RoundReviewQuestion {
  id: string
  text: string
  order: number
  options: { key: OptionKey; text: string; isCorrect: boolean }[]
  selectedKey: OptionKey | null
  isCorrect: boolean
  answered: boolean
}

export interface LeaderboardRow {
  rank: number
  participant: Participant
  correctAnswers: number
  totalQuestions: number
  timeTakenSeconds: number
  score: number
  completedAt: string
  attemptId: string
  isCurrentUser: boolean
}

export interface RankingRow {
  rank: number
  participant: Participant
  rounds: number
  points: number
  totalCorrect: number
  avgTimeSeconds: number
  bestScore: number
  worstScore: number
  isCurrentUser: boolean
}

export interface QuestionDraft {
  id: string | null
  text: string
  order: number
  options: { key: OptionKey; text: string }[]
  correctKey: OptionKey
}
