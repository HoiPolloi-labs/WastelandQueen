import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, RotateCcw, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { CELLS, SIZE, LINES, emptyBoard, completedLines, type Revealed } from './board'
import { suggestBingo } from './solver'

const MIN_FLIPS = 1
const MAX_FLIPS = 16

export function BingoPage() {
  const { t } = useTranslation()
  const [board, setBoard] = useState<Revealed>(() => emptyBoard())
  const [flips, setFlips] = useState(8)

  const result = useMemo(() => suggestBingo(board, flips), [board, flips])

  // cells that belong to a currently-completed line (for the emerald tint)
  const completedCells = useMemo(() => {
    const set = new Set<number>()
    for (const idx of completedLines(board)) for (const c of LINES[idx]!) set.add(c)
    return set
  }, [board])

  const toggle = (i: number) =>
    setBoard((prev) => {
      const next = prev.slice()
      next[i] = !next[i]
      return next
    })

  const setFlipsClamped = (n: number) => setFlips(Math.max(MIN_FLIPS, Math.min(MAX_FLIPS, n)))

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('tools.bingo.title')} subtitle={t('tools.bingo.subtitle')}>
        <Link to="/tools">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('tools.back')}
          </Button>
        </Link>
      </PageHeader>

      {/* flips stepper */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="text-zinc-400">{t('tools.bingo.flips_label')}</span>
        <button
          type="button"
          onClick={() => setFlipsClamped(flips - 1)}
          className="h-6 w-6 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          −
        </button>
        <span className="w-6 text-center font-mono text-zinc-100">{flips}</span>
        <button
          type="button"
          onClick={() => setFlipsClamped(flips + 1)}
          className="h-6 w-6 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          +
        </button>
      </div>

      <p className="mb-3 text-[11px] text-zinc-400">{t('tools.bingo.tap_hint')}</p>

      {/* 5×5 grid */}
      <div
        className="mb-4 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`, maxWidth: 320 }}
      >
        {Array.from({ length: CELLS }, (_, i) => {
          const revealed = board[i]
          const isSuggestion = result.suggestion === i
          const inCompleted = completedCells.has(i)
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={revealed}
              className={cn(
                'relative flex aspect-square items-center justify-center rounded-md border-2 text-xs font-medium transition',
                revealed
                  ? inCompleted
                    ? 'border-emerald-500/70 bg-emerald-500/20 text-emerald-200'
                    : 'border-amber-500/60 bg-amber-500/15 text-amber-200'
                  : 'border-zinc-700 bg-zinc-900/60 text-zinc-600 hover:border-zinc-500',
                isSuggestion && 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-zinc-950 animate-pulse',
              )}
            >
              {isSuggestion && <Sparkles className="h-4 w-4 text-yellow-300" />}
            </button>
          )
        })}
      </div>

      {/* stats */}
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-zinc-300">
          {t('tools.bingo.completed')}: <span className="font-mono text-emerald-300">{result.completed}</span>
        </span>
        <span className="text-zinc-300">
          {t('tools.bingo.reachable')}: <span className="font-mono text-yellow-300">{result.reachable}</span>
        </span>
      </div>

      {/* suggestion */}
      {result.suggestion !== null ? (
        <p className="mb-3 rounded border border-yellow-600/40 bg-yellow-500/10 p-2 text-sm text-yellow-200">
          {t('tools.bingo.suggestion', { count: result.suggestionLines.length })}
        </p>
      ) : (
        <p className="mb-3 text-sm text-zinc-400">{t('tools.bingo.no_suggestion')}</p>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setBoard(emptyBoard())}>
          <RotateCcw className="h-3.5 w-3.5" />
          {t('tools.bingo.clear')}
        </Button>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">{t('tools.bingo.note')}</p>
    </div>
  )
}
