import type { Assignment, Building as BuildingType, ShiftNumber, Signup } from '@/types/wk'
import { TURRETS } from '@/types/wk'
import { Building } from './Building'

interface PlazaProps {
  shift: ShiftNumber
  signups: Signup[]
  assignments: Assignment[]
  /** Optional foreign-state targets, surfaced on the Hit-Squad bucket */
  foreignTargets?: string[] | null
}

function membersOf(
  building: BuildingType,
  shift: ShiftNumber,
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

export function Plaza({ shift, signups, assignments, foreignTargets }: PlazaProps) {
  const hub = membersOf('hub', shift, assignments, signups)
  const turretData = TURRETS.map((t) => ({
    turret: t,
    ...membersOf(t, shift, assignments, signups),
  }))
  const mud = membersOf('mud', shift, assignments, signups)
  const reserve = membersOf('reserve', shift, assignments, signups)
  const hitSquad = membersOf('hit-squad', shift, assignments, signups)

  const grid: Record<string, (typeof turretData)[number] | undefined> = {}
  for (const t of turretData) {
    if (t.turret === 'turret-n') grid.n = t
    if (t.turret === 'turret-s') grid.s = t
    if (t.turret === 'turret-e') grid.e = t
    if (t.turret === 'turret-w') grid.w = t
  }

  const hitSquadHint =
    foreignTargets && foreignTargets.length > 0
      ? `Offensive captains → ${foreignTargets.join(', ')}. Auto-Sort lässt diesen Bucket leer.`
      : undefined

  return (
    <div className="flex flex-col gap-3">
      {/* Geometric 3×3 Plaza on ≥sm. On mobile the corner spacers are hidden
          and all 5 dropzones stack vertically so each building stays usable
          without horizontal cramping. */}
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_1.6fr_1fr] sm:grid-rows-[1fr_1.4fr_1fr]">
        <div className="hidden sm:block" />
        <Building
          building="turret-n"
          shift={shift}
          members={grid.n?.members ?? []}
          captainId={grid.n?.captainId ?? null}
        />
        <div className="hidden sm:block" />

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

        <div className="hidden sm:block" />
        <Building
          building="turret-s"
          shift={shift}
          members={grid.s?.members ?? []}
          captainId={grid.s?.captainId ?? null}
        />
        <div className="hidden sm:block" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Building building="mud" shift={shift} members={mud.members} captainId={null} />
        <Building
          building="reserve"
          shift={shift}
          members={reserve.members}
          captainId={null}
        />
        <Building
          building="hit-squad"
          shift={shift}
          members={hitSquad.members}
          captainId={null}
          hintOverride={hitSquadHint}
        />
      </div>
    </div>
  )
}
