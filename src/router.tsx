import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { Toaster } from './components/ui'
import { AdminLayout, PublicLayout } from './components/layout'
import { isAdminLoggedIn } from './services/authService'

import { HomePage } from './routes/home'
import { EpisodesPage } from './routes/episodes'
import { EpisodeDetailPage } from './routes/episodeDetail'
import { QuizPage } from './routes/quiz'
import { ResultPage } from './routes/result'
import { LeaderboardPage } from './routes/leaderboard'
import { SeasonsPage } from './routes/seasons'

import { AdminLoginPage } from './routes/admin/login'
import { AdminDashboardPage } from './routes/admin/dashboard'
import { AdminSeasonsPage } from './routes/admin/seasons'
import { SeasonFormPage } from './routes/admin/seasonForm'
import { AdminEpisodesPage } from './routes/admin/episodes'
import { EpisodeFormPage } from './routes/admin/episodeForm'
import { AdminQuestionsPage } from './routes/admin/questions'
import { AdminEpisodeLeaderboardPage } from './routes/admin/episodeLeaderboard'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
})

const publicLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public',
  component: PublicLayout,
})

const homeRoute = createRoute({
  getParentRoute: () => publicLayout,
  path: '/',
  component: HomePage,
})

const episodesRoute = createRoute({
  getParentRoute: () => publicLayout,
  path: '/episodes',
  component: EpisodesPage,
})

const episodeDetailRoute = createRoute({
  getParentRoute: () => publicLayout,
  path: '/episodes/$episodeId',
  component: EpisodeDetailPage,
})

const quizRoute = createRoute({
  getParentRoute: () => publicLayout,
  path: '/episodes/$episodeId/quiz',
  component: QuizPage,
})

const resultRoute = createRoute({
  getParentRoute: () => publicLayout,
  path: '/episodes/$episodeId/result',
  component: ResultPage,
  validateSearch: (search: Record<string, unknown>) => ({
    attemptId: typeof search.attemptId === 'string' ? search.attemptId : '',
  }),
})

const leaderboardRoute = createRoute({
  getParentRoute: () => publicLayout,
  path: '/leaderboard',
  component: LeaderboardPage,
})

const seasonsRoute = createRoute({
  getParentRoute: () => publicLayout,
  path: '/seasons',
  component: SeasonsPage,
})

const adminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/login',
  component: AdminLoginPage,
})

const adminLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: 'admin',
  component: AdminLayout,
  beforeLoad: () => {
    if (!isAdminLoggedIn()) {
      throw redirect({ to: '/admin/login' })
    }
  },
})

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: '/admin',
  component: AdminDashboardPage,
})

const adminSeasonsRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: '/admin/seasons',
  component: AdminSeasonsPage,
})

const adminSeasonFormRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: '/admin/seasons/$seasonId',
  component: SeasonFormPage,
})

const adminEpisodesRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: '/admin/episodes',
  component: AdminEpisodesPage,
})

const adminEpisodeFormRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: '/admin/episodes/$episodeId',
  component: EpisodeFormPage,
})

const adminQuestionsRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: '/admin/episodes/$episodeId/questions',
  component: AdminQuestionsPage,
})

const adminEpisodeLeaderboardRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: '/admin/episodes/$episodeId/leaderboard',
  component: AdminEpisodeLeaderboardPage,
})

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundPage,
})

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl font-bold text-gradient">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-white">Page not found</h1>
      <p className="mt-2 text-sm text-ink-300">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:brightness-110">
        Back to home
      </Link>
    </div>
  )
}

const routeTree = rootRoute.addChildren([
  publicLayout.addChildren([
    homeRoute,
    episodesRoute,
    episodeDetailRoute,
    quizRoute,
    resultRoute,
    leaderboardRoute,
    seasonsRoute,
  ]),
  adminLayout.addChildren([
    adminDashboardRoute,
    adminSeasonsRoute,
    adminSeasonFormRoute,
    adminEpisodesRoute,
    adminEpisodeFormRoute,
    adminQuestionsRoute,
    adminEpisodeLeaderboardRoute,
  ]),
  adminLoginRoute,
  notFoundRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingMinMs: 200,
})
