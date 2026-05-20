import { useDroppable } from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import type { Assignment, ShiftNumber, Signup, TroopType } from '@/types/wk'
import { parseShiftPref } from '@/types/wk'
import { PlayerChip } from './PlayerChip'

interface UnassignedPoolProps {
  shift: ShiftNumber
  signups: Signup[]
  assignments: Assignment[]
}

type Filter = 'all' | TroopType

export function UnassignedPool({ shift, signups, assignments }: UnassignedPoolProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const assignedIds = useMemo(() => {
    const set = new Set<string>()
    for (const a of assignments) {
      if (a.shift !== shift) continue
      if (a.building === 'unassigned') continue
      set.add(a.signup_id)
    }
    return set
  }, [assignments, shift])

  const unassigned = useMemo(() => {
    const matchesShift = (s: Signup) => parseShiftPref(s.shift_pref).includes(shift)
    const q = query.trim().toLowerCase()
    return signups
      .filter(matchesShift)
      .filter((s) => !assignedIds.has(s.id))
      .filter((s) => filter === 'all' || s.troop_type === filter)
      .filter(
        (s) =>
          !q ||
          s.ign.toLowerCase().includes(q) ||
          s.alliance_tag.toLowerCase().includes(q),
      )
  }, [signups, assignedIds, shift, query, filter])

  const { setNodeRef, isOver } = useDroppable({
    id: `drop:unassigned:${shift}`,
    data: { building: 'unassigned' as const, shift },
  })

  return (
    <aside
      ref={setNodeRef}
      className={cn(
        'flex h-full flex-col rounded-lg border bg-zinc-900/40 p-3 transition',
        isOver ? 'border-yellow-500 bg-yellow-500/5' : 'border-zinc-800',
      )}
    >
      <h2 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <span>Unassigned · Shift {shift}</span>
        <span className="text-zinc-500">{unassigned.length}</span>
      </h2>
      <div className="mb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <Input
            placeholder="Suche IGN/Tag"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-7 text-xs"
          />
        </div>
      </div>
      <Segmented
        size="sm"
        className="mb-2 text-xs"
        options={[
          { value: 'all', label: 'All' },
          { value: 'fighter', label: 'Fight' },
          { value: 'shooter', label: 'Shoot' },
          { value: 'rider', label: 'Ride' },
        ]}
        value={filter}
        onChange={(v: Filter) => setFilter(v)}
      />
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
        {unassigned.length === 0 && (
          <div className="mt-6 text-center text-xs italic text-zinc-600">
            Alle Spieler verteilt
          </div>
        )}
        {unassigned.map((s) => (
          <PlayerChip key={s.id} signup={s} shift={shift} />
        ))}
      </div>
    </aside>
  )
}
