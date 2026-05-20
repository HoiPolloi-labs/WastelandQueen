import { NavLink, Route, Routes, Navigate } from 'react-router'
import { Crown, Users, CalendarClock, Handshake, Trophy } from 'lucide-react'
import { cn } from './lib/cn'
import { RosterPage } from './features/roster/RosterPage'
import { ShiftsPage } from './features/shifts/ShiftsPage'
import { NapPage } from './features/nap/NapPage'
import { ScoringPage } from './features/scoring/ScoringPage'

const navItems = [
  { to: '/roster', label: 'Roster', icon: Users },
  { to: '/shifts', label: 'Shifts', icon: CalendarClock },
  { to: '/nap', label: 'NAP', icon: Handshake },
  { to: '/scoring', label: 'Scoring', icon: Trophy },
] as const

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <div className="flex items-center gap-2 text-yellow-400">
            <Crown className="h-5 w-5" />
            <span className="font-semibold tracking-wide">Wasteland Queen</span>
          </div>
          <nav className="flex gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded px-3 py-1.5 text-sm transition',
                    isActive
                      ? 'bg-zinc-800 text-zinc-50'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/roster" replace />} />
          <Route path="/roster" element={<RosterPage />} />
          <Route path="/shifts" element={<ShiftsPage />} />
          <Route path="/nap" element={<NapPage />} />
          <Route path="/scoring" element={<ScoringPage />} />
          <Route path="*" element={<p>404</p>} />
        </Routes>
      </main>
    </div>
  )
}
