import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { KILL_POINTS, DEATH_POINTS, type TroopTier } from '@/types/wk'

type Kind = 'kill' | 'death'

interface PointCalcModalProps {
  kind: Kind
  /** Existing aggregate, shown for context. The modal computes the new total
   *  from per-tier counts and writes it via onApply — no addition, full
   *  replace. */
  current: number
  /** IGN of the player being scored, shown in the modal title for context. */
  ign: string
  onApply: (total: number) => void
  onClose: () => void
}

const TIERS: TroopTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

/**
 * Per-tier kill/death calculator. The game's post-event summary only shows
 * AGGREGATE totals, but some players screenshot the per-tier breakdown from
 * their personal kill/death log. This modal lets the planner enter those
 * counts row-by-row and writes the computed total back into the score
 * column. Manual editing of the column still works directly.
 *
 *   T1 × 12 = 0    (0 pts/T1 kill)
 *   T10 × 5 = 300  (60 pts/T10 kill)
 *   ...           sum → click Apply
 */
export function PointCalcModal({ kind, current, ign, onApply, onClose }: PointCalcModalProps) {
  const { t } = useTranslation()
  const table = kind === 'kill' ? KILL_POINTS : DEATH_POINTS
  const [counts, setCounts] = useState<Record<TroopTier, string>>(
    () => Object.fromEntries(TIERS.map((tier) => [tier, ''])) as Record<TroopTier, string>,
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const total = useMemo(() => {
    let sum = 0
    for (const tier of TIERS) {
      const n = Number(counts[tier])
      if (Number.isFinite(n) && n > 0) sum += n * table[tier]
    }
    return Math.round(sum)
  }, [counts, table])

  const titleKey = kind === 'kill' ? 'awards.calc_kill_title' : 'awards.calc_death_title'
  const headerKey = kind === 'kill' ? 'awards.calc_kill_header' : 'awards.calc_death_header'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              {t(titleKey, { ign })}
            </h2>
            <p className="text-xs text-zinc-400">{t(headerKey)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <label
              key={tier}
              className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs"
            >
              <span className="w-8 flex-shrink-0 font-mono text-zinc-400">T{tier}</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={counts[tier]}
                onChange={(e) =>
                  setCounts((cur) => ({ ...cur, [tier]: e.target.value }))
                }
                className="w-full px-1 py-0 text-right font-mono text-xs"
              />
              <span className="w-8 flex-shrink-0 text-right font-mono text-[10px] text-zinc-500">
                ×{table[tier]}
              </span>
            </label>
          ))}
        </div>

        <div className="mb-3 flex items-baseline justify-between rounded border border-zinc-800 bg-zinc-900 px-3 py-2">
          <span className="text-xs text-zinc-400">{t('awards.calc_total_label')}</span>
          <span className="font-mono text-lg font-semibold text-yellow-300">
            {total.toLocaleString()}
          </span>
        </div>

        {current > 0 && (
          <p className="mb-3 text-[11px] text-zinc-500">
            {t('awards.calc_current', { current: current.toLocaleString() })}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onApply(total)
              onClose()
            }}
            disabled={total === 0}
          >
            {t('awards.calc_apply')}
          </Button>
        </div>
      </div>
    </div>
  )
}
