import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router'
import { ChevronDown, Calendar } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useEvents } from './use-events'

interface EventPickerProps {
  currentEventId: string
}

export function EventPicker({ currentEventId }: EventPickerProps) {
  const { events, loading } = useEvents()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onClick)
      return () => document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
      >
        <Calendar className="h-3.5 w-3.5" />
        Events
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-72 max-h-96 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl">
          {loading ? (
            <div className="px-3 py-4 text-center text-xs text-zinc-500">Lade…</div>
          ) : events.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-zinc-500">Keine Events.</div>
          ) : (
            <ul className="py-1">
              {events.map((e) => {
                const date = new Date(e.starts_at_utc).toLocaleDateString('de-DE')
                const active = e.id === currentEventId
                return (
                  <li key={e.id}>
                    <Link
                      to={`/plan/${e.id}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-2 text-xs transition',
                        active
                          ? 'bg-yellow-500/10 text-yellow-200'
                          : 'text-zinc-300 hover:bg-zinc-800',
                      )}
                    >
                      <span className="font-mono">{e.id}</span>
                      <span className="text-[10px] text-zinc-500">{date}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
