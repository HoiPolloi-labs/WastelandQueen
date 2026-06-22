import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Play, Pause, ChevronLeft, ChevronRight, RotateCcw, Wand2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { CAPACITY, colorOveruse, applyPour, type SortState, type Move } from './state'
import { solve, type SolveResult } from './solver'

const PALETTE = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
]
const MIN_COLORS = 2
const MAX_COLORS = PALETTE.length
const MIN_VIALS = 3
const MAX_VIALS = 14

const replay = (init: SortState, moves: Move[], upto: number): SortState =>
  moves.slice(0, upto).reduce((s, m) => applyPour(s, m.from, m.to), init)

export function SortingPage() {
  const { t } = useTranslation()
  const [colorCount, setColorCount] = useState(4)
  const [vialCount, setVialCount] = useState(6)
  const [board, setBoard] = useState<SortState>(() =>
    Array.from({ length: 6 }, () => []),
  )
  const [paint, setPaint] = useState(0)
  const [result, setResult] = useState<SolveResult | null>(null)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  const overuse = useMemo(() => colorOveruse(board, colorCount), [board, colorCount])
  const solvedMoves = result?.status === 'solved' ? result.moves : null
  const displayed = solvedMoves ? replay(board, solvedMoves, step) : board
  const currentMove = solvedMoves && step > 0 ? solvedMoves[step - 1] : null

  // auto-play
  useEffect(() => {
    if (!playing || !solvedMoves) return
    if (step >= solvedMoves.length) {
      setPlaying(false)
      return
    }
    const id = setTimeout(() => setStep((s) => s + 1), 650)
    return () => clearTimeout(id)
  }, [playing, step, solvedMoves])

  const resetSolution = () => {
    setResult(null)
    setStep(0)
    setPlaying(false)
  }

  const setVials = (n: number) => {
    const clamped = Math.max(MIN_VIALS, Math.min(MAX_VIALS, n))
    setVialCount(clamped)
    setBoard((prev) => {
      const next = prev.slice(0, clamped)
      while (next.length < clamped) next.push([])
      return next
    })
    resetSolution()
  }

  const setColors = (n: number) => {
    const clamped = Math.max(MIN_COLORS, Math.min(MAX_COLORS, n))
    setColorCount(clamped)
    if (paint >= clamped) setPaint(clamped - 1)
    // drop any painted cells that reference now-removed colours
    setBoard((prev) => prev.map((v) => v.filter((c) => c < clamped)))
    resetSolution()
  }

  const addToVial = (i: number) => {
    setBoard((prev) => {
      if (prev[i]!.length >= CAPACITY) return prev
      const next = prev.map((v) => v.slice())
      next[i]!.push(paint)
      return next
    })
    resetSolution()
  }
  const popVial = (i: number) => {
    setBoard((prev) => {
      const next = prev.map((v) => v.slice())
      next[i]!.pop()
      return next
    })
    resetSolution()
  }
  const clearBoard = () => {
    setBoard(Array.from({ length: vialCount }, () => []))
    resetSolution()
  }

  const runSolve = () => {
    setStep(0)
    setPlaying(false)
    setResult(solve(board))
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('tools.sorting.title')} subtitle={t('tools.sorting.subtitle')}>
        <Link to="/tools">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('tools.back')}
          </Button>
        </Link>
      </PageHeader>

      {/* steppers */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <Stepper label={t('tools.sorting.colors_label')} value={colorCount} onDec={() => setColors(colorCount - 1)} onInc={() => setColors(colorCount + 1)} />
        <Stepper label={t('tools.sorting.vials_label')} value={vialCount} onDec={() => setVials(vialCount - 1)} onInc={() => setVials(vialCount + 1)} />
      </div>

      {/* palette */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-400">{t('tools.sorting.paint_label')}</span>
        {Array.from({ length: colorCount }, (_, c) => (
          <button
            key={c}
            type="button"
            onClick={() => setPaint(c)}
            aria-label={`colour ${c + 1}`}
            className={cn(
              'h-6 w-6 rounded border-2 transition',
              paint === c ? 'border-zinc-100 scale-110' : 'border-zinc-700',
            )}
            style={{ backgroundColor: PALETTE[c] }}
          />
        ))}
      </div>

      <p className="mb-3 text-[11px] text-zinc-400">{t('tools.sorting.edit_hint')}</p>

      {/* board */}
      <div className="mb-4 flex flex-wrap gap-3">
        {displayed.map((vial, i) => {
          const highlight =
            currentMove && (currentMove.from === i || currentMove.to === i)
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => !solvedMoves && addToVial(i)}
                disabled={!!solvedMoves}
                className={cn(
                  'flex h-32 w-9 flex-col-reverse overflow-hidden rounded-b-md rounded-t border-2 bg-zinc-950 transition',
                  highlight
                    ? currentMove!.from === i
                      ? 'border-red-400'
                      : 'border-emerald-400'
                    : 'border-zinc-700',
                  !solvedMoves && 'hover:border-yellow-500 cursor-pointer',
                )}
              >
                {Array.from({ length: CAPACITY }, (_, slot) => {
                  const color = vial[slot]
                  return (
                    <div
                      key={slot}
                      className="h-1/4 w-full border-t border-zinc-950"
                      style={{ backgroundColor: color != null ? PALETTE[color] : 'transparent' }}
                    />
                  )
                })}
              </button>
              {!solvedMoves && (
                <button
                  type="button"
                  onClick={() => popVial(i)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-200"
                  aria-label={t('tools.sorting.remove')}
                >
                  −
                </button>
              )}
            </div>
          )
        })}
      </div>

      {overuse.length > 0 && (
        <p className="mb-3 rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
          {t('tools.sorting.overuse_error', { colors: overuse.map((c) => c + 1).join(', ') })}
        </p>
      )}

      {/* actions */}
      <div className="flex flex-wrap gap-2">
        {!solvedMoves ? (
          <>
            <Button variant="primary" size="sm" onClick={runSolve} disabled={overuse.length > 0}>
              <Wand2 className="h-3.5 w-3.5" />
              {t('tools.sorting.solve')}
            </Button>
            <Button variant="ghost" size="sm" onClick={clearBoard}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t('tools.sorting.clear')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPlaying((p) => !p)} disabled={step >= solvedMoves.length}>
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.min(solvedMoves.length, s + 1))} disabled={step >= solvedMoves.length}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="secondary" size="sm" onClick={resetSolution}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t('tools.sorting.edit')}
            </Button>
          </>
        )}
      </div>

      {/* result line */}
      {result?.status === 'solved' && (
        <p className="mt-3 text-sm text-zinc-300">
          {t('tools.sorting.solved', { count: result.moves.length })} ·{' '}
          <span className="font-mono text-zinc-400">
            {t('tools.sorting.step', { n: step, total: result.moves.length })}
          </span>
          {currentMove && (
            <span className="ml-2 text-zinc-400">
              {t('tools.sorting.move_desc', { from: currentMove.from + 1, to: currentMove.to + 1 })}
            </span>
          )}
        </p>
      )}
      {result?.status === 'unsolvable' && (
        <p className="mt-3 text-sm text-red-300">{t('tools.sorting.unsolvable')}</p>
      )}
      {result?.status === 'too_complex' && (
        <p className="mt-3 text-sm text-amber-300">{t('tools.sorting.too_complex')}</p>
      )}
    </div>
  )
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
}: {
  label: string
  value: number
  onDec: () => void
  onInc: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-400">{label}</span>
      <button type="button" onClick={onDec} className="h-6 w-6 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">−</button>
      <span className="w-6 text-center font-mono text-zinc-100">{value}</span>
      <button type="button" onClick={onInc} className="h-6 w-6 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">+</button>
    </div>
  )
}
