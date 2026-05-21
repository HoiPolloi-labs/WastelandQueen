import { cn } from '@/lib/cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
}

export function Toggle({ checked, onChange, label, hint }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-left hover:border-zinc-700"
      role="switch"
      aria-checked={checked}
    >
      <span>
        <span className="block text-sm font-medium text-zinc-100">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-zinc-400">{hint}</span>}
      </span>
      <span
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border transition',
          checked ? 'border-yellow-500 bg-yellow-500' : 'border-zinc-700 bg-zinc-800',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 inline-block h-4 w-4 transform rounded-full bg-zinc-50 transition',
            checked ? 'left-6' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}
