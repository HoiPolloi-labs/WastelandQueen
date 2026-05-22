import { useMemo, useState } from 'react'
import { ClipboardCheck, FileText, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import type { Signup, ChecklistKey } from '@/types/wk'
import { computePreEventGaps, formatPreEventReminder } from './preevent-status'

interface PreEventStatusPanelProps {
  signups: Signup[]
}

const ITEM_DOT_LABEL: Record<ChecklistKey, string> = {
  taxis: 'T',
  speedups: 'S',
  heroes: 'H',
  shield: 'D',
}

const ITEM_TOOLTIP: Record<ChecklistKey, string> = {
  taxis: 'T1 taxis in infirmary',
  speedups: 'Speedups + resources for Fast Comeback',
  heroes: 'Heroes equipped + leveled',
  shield: '3-day shield active (mud-sitter)',
}

/**
 * Per-signup view of pre-event readiness. Each gap row shows the player name
 * and which items are still missing. "Copy reminder" puts a paste-friendly
 * block on the clipboard for in-game chat.
 *
 * Stays in the planner sidebar — only the planner sees this. Players see
 * the checklist on their own signup form.
 */
export function PreEventStatusPanel({ signups }: PreEventStatusPanelProps) {
  const gaps = useMemo(() => computePreEventGaps(signups), [signups])
  const [copied, setCopied] = useState(false)

  const copyReminder = async () => {
    await navigator.clipboard.writeText(formatPreEventReminder(gaps)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const ready = signups.length - gaps.length

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <ClipboardCheck className="h-3.5 w-3.5" />
          Pre-Event
        </h3>
        <span className="text-[10px]">
          <span className="text-emerald-300">{ready}</span>
          <span className="text-zinc-500"> / {signups.length} ready</span>
        </span>
      </header>

      {gaps.length === 0 ? (
        <p className="text-[11px] text-emerald-300">All players have everything ticked ✓</p>
      ) : (
        <>
          <ul className="mb-2 max-h-48 overflow-y-auto text-[11px]">
            {gaps.map((g) => (
              <li
                key={g.signup.id}
                className="flex items-center justify-between gap-2 border-b border-zinc-800/40 py-1 last:border-b-0"
              >
                <span className="truncate font-mono text-zinc-200">
                  {g.signup.ign}
                  <span className="ml-1 text-zinc-500">[{g.signup.alliance_tag}]</span>
                </span>
                <span className="flex flex-shrink-0 gap-0.5">
                  {(['taxis', 'speedups', 'heroes', 'shield'] as ChecklistKey[]).map((k) => {
                    const missing = g.missing.includes(k)
                    return (
                      <span
                        key={k}
                        title={`${ITEM_TOOLTIP[k]} — ${missing ? 'missing' : 'done'}`}
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border text-[9px] font-bold',
                          missing
                            ? 'border-red-500/60 bg-red-500/10 text-red-300'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
                        )}
                      >
                        {ITEM_DOT_LABEL[k]}
                      </span>
                    )
                  })}
                </span>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyReminder}
            title="Copy reminder text for in-game chat"
            className="w-full justify-center"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-300" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            Copy reminder
          </Button>
        </>
      )}
    </section>
  )
}
