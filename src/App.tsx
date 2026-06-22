import { lazy, Suspense } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router'
import { Crown, Plus, ClipboardList, Loader2, BookOpen, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from './lib/cn'
import { BuildInfo } from './components/ui/BuildInfo'
import { LanguageSwitcher } from './components/ui/LanguageSwitcher'
import { EventAuthGate } from './features/auth/EventAuthGate'
import { LegacyTokenlessURL } from './features/auth/LegacyTokenlessURL'

const EventSetupPage = lazy(() =>
  import('./features/event/EventSetupPage').then((m) => ({ default: m.EventSetupPage })),
)
const SignupPage = lazy(() =>
  import('./features/signup/SignupPage').then((m) => ({ default: m.SignupPage })),
)
const PlanPage = lazy(() =>
  import('./features/plan/PlanPage').then((m) => ({ default: m.PlanPage })),
)
const PlanIndex = lazy(() =>
  import('./features/plan/PlanIndex').then((m) => ({ default: m.PlanIndex })),
)
const BoardPage = lazy(() =>
  import('./features/board/BoardPage').then((m) => ({ default: m.BoardPage })),
)
const AwardsPage = lazy(() =>
  import('./features/awards/AwardsPage').then((m) => ({ default: m.AwardsPage })),
)
const CheatSheetPage = lazy(() =>
  import('./features/cheatsheet/CheatSheetPage').then((m) => ({
    default: m.CheatSheetPage,
  })),
)
const ToolsHubPage = lazy(() =>
  import('./features/tools/ToolsHubPage').then((m) => ({ default: m.ToolsHubPage })),
)
const FastComebackPage = lazy(() =>
  import('./features/tools/FastComebackPage').then((m) => ({ default: m.FastComebackPage })),
)
const HealingPage = lazy(() =>
  import('./features/tools/HealingPage').then((m) => ({ default: m.HealingPage })),
)
const SortingPage = lazy(() =>
  import('./features/tools/sorting/SortingPage').then((m) => ({ default: m.SortingPage })),
)
const HeroScene = lazy(() =>
  import('./features/home/HeroScene').then((m) => ({ default: m.HeroScene })),
)


function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-12 text-zinc-500">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )
}

export default function App() {
  const { t } = useTranslation()
  const location = useLocation()
  const isPublic =
    location.pathname === '/' ||
    location.pathname.startsWith('/signup/') ||
    location.pathname.startsWith('/board/') ||
    location.pathname.startsWith('/demo/')

  return (
    <div className="flex h-full flex-col">
      {!isPublic && (
        <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur">
          {/* UX-FIX: shrink gap + collapse nav label visibility on <sm so the
              brand + 3 NavLinks + LanguageSwitcher don't overflow the 375px
              viewport. Icons stay visible (and are big enough for tap),
              labels hide. */}
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-6 sm:px-4">
            <NavLink to="/" className="flex items-center gap-2 text-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 rounded">
              <Crown className="h-5 w-5" />
              <span className="hidden font-semibold tracking-wide sm:inline">Wasteland Queen</span>
            </NavLink>
            <nav className="flex gap-1">
              <NavLink
                to="/plan/new"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded px-2 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 sm:px-3',
                    isActive
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
                  )
                }
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.new_event')}</span>
              </NavLink>
              <NavLink
                to="/plan"
                end
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded px-2 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 sm:px-3',
                    isActive
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
                  )
                }
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.planner')}</span>
              </NavLink>
              <NavLink
                to="/cheat-sheet"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded px-2 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 sm:px-3',
                    isActive
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
                  )
                }
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.cheat_sheet')}</span>
              </NavLink>
              <NavLink
                to="/tools"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded px-2 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 sm:px-3',
                    isActive
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
                  )
                }
              >
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.tools')}</span>
              </NavLink>
            </nav>
            <div className="ml-auto">
              <LanguageSwitcher />
            </div>
          </div>
        </header>
      )}
      {/* Floating language picker for public pages (signup/board/hero) that don't show the header */}
      {isPublic && (
        <div className="fixed right-2 top-2 z-40">
          <LanguageSwitcher />
        </div>
      )}

      <main
        className={cn(
          'flex-1',
          isPublic ? 'mx-auto w-full' : 'mx-auto w-full max-w-7xl px-4 py-6',
        )}
      >
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HeroScene />} />
            <Route path="/plan/new" element={<EventSetupPage />} />
            <Route path="/plan" element={<PlanIndex />} />
            <Route
              path="/plan/:eventId/:token"
              element={
                <EventAuthGate requiredRole="planner">
                  <PlanPage />
                </EventAuthGate>
              }
            />
            {/* Editable sandbox: planner UI driven by a board-role JWT (read-only
                server-side) with demoMode skipping every write client-side. */}
            <Route
              path="/demo/:eventId/:token"
              element={
                <EventAuthGate requiredRole={['board', 'planner']}>
                  <PlanPage demoMode />
                </EventAuthGate>
              }
            />
            <Route
              path="/signup/:eventId/:token"
              element={
                <EventAuthGate requiredRole={['signup', 'planner']}>
                  <SignupPage />
                </EventAuthGate>
              }
            />
            <Route
              path="/board/:eventId/:token"
              element={
                <EventAuthGate requiredRole={['board', 'planner']}>
                  <BoardPage />
                </EventAuthGate>
              }
            />
            <Route
              path="/awards/:eventId/:token"
              element={
                <EventAuthGate requiredRole="planner">
                  <AwardsPage />
                </EventAuthGate>
              }
            />
            <Route path="/plan/:eventId" element={<LegacyTokenlessURL kind="plan" />} />
            <Route path="/signup/:eventId" element={<LegacyTokenlessURL kind="signup" />} />
            <Route path="/board/:eventId" element={<LegacyTokenlessURL kind="board" />} />
            <Route path="/awards/:eventId" element={<LegacyTokenlessURL kind="awards" />} />
            <Route path="/cheat-sheet" element={<CheatSheetPage />} />
            <Route path="/tools" element={<ToolsHubPage />} />
            <Route path="/tools/fast-comeback" element={<FastComebackPage />} />
            <Route path="/tools/healing" element={<HealingPage />} />
            <Route path="/tools/sorting" element={<SortingPage />} />
            <Route
              path="*"
              element={
                <div className="mx-auto max-w-md py-12 text-center text-zinc-500">
                  404
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
      {/* Hide build-info on hero/signup/board where it'd visually intrude */}
      {location.pathname !== '/' &&
        !location.pathname.startsWith('/signup/') &&
        !location.pathname.startsWith('/board/') && <BuildInfo />}
    </div>
  )
}
