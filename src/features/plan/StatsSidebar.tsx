import { Users, Crown, Activity } from 'lucide-react'
import type { ShiftNumber, Signup, TroopType } from '@/types/wk'
import { parseShiftPref } from '@/types/wk'

interface StatsSidebarProps {
  shift: ShiftNumber
  signups: Signup[]
}

const TYPE_COLOR: Record<TroopType, string> = {
  fighter: 'bg-red-500',
  shooter: 'bg-sky-500',
  rider: 'bg-emerald-500',
}

export function StatsSidebar({ shift, signups }: StatsSidebarProps) {
  const pool = signups.filter((s) => parseShiftPref(s.shift_pref).includes(shift))

  const total = pool.length
  const captains = pool.filter((s) => s.willing_captain).length
  const avgLair = total === 0 ? 0 : pool.reduce((sum, s) => sum + s.max_solo_lair, 0) / total

  const typeCount: Record<TroopType, number> = { fighter: 0, shooter: 0, rider: 0 }
  for (const s of pool) typeCount[s.troop_type]++
  const maxCount = Math.max(1, ...Object.values(typeCount))

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={Users} label="Spieler" value={total} />
        <Stat icon={Crown} label="Captains" value={captains} />
        <Stat icon={Activity} label="Ø Lair" value={avgLair.toFixed(1)} />
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Typen-Verteilung
        </h3>
        <div className="flex flex-col gap-1.5">
          {(['fighter', 'shooter', 'rider'] as TroopType[]).map((t) => (
            <div key={t} className="flex items-center gap-2 text-xs">
              <span className="w-14 capitalize text-zinc-400">{t}</span>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-zinc-900">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${TYPE_COLOR[t]} transition-all`}
                  style={{ width: `${(typeCount[t] / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right font-mono text-zinc-300">{typeCount[t]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string | number
}) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-center">
      <Icon className="mx-auto h-3.5 w-3.5 text-zinc-500" />
      <div className="mt-1 text-lg font-semibold text-zinc-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  )
}
