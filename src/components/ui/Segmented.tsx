import { cn } from '@/lib/cn'

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string; hint?: string }[]
  value: T | null
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 rounded border border-zinc-800 bg-zinc-900 p-1',
        className,
      )}
      role="radiogroup"
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            type="button"
            key={String(opt.value)}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded font-medium transition',
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active
                ? 'bg-yellow-500 text-zinc-950'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
            )}
            title={opt.hint}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
