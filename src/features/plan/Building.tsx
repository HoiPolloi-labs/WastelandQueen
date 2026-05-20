import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/cn'
import type { Building as BuildingType, Signup, TroopType } from '@/types/wk'
import { PlayerChip } from './PlayerChip'

const BUILDING_LABELS: Record<BuildingType, string> = {
  hub: 'HUB',
  'turret-n': 'North',
  'turret-s': 'South',
  'turret-e': 'East',
  'turret-w': 'West',
  mud: 'Mud',
  reserve: 'Reserve',
  unassigned: 'Unassigned',
}

const TYPE_RING: Record<TroopType, string> = {
  fighter: 'ring-red-500/60 shadow-red-500/20',
  shooter: 'ring-sky-500/60 shadow-sky-500/20',
  rider: 'ring-emerald-500/60 shadow-emerald-500/20',
}

interface BuildingProps {
  building: BuildingType
  shift: 1 | 2
  members: Signup[]
  captainId: string | null
  className?: string
  large?: boolean
}

function pureType(members: Signup[]): TroopType | null {
  if (members.length === 0) return null
  const first = members[0]!.troop_type
  return members.every((m) => m.troop_type === first) ? first : null
}

export function Building({
  building,
  shift,
  members,
  captainId,
  className,
  large,
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
        synergy && `shadow-lg ring-2 ${TYPE_RING[synergy]}`,
        className,
      )}
    >
      <header className="mb-2 flex items-center justify-between px-1">
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            isHub ? 'text-yellow-400' : 'text-zinc-400',
          )}
        >
          {BUILDING_LABELS[building]}
        </span>
        <span className="text-[10px] text-zinc-500">{members.length}</span>
      </header>
      <div
        className={cn(
          'flex flex-col gap-1 overflow-y-auto pr-0.5',
          large ? 'min-h-[180px] max-h-[260px]' : 'min-h-[120px] max-h-[200px]',
        )}
      >
        {members.length === 0 && (
          <div className="flex h-full flex-1 items-center justify-center text-[11px] italic text-zinc-600">
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
