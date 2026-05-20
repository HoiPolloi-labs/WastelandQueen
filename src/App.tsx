import { lazy, Suspense } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router'
import { Crown, Plus, ClipboardList, Loader2, BookOpen } from 'lucide-react'
import { cn } from './lib/cn'

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

function HomeNav() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <Crown className="mx-auto h-12 w-12 text-yellow-400" />
      <h1 className="mt-4 text-2xl font-semibold">Wasteland Queen</h1>
      <p className="mt-2 text-sm text-zinc-400">
        WK-Koordination — leg ein Event an oder öffne den Planner per URL.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <NavLink
          to="/plan/new"
          className="inline-flex items-center justify-center gap-2 rounded bg-yellow-500 px-4 py-2 font-medium text-zinc-950 transition hover:bg-yellow-400"
        >
          <Plus className="h-4 w-4" />
          Neues Event
        </NavLink>
      </div>
    </div>
  )
}

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-12 text-zinc-500">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const isPublic =
    location.pathname.startsWith('/signup/') || location.pathname.startsWith('/board/')

  return (
    <div className="flex h-full flex-col">
      {!isPublic && (
        <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <NavLink to="/" className="flex items-center gap-2 text-yellow-400">
              <Crown className="h-5 w-5" />
              <span className="font-semibold tracking-wide">Wasteland Queen</span>
            </NavLink>
            <nav className="flex gap-1">
              <NavLink
                to="/plan/new"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded px-3 py-1.5 text-sm transition',
                    isActive
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
                  )
                }
              >
                <Plus className="h-4 w-4" />
                Neues Event
              </NavLink>
              <NavLink
                to="/plan"
                end
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded px-3 py-1.5 text-sm transition',
                    isActive
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
                  )
                }
              >
                <ClipboardList className="h-4 w-4" />
                Planner
              </NavLink>
              <NavLink
                to="/cheat-sheet"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded px-3 py-1.5 text-sm transition',
                    isActive
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
                  )
                }
              >
                <BookOpen className="h-4 w-4" />
                Cheat-Sheet
              </NavLink>
            </nav>
          </div>
        </header>
      )}

      <main
        className={cn(
          'flex-1',
          isPublic ? 'mx-auto w-full' : 'mx-auto w-full max-w-7xl px-4 py-6',
        )}
      >
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomeNav />} />
            <Route path="/plan/new" element={<EventSetupPage />} />
            <Route path="/plan" element={<PlanIndex />} />
            <Route path="/plan/:eventId" element={<PlanPage />} />
            <Route path="/signup/:eventId" element={<SignupPage />} />
            <Route path="/board/:eventId" element={<BoardPage />} />
            <Route path="/awards/:eventId" element={<AwardsPage />} />
            <Route path="/cheat-sheet" element={<CheatSheetPage />} />
            <Route
              path="*"
              element={
                <div className="mx-auto max-w-md py-12 text-center text-zinc-500">
                  Nicht gefunden.
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
