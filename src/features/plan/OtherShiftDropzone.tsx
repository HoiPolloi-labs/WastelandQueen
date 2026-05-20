import { useDroppable } from '@dnd-kit/core'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ShiftNumber } from '@/types/wk'

interface OtherShiftDropzoneProps {
  currentShift: ShiftNumber
  shiftCount: number
}

interface SingleProps {
  target: ShiftNumber
}

function SingleZone({ target }: SingleProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop:unassigned:${target}`,
    data: { building: 'unassigned' as const, shift: target },
  })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-1.5 rounded border border-dashed px-2.5 py-1 text-xs transition',
        isOver
          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-200'
          : 'border-zinc-700 bg-zinc-900/60 text-zinc-400',
      )}
    >
      <ArrowRight className="h-3 w-3" />
      <span>Shift {target}</span>
    </div>
  )
}

/**
 * Drop a chip on one of these targets to move it to that shift's unassigned pool.
 */
export function OtherShiftDropzone({ currentShift, shiftCount }: OtherShiftDropzoneProps) {
  const targets = Array.from({ length: shiftCount }, (_, i) => (i + 1) as ShiftNumber).filter(
    (n) => n !== currentShift,
  )
  if (targets.length === 0) return null

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-zinc-600">Verschieben:</span>
      <div className="flex flex-wrap gap-1">
        {targets.map((t) => (
          <SingleZone key={t} target={t} />
        ))}
      </div>
    </div>
  )
}
