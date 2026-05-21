import { useMemo } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Activity } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Assignment, EventConfig, ShiftNumber, Signup } from '@/types/wk'
import { healthCheck, type HealthLevel } from './health-check'

interface HealthCheckPanelProps {
  signups: Signup[]
  assignments: Assignment[]
  event: EventConfig
  shift: ShiftNumber
}

const LEVEL_TONE: Record<HealthLevel, string> = {
  ok: 'text-emerald-300',
  warn: 'text-yellow-300',
  error: 'text-red-300',
  info: 'text-zinc-400',
}

const LEVEL_ICON: Record<HealthLevel, typeof CheckCircle2> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  error: AlertCircle,
  info: Info,
}

export function HealthCheckPanel({
  signups,
  assignments,
  event,
  shift,
}: HealthCheckPanelProps) {
  const items = useMemo(
    () => healthCheck(signups, assignments, event, shift),
    [signups, assignments, event, shift],
  )

  const errorCount = items.filter((i) => i.level === 'error').length
  const warnCount = items.filter((i) => i.level === 'warn').length

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Activity className="h-3.5 w-3.5" />
          Health
        </h3>
        <span className="text-[10px] text-zinc-400">
          {errorCount > 0 && (
            <span className="mr-1.5 text-red-300">{errorCount} err</span>
          )}
          {warnCount > 0 && (
            <span className="text-yellow-300">{warnCount} warn</span>
          )}
          {errorCount === 0 && warnCount === 0 && (
            <span className="text-emerald-300">all green</span>
          )}
        </span>
      </header>

      <ul className="flex flex-col gap-1.5 text-xs">
        {items.map((item, i) => {
          const Icon = LEVEL_ICON[item.level]
          return (
            <li
              key={i}
              className="flex items-start gap-1.5"
              title={item.detail}
            >
              <Icon className={cn('mt-0.5 h-3 w-3 flex-shrink-0', LEVEL_TONE[item.level])} />
              <span className={cn('leading-tight', LEVEL_TONE[item.level])}>{item.label}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
