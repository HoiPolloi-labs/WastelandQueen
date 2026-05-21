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
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [serverFilter, setServerFilter] = useState<string | null>(null)

  const assignedIds = useMemo(() => {
    const set = new Set<string>()
    for (const a of assignments) {
      if (a.shift !== shift) continue
      if (a.building === 'unassigned') continue
      set.add(a.signup_id)
    }
    return set
  }, [assignments, shift])

  const allianceTags = useMemo(() => {
    const tags = new Set<string>()
    for (const s of signups) tags.add(s.alliance_tag)
    return [...tags].sort()
  }, [signups])

  const servers = useMemo(() => {
    const out = new Set<string>()
    for (const s of signups) out.add(s.server)
    return [...out].sort()
  }, [signups])

  const unassigned = useMemo(() => {
    const matchesShift = (s: Signup) => parseShiftPref(s.shift_pref).includes(shift)
    const q = query.trim().toLowerCase()
    return signups
      .filter(matchesShift)
      .filter((s) => !assignedIds.has(s.id))
      .filter((s) => filter === 'all' || s.troop_type === filter)
      .filter((s) => !tagFilter || s.alliance_tag === tagFilter)
      .filter((s) => !serverFilter || s.server === serverFilter)
      .filter(
        (s) =>
          !q ||
          s.ign.toLowerCase().includes(q) ||
          s.alliance_tag.toLowerCase().includes(q),
      )
  }, [signups, assignedIds, shift, query, filter, tagFilter, serverFilter])

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
        <span className="text-zinc-400">{unassigned.length}</span>
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
      {allianceTags.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className={cn(
              'rounded border px-1.5 py-0.5 font-mono text-[10px] transition',
              tagFilter === null
                ? 'border-yellow-500/60 bg-yellow-500/15 text-yellow-200'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100',
            )}
          >
            ALL
          </button>
          {allianceTags.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTagFilter(t === tagFilter ? null : t)}
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono text-[10px] transition',
                tagFilter === t
                  ? 'border-yellow-500/60 bg-yellow-500/15 text-yellow-200'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {servers.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {servers.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setServerFilter(s === serverFilter ? null : s)}
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono text-[10px] transition',
                serverFilter === s
                  ? 'border-sky-500/60 bg-sky-500/15 text-sky-200'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
        {unassigned.length === 0 && (
          <div className="mt-6 text-center text-xs italic text-zinc-400">
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
