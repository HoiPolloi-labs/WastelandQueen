import type { Assignment, Building as BuildingType, ShiftNumber, Signup } from '@/types/wk'
import { TURRETS } from '@/types/wk'
import { Building } from './Building'

interface PlazaProps {
  shift: ShiftNumber
  signups: Signup[]
  assignments: Assignment[]
  /** Optional foreign-state targets, surfaced on the Hit-Squad bucket */
  foreignTargets?: string[] | null
  onCaptainPresentChange?: (assignmentId: string, present: boolean | null) => void
}

function membersOf(
  building: BuildingType,
  shift: ShiftNumber,
  assignments: Assignment[],
  signups: Signup[],
  /** Optional filter for per-target Hit-Squad buckets. When set, only rows
   *  whose foreign_target matches (including null when target === null) are
   *  considered. */
  foreignTarget?: string | null,
): { members: Signup[]; captainId: string | null; captainAssignment: Assignment | null } {
  const slot = assignments.filter((a) => {
    if (a.building !== building || a.shift !== shift) return false
    if (foreignTarget === undefined) return true
    return (a.foreign_target ?? null) === foreignTarget
  })
  slot.sort((a, b) => (a.is_captain === b.is_captain ? a.position - b.position : a.is_captain ? -1 : 1))
  const members = slot
    .map((a) => signups.find((s) => s.id === a.signup_id))
    .filter((s): s is Signup => Boolean(s))
  const captainRow = slot.find((a) => a.is_captain) ?? null
  return {
    members,
    captainId: captainRow?.signup_id ?? null,
    captainAssignment: captainRow,
  }
}

export function Plaza({
  shift,
  signups,
  assignments,
  foreignTargets,
  onCaptainPresentChange,
}: PlazaProps) {
  const hub = membersOf('hub', shift, assignments, signups)
  const turretData = TURRETS.map((t) => ({
    turret: t,
    ...membersOf(t, shift, assignments, signups),
  }))
  const mud = membersOf('mud', shift, assignments, signups)
  const reserve = membersOf('reserve', shift, assignments, signups)
  // Per-state Hit-Squad buckets when the event lists 1+ foreign targets;
  // otherwise a single generic bucket. The "generic" bucket also catches
  // legacy rows where foreign_target is null even on targeted events.
  const hitSquadTargets = (foreignTargets ?? []).filter((s) => s.trim() !== '')
  const hitSquadBuckets =
    hitSquadTargets.length > 0
      ? hitSquadTargets.map((target) => ({
          target,
          ...membersOf('hit-squad', shift, assignments, signups, target),
        }))
      : [
          {
            target: null as string | null,
            ...membersOf('hit-squad', shift, assignments, signups),
          },
        ]
  // Untargeted overflow when event has targets but some rows are tagless —
  // surface them separately so they don't silently vanish from the UI.
  const untaggedHitSquad =
    hitSquadTargets.length > 0
      ? membersOf('hit-squad', shift, assignments, signups, null)
      : { members: [], captainId: null, captainAssignment: null }

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
          captainAssignment={grid.n?.captainAssignment ?? null}
          onCaptainPresentChange={onCaptainPresentChange}
        />
        <div className="hidden sm:block" />

        <Building
          building="turret-w"
          shift={shift}
          members={grid.w?.members ?? []}
          captainId={grid.w?.captainId ?? null}
          captainAssignment={grid.w?.captainAssignment ?? null}
          onCaptainPresentChange={onCaptainPresentChange}
        />
        <Building
          building="hub"
          shift={shift}
          members={hub.members}
          captainId={hub.captainId}
          captainAssignment={hub.captainAssignment}
          onCaptainPresentChange={onCaptainPresentChange}
          large
        />
        <Building
          building="turret-e"
          shift={shift}
          members={grid.e?.members ?? []}
          captainId={grid.e?.captainId ?? null}
          captainAssignment={grid.e?.captainAssignment ?? null}
          onCaptainPresentChange={onCaptainPresentChange}
        />

        <div className="hidden sm:block" />
        <Building
          building="turret-s"
          shift={shift}
          members={grid.s?.members ?? []}
          captainId={grid.s?.captainId ?? null}
          captainAssignment={grid.s?.captainAssignment ?? null}
          onCaptainPresentChange={onCaptainPresentChange}
        />
        <div className="hidden sm:block" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Building building="mud" shift={shift} members={mud.members} captainId={null} />
        <Building
          building="reserve"
          shift={shift}
          members={reserve.members}
          captainId={null}
        />
      </div>

      {/* Hit-Squad row. One bucket per foreign target, or a single generic
          bucket if the event hasn't named any targets. Untagged-but-targeted
          rows get an "Unassigned" bucket at the end so legacy data stays
          visible. Bucket count drives the column grid (max 3 on sm+). */}
      <div
        className={`grid grid-cols-1 gap-3 ${
          hitSquadBuckets.length + (untaggedHitSquad.members.length > 0 ? 1 : 0) >= 3
            ? 'sm:grid-cols-3'
            : hitSquadBuckets.length + (untaggedHitSquad.members.length > 0 ? 1 : 0) === 2
              ? 'sm:grid-cols-2'
              : ''
        }`}
      >
        {hitSquadBuckets.map((b) => (
          <Building
            key={`hit-squad-${b.target ?? 'generic'}`}
            building="hit-squad"
            shift={shift}
            members={b.members}
            captainId={b.captainId}
            foreignTarget={b.target}
            hintOverride={hitSquadHint}
          />
        ))}
        {untaggedHitSquad.members.length > 0 && (
          <Building
            building="hit-squad"
            shift={shift}
            members={untaggedHitSquad.members}
            captainId={untaggedHitSquad.captainId}
            hintOverride="Untagged hit-squad members. Drag onto a target bucket to assign."
          />
        )}
      </div>
    </div>
  )
}
