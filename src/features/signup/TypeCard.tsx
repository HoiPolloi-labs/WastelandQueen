import { Swords, Crosshair, Zap } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { TroopType } from '@/types/wk'

const TYPES: { value: TroopType; label: string; Icon: typeof Swords; tone: string }[] = [
  { value: 'fighter', label: 'Fighter', Icon: Swords, tone: 'from-red-600 to-red-700 border-red-500' },
  { value: 'shooter', label: 'Shooter', Icon: Crosshair, tone: 'from-sky-600 to-sky-700 border-sky-500' },
  { value: 'rider', label: 'Rider', Icon: Zap, tone: 'from-emerald-600 to-emerald-700 border-emerald-500' },
]

interface TypeCardProps {
  value: TroopType | null
  onChange: (t: TroopType) => void
}

export function TypeCard({ value, onChange }: TypeCardProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TYPES.map(({ value: v, label, Icon, tone }) => {
        const active = value === v
        return (
          <button
            type="button"
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border p-4 transition',
              active
                ? `bg-gradient-to-b ${tone} text-zinc-50 shadow-lg`
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
            )}
          >
            <Icon className="h-7 w-7" />
            <span className="text-sm font-semibold">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
