import { useDroppable } from '@dnd-kit/core'
import { ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ShiftNumber } from '@/types/wk'

interface OtherShiftDropzoneProps {
  currentShift: ShiftNumber
}

/**
 * Drop a chip here to move it to the other shift's unassigned pool.
 * Drag-and-drop alternative to the shift tabs (which only switch view).
 */
export function OtherShiftDropzone({ currentShift }: OtherShiftDropzoneProps) {
  const target: ShiftNumber = currentShift === 1 ? 2 : 1
  const { setNodeRef, isOver } = useDroppable({
    id: `drop:unassigned:${target}`,
    data: { building: 'unassigned' as const, shift: target },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-2 rounded border border-dashed px-3 py-1.5 text-xs transition',
        isOver
          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-200'
          : 'border-zinc-700 bg-zinc-900/60 text-zinc-400',
      )}
    >
      <ArrowLeftRight className="h-3.5 w-3.5" />
      <span>Hierhin ziehen → Shift {target}</span>
    </div>
  )
}
