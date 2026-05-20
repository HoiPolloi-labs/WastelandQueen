import { AlertTriangle } from 'lucide-react'
import type { Assignment, Signup } from '@/types/wk'
import { TURRETS } from '@/types/wk'

interface ConflictBannerProps {
  shift: 1 | 2
  signups: Signup[]
  assignments: Assignment[]
}

type Conflict = { kind: 'error' | 'warn'; msg: string }

function detectConflicts(
  shift: 1 | 2,
  signups: Signup[],
  assignments: Assignment[],
): Conflict[] {
  const out: Conflict[] = []
  const shiftAssigns = assignments.filter((a) => a.shift === shift)

  // Hub captain?
  const hubAssigns = shiftAssigns.filter((a) => a.building === 'hub')
  if (hubAssigns.length === 0) {
    out.push({ kind: 'warn', msg: 'Hub leer — kein Captain' })
  } else if (!hubAssigns.some((a) => a.is_captain)) {
    out.push({ kind: 'error', msg: 'Hub hat keinen Captain markiert' })
  }

  // Pro Turm: Captain + Typ-Reinheit
  for (const turret of TURRETS) {
    const list = shiftAssigns.filter((a) => a.building === turret)
    if (list.length === 0) continue
    const members = list
      .map((a) => signups.find((s) => s.id === a.signup_id))
      .filter((s): s is Signup => Boolean(s))
    if (!list.some((a) => a.is_captain)) {
      out.push({ kind: 'warn', msg: `${turret.toUpperCase()}: kein Captain` })
    }
    const types = new Set(members.map((m) => m.troop_type))
    if (types.size > 1) {
      out.push({
        kind: 'warn',
        msg: `${turret.toUpperCase()}: gemischte Typen (${[...types].join('+')}) → keine Super-Reinforcement-Synergie`,
      })
    }
  }

  return out
}

export function ConflictBanner({ shift, signups, assignments }: ConflictBannerProps) {
  const conflicts = detectConflicts(shift, signups, assignments)
  if (conflicts.length === 0) {
    return (
      <div className="rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
        ✓ Keine Konflikte
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {conflicts.map((c, i) => (
        <li
          key={i}
          className={
            'flex items-center gap-2 rounded border px-3 py-1.5 text-xs ' +
            (c.kind === 'error'
              ? 'border-red-500/40 bg-red-500/5 text-red-300'
              : 'border-amber-500/40 bg-amber-500/5 text-amber-300')
          }
        >
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          {c.msg}
        </li>
      ))}
    </ul>
  )
}
