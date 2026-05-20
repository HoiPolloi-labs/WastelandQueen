import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Crown, Swords, Crosshair, Zap, StickyNote } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Signup, TroopType } from '@/types/wk'
import { captainScore } from './auto-sort'
import { useOpenNote } from './NotesContext'

const TYPE_META: Record<
  TroopType,
  { Icon: typeof Swords; border: string; bg: string; label: string }
> = {
  fighter: {
    Icon: Swords,
    border: 'border-l-red-500',
    bg: 'bg-red-500/5',
    label: 'F',
  },
  shooter: {
    Icon: Crosshair,
    border: 'border-l-sky-500',
    bg: 'bg-sky-500/5',
    label: 'S',
  },
  rider: {
    Icon: Zap,
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-500/5',
    label: 'R',
  },
}

function formatRally(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

function ScoreBadge({ score, willing }: { score: number; willing: boolean }) {
  const rounded = Math.round(score)
  // T10 lair-6 0-rally → ~28; T11 lair-7 1.5M → ~122; T12 lair-8 3M → ~216
  const tone =
    rounded >= 150
      ? 'border-yellow-500/60 bg-yellow-500/15 text-yellow-200'
      : rounded >= 80
        ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
        : rounded >= 40
          ? 'border-zinc-600 bg-zinc-800 text-zinc-300'
          : 'border-zinc-700 bg-zinc-900 text-zinc-500'
  return (
    <span
      className={`rounded border px-1 py-px font-mono text-[10px] ${tone} ${willing ? '' : 'opacity-60'}`}
      title={`Captain-Score ${rounded} — rally/100k×6 + lair×3 + tier${willing ? '' : ' (nicht als Captain verfügbar)'}`}
    >
      {rounded}
    </span>
  )
}

interface PlayerChipProps {
  signup: Signup
  isCaptain?: boolean
  shift: 1 | 2
  compact?: boolean
  dragId?: string
  highlight?: boolean
}

export function PlayerChip({
  signup,
  isCaptain,
  shift,
  compact,
  dragId,
  highlight,
}: PlayerChipProps) {
  const meta = TYPE_META[signup.troop_type]
  const id = dragId ?? `chip:${signup.id}:${shift}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { signupId: signup.id, shift },
  })
  const openNote = useOpenNote()
  const hasNote = Boolean(signup.planner_notes?.trim())

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group cursor-grab touch-none select-none rounded border border-zinc-800 border-l-4 bg-zinc-900 transition active:cursor-grabbing',
        meta.border,
        meta.bg,
        compact ? 'px-2 py-1' : 'px-3 py-2',
        isDragging && 'opacity-30',
        highlight && 'ring-2 ring-yellow-500',
      )}
      title={`${signup.ign} · ${signup.troop_type} · T${signup.tier} · Lair ${signup.max_solo_lair} · score ${Math.round(
        captainScore(signup),
      )}${hasNote ? `\n📝 ${signup.planner_notes}` : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <meta.Icon className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
          <span className="truncate text-sm font-medium text-zinc-100">{signup.ign}</span>
          <span className="font-mono text-[10px] text-zinc-500">[{signup.alliance_tag}]</span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5 text-[11px] text-zinc-400">
          {isCaptain && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
          {signup.willing_captain && !isCaptain && (
            <Crown className="h-3 w-3 text-zinc-600" />
          )}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              openNote(signup.id)
            }}
            className={cn(
              'rounded p-0.5 transition',
              hasNote
                ? 'text-amber-300 hover:bg-amber-500/20'
                : 'text-zinc-600 opacity-0 hover:bg-zinc-800 hover:text-zinc-300 group-hover:opacity-100',
            )}
            title={hasNote ? signup.planner_notes ?? '' : 'Notiz hinzufügen'}
          >
            <StickyNote className="h-3 w-3" />
          </button>
          <ScoreBadge score={captainScore(signup)} willing={signup.willing_captain} />
          <span className="font-mono">T{signup.tier}</span>
        </div>
      </div>
      {!compact && (
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
          <span>Lair {signup.max_solo_lair}</span>
          <span>·</span>
          <span>{formatRally(signup.rally_size)} rally</span>
          <span>·</span>
          <span className="font-mono">{signup.server}</span>
        </div>
      )}
    </div>
  )
}
