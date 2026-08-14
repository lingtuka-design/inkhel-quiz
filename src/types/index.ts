export type SeasonStatus = 'draft' | 'active' | 'completed' | 'archived'
export type EpisodeStatus = 'draft' | 'published' | 'archived'
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

export interface Episode {
  id: string
  seasonId: string
  title: string
  slug: string
  description: string
  bannerGradient: string
  bannerIcon: string
  bannerUrl: string | null
  timeLimitSeconds: number
  status: EpisodeStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Question {
  id: string
  episodeId: string
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
  episodeId: string
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

export interface EpisodeReviewQuestion {
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
  episodes: number
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
