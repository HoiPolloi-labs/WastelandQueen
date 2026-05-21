import { useDroppable } from '@dnd-kit/core'
import { Check, X, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import type {
  Assignment,
  Building as BuildingType,
  ShiftNumber,
  Signup,
  TroopType,
} from '@/types/wk'
import { PlayerChip } from './PlayerChip'

const BUILDING_LABELS: Record<BuildingType, string> = {
  hub: 'HUB',
  'turret-n': 'North',
  'turret-s': 'South',
  'turret-e': 'East',
  'turret-w': 'West',
  mud: 'Mud',
  reserve: 'Reserve',
  'hit-squad': 'Hit Squad',
  unassigned: 'Unassigned',
}

const BUILDING_HINTS: Partial<Record<BuildingType, string>> = {
  hub: 'Captain: enter first, activate Super Reinforcement, hold the spot, call reinforcements in chat. Captain-Rally = Building-Capacity, Captain-Stats = jede einlaufende March bekommt sie.',
  'turret-n': 'Turret-Captain: gleicher Drill wie Hub. Türme mit nur 1 Typ aktivieren Synergy-Ring (Super Reinforcement Bonus).',
  'turret-s': 'Turret-Captain: gleicher Drill wie Hub. Türme mit nur 1 Typ aktivieren Synergy-Ring (Super Reinforcement Bonus).',
  'turret-e': 'Turret-Captain: gleicher Drill wie Hub. Türme mit nur 1 Typ aktivieren Synergy-Ring (Super Reinforcement Bonus).',
  'turret-w': 'Turret-Captain: gleicher Drill wie Hub. Türme mit nur 1 Typ aktivieren Synergy-Ring (Super Reinforcement Bonus).',
  'hit-squad':
    'Offensive captains für Foreign-Hub-Angriff. Auto-Sort lässt diesen Bucket leer; Belegung ist manuelle Entscheidung.',
  mud: 'Mudsitter: shielded sanctuaries clogging the mud. Schild-Stack (8h+1d) Pflicht, sonst Troops weg.',
  reserve: 'Fill-ins, die einspringen wenn ein Defender ausfällt.',
}

const TYPE_RING: Record<TroopType, string> = {
  fighter: 'ring-red-500/60 shadow-red-500/20',
  shooter: 'ring-sky-500/60 shadow-sky-500/20',
  rider: 'ring-emerald-500/60 shadow-emerald-500/20',
}

interface BuildingProps {
  building: BuildingType
  shift: ShiftNumber
  members: Signup[]
  captainId: string | null
  /** Captain row, used for the live-event present/absent toggle. */
  captainAssignment?: Assignment | null
  onCaptainPresentChange?: (assignmentId: string, present: boolean | null) => void
  className?: string
  large?: boolean
  /** Override the default tooltip — e.g. Hit Squad gets foreign-target list */
  hintOverride?: string
}

function pureType(members: Signup[]): TroopType | null {
  if (members.length === 0) return null
  const first = members[0]!.troop_type
  return members.every((m) => m.troop_type === first) ? first : null
}

/**
 * Heatmap-style strip showing total tier power for the building.
 * Scale is roughly "5 members × T10 ≈ full bar". Color goes cold→hot.
 */
function TierHeat({ members }: { members: Signup[] }) {
  if (members.length === 0) return <div className="mb-2 h-1 rounded bg-zinc-900" />
  const total = members.reduce((sum, m) => sum + m.tier, 0)
  const lair = members.reduce((sum, m) => sum + m.max_solo_lair, 0)
  const heat = Math.min(1, total / 50) // 50 = 5×T10 baseline
  const pct = Math.round(heat * 100)
  const color =
    heat >= 0.8
      ? 'from-orange-500 to-red-500'
      : heat >= 0.5
        ? 'from-yellow-500 to-orange-500'
        : heat >= 0.25
          ? 'from-sky-500 to-yellow-500'
          : 'from-zinc-700 to-sky-500'
  return (
    <div className="mb-2" title={`Σ Tier ${total} · Σ Lair ${lair}`}>
      <div className="relative h-1 overflow-hidden rounded bg-zinc-900">
        <div
          className={`absolute inset-y-0 left-0 rounded bg-gradient-to-r ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function Building({
  building,
  shift,
  members,
  captainId,
  captainAssignment,
  onCaptainPresentChange,
  className,
  large,
  hintOverride,
}: BuildingProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop:${building}:${shift}`,
    data: { building, shift },
  })

  const synergy = building.startsWith('turret-') ? pureType(members) : null
  const isHub = building === 'hub'

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border bg-zinc-900/60 p-2 transition',
        isOver ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-800',
        isHub && 'border-yellow-600/60 bg-yellow-500/5 shadow-inner shadow-yellow-500/10',
        building === 'hit-squad' && 'border-orange-700/50 bg-orange-500/5',
        synergy && `shadow-lg ring-2 ${TYPE_RING[synergy]}`,
        className,
      )}
    >
      <header
        className="mb-2 flex items-center justify-between gap-2 px-1"
        title={hintOverride ?? BUILDING_HINTS[building]}
      >
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            isHub
              ? 'text-yellow-400'
              : building === 'hit-squad'
                ? 'text-orange-400'
                : 'text-zinc-400',
          )}
        >
          {BUILDING_LABELS[building]}
        </span>
        <div className="flex items-center gap-1.5">
          {captainAssignment && onCaptainPresentChange && (
            <CaptainPresentToggle
              assignment={captainAssignment}
              onChange={onCaptainPresentChange}
            />
          )}
          <span className="text-[10px] text-zinc-400">{members.length}</span>
        </div>
      </header>
      <TierHeat members={members} />

      <div
        className={cn(
          'flex flex-col gap-1 overflow-y-auto pr-0.5',
          large ? 'min-h-[180px] max-h-[260px]' : 'min-h-[120px] max-h-[200px]',
        )}
        data-testid={`building-body-${building}`}
      >
        {members.length === 0 && (
          <div className="flex h-full flex-1 items-center justify-center text-[11px] italic text-zinc-400">
            leer
          </div>
        )}
        {members.map((s) => (
          <PlayerChip
            key={`${s.id}-${shift}`}
            signup={s}
            shift={shift}
            isCaptain={captainId === s.id}
            compact
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Tri-state pill: unknown → present → absent → unknown.
 * Live-event Super-Reinforcement tracker — if the captain doesn't show, the
 * R5/Gov flips this red so reinforcers know their incoming march won't get the
 * captain's stat-stack and should retarget another building.
 */
function CaptainPresentToggle({
  assignment,
  onChange,
}: {
  assignment: Assignment
  onChange: (assignmentId: string, present: boolean | null) => void
}) {
  const state = assignment.captain_present
  const next = state === null ? true : state === true ? false : null
  const cycle = () => onChange(assignment.id, next)

  const tone =
    state === true
      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
      : state === false
        ? 'border-red-500/60 bg-red-500/15 text-red-300 hover:bg-red-500/25'
        : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'

  const label =
    state === true
      ? 'Captain anwesend — Super Reinforcement aktiv'
      : state === false
        ? 'Captain abwesend! Reinforcer sollten umrouten.'
        : 'Captain-Status unbekannt. Klick zum Markieren als anwesend.'

  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={label}
      className={cn(
        'rounded border px-1 py-px text-[10px] leading-none transition',
        tone,
      )}
    >
      {state === true ? (
        <Check className="h-2.5 w-2.5" />
      ) : state === false ? (
        <X className="h-2.5 w-2.5" />
      ) : (
        <HelpCircle className="h-2.5 w-2.5" />
      )}
    </button>
  )
}
