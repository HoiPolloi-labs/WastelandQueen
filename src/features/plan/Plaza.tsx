import type { Assignment, Signup } from '@/types/wk'
import { TURRETS } from '@/types/wk'
import { Building } from './Building'

interface PlazaProps {
  shift: 1 | 2
  signups: Signup[]
  assignments: Assignment[]
}

function membersOf(
  building: Assignment['building'],
  shift: 1 | 2,
  assignments: Assignment[],
  signups: Signup[],
): { members: Signup[]; captainId: string | null } {
  const slot = assignments.filter((a) => a.building === building && a.shift === shift)
  slot.sort((a, b) => (a.is_captain === b.is_captain ? a.position - b.position : a.is_captain ? -1 : 1))
  const members = slot
    .map((a) => signups.find((s) => s.id === a.signup_id))
    .filter((s): s is Signup => Boolean(s))
  const captain = slot.find((a) => a.is_captain)?.signup_id ?? null
  return { members, captainId: captain }
}

export function Plaza({ shift, signups, assignments }: PlazaProps) {
  const hub = membersOf('hub', shift, assignments, signups)
  const turretData = TURRETS.map((t) => ({
    turret: t,
    ...membersOf(t, shift, assignments, signups),
  }))

  const grid: Record<string, (typeof turretData)[number] | undefined> = {}
  for (const t of turretData) {
    if (t.turret === 'turret-n') grid.n = t
    if (t.turret === 'turret-s') grid.s = t
    if (t.turret === 'turret-e') grid.e = t
    if (t.turret === 'turret-w') grid.w = t
  }

  return (
    <div className="grid grid-cols-[1fr_1.6fr_1fr] grid-rows-[1fr_1.4fr_1fr] gap-3">
      <div />
      <Building
        building="turret-n"
        shift={shift}
        members={grid.n?.members ?? []}
        captainId={grid.n?.captainId ?? null}
      />
      <div />

      <Building
        building="turret-w"
        shift={shift}
        members={grid.w?.members ?? []}
        captainId={grid.w?.captainId ?? null}
      />
      <Building
        building="hub"
        shift={shift}
        members={hub.members}
        captainId={hub.captainId}
        large
      />
      <Building
        building="turret-e"
        shift={shift}
        members={grid.e?.members ?? []}
        captainId={grid.e?.captainId ?? null}
      />

      <div />
      <Building
        building="turret-s"
        shift={shift}
        members={grid.s?.members ?? []}
        captainId={grid.s?.captainId ?? null}
      />
      <div />
    </div>
  )
}
