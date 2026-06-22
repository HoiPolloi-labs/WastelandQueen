import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Wand2, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { cn } from '@/lib/cn'
import {
  SIZE,
  CELLS,
  BOX,
  TETROMINOES,
  emptyBoard,
  place,
  clearLines,
  idx,
  type Cell,
  type Board,
} from './board'
import { solveTetramino, type TetraminoResult } from './solver'

const MAX_PIECES = 3
// distinct fill colours for placement 1 / 2 / 3 in the step overlay
const STEP_COLORS = ['#3b82f6', '#a855f7', '#ec4899']

function bounds(cells: readonly Cell[]) {
  let maxR = 0
  let maxC = 0
  for (const [r, c] of cells) {
    if (r > maxR) maxR = r
    if (c > maxC) maxC = c
  }
  return { rows: maxR + 1, cols: maxC + 1 }
}

function ShapePreview({ cells, color = '#eab308' }: { cells: readonly Cell[]; color?: string }) {
  const { rows, cols } = bounds(cells)
  const set = new Set(cells.map(([r, c]) => r * cols + c))
  return (
    <div
      className="grid gap-px"
      style={{ gridTemplateColumns: `repeat(${cols}, 8px)`, gridTemplateRows: `repeat(${rows}, 8px)` }}
    >
      {Array.from({ length: rows * cols }, (_, i) => (
        <div
          key={i}
          className="h-2 w-2 rounded-[1px]"
          style={{ backgroundColor: set.has(i) ? color : 'transparent' }}
        />
      ))}
    </div>
  )
}

export function TetraminoPage() {
  const { t } = useTranslation()
  const [board, setBoard] = useState<Board>(() => emptyBoard())
  const [selected, setSelected] = useState<number[]>([])
  const [boxes, setBoxes] = useState(false)
  const [allowRotation, setAllowRotation] = useState(true)
  const [result, setResult] = useState<TetraminoResult | null>(null)
  const [step, setStep] = useState(0)

  const placements = useMemo(() => result?.placements ?? [], [result])
  const solved = result !== null

  // Board state after applying the first `step` placements (with clears).
  const boardAt = useMemo(() => {
    if (!result) return board
    let b = board
    for (let i = 0; i < step; i++) {
      const p = placements[i]!
      b = place(b, p.cells, p.atR, p.atC)
      b = clearLines(b, boxes).board
    }
    return b
  }, [result, step, board, boxes, placements])

  // Cells the NEXT piece (placements[step]) will occupy — highlighted on boardAt.
  const highlight = useMemo(() => {
    if (!solved || step >= placements.length) return null
    const p = placements[step]!
    return new Set(p.cells.map(([r, c]) => idx(p.atR + r, p.atC + c)))
  }, [solved, step, placements])

  const toggleCell = (i: number) =>
    setBoard((prev) => {
      const next = prev.slice()
      next[i] = !next[i]
      return next
    })

  const addPiece = (pieceIdx: number) =>
    setSelected((prev) => (prev.length >= MAX_PIECES ? prev : [...prev, pieceIdx]))
  const removePiece = (slot: number) => setSelected((prev) => prev.filter((_, i) => i !== slot))

  const runSolve = () => {
    setResult(solveTetramino(board, selected.map((i) => TETROMINOES[i]!), { boxes, allowRotation }))
    setStep(0)
  }
  const backToEdit = () => setResult(null)
  const clearAll = () => {
    setBoard(emptyBoard())
    setSelected([])
    setResult(null)
  }

  const display = solved ? boardAt : board
  const nextPiece = solved && step < placements.length ? placements[step]! : null

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('tools.tetramino.title')} subtitle={t('tools.tetramino.subtitle')}>
        <Link to="/tools">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('tools.back')}
          </Button>
        </Link>
      </PageHeader>

      {/* options */}
      <div className="mb-3 space-y-2">
        <Toggle
          checked={boxes}
          onChange={() => { setBoxes((v) => !v); setResult(null) }}
          label={t('tools.tetramino.boxes_label')}
        />
        <Toggle
          checked={allowRotation}
          onChange={() => { setAllowRotation((v) => !v); setResult(null) }}
          label={t('tools.tetramino.rotation_label')}
        />
      </div>

      {/* piece picker (edit mode only) */}
      {!solved && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs text-zinc-400">
            {t('tools.tetramino.pieces_label', { n: selected.length, max: MAX_PIECES })}
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            {TETROMINOES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addPiece(i)}
                disabled={selected.length >= MAX_PIECES}
                className={cn(
                  'flex items-center justify-center rounded border border-zinc-700 bg-zinc-900/60 p-1.5 transition',
                  selected.length >= MAX_PIECES
                    ? 'opacity-40'
                    : 'hover:border-yellow-500 cursor-pointer',
                )}
                aria-label={`add ${s.id}`}
              >
                <ShapePreview cells={s.cells} />
              </button>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((pieceIdx, slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => removePiece(slot)}
                  className="flex items-center gap-1 rounded border border-yellow-600/50 bg-yellow-500/10 p-1.5 hover:border-red-500/60"
                  aria-label={`remove piece ${slot + 1}`}
                >
                  <ShapePreview cells={TETROMINOES[pieceIdx]!.cells} color={STEP_COLORS[slot] ?? '#eab308'} />
                  <X className="h-3 w-3 text-zinc-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mb-2 text-[11px] text-zinc-400">
        {solved ? t('tools.tetramino.step_hint') : t('tools.tetramino.edit_hint')}
      </p>

      {/* 9×9 board */}
      <div
        className="mb-4 grid gap-px rounded bg-zinc-800 p-1"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`, maxWidth: 360 }}
      >
        {Array.from({ length: CELLS }, (_, i) => {
          const filled = display[i]
          const isNext = highlight?.has(i)
          // subtle 3×3 box shading so the box-clear rule is legible
          const r = Math.floor(i / SIZE)
          const c = i % SIZE
          const boxShade = (Math.floor(r / BOX) + Math.floor(c / BOX)) % 2 === 0
          return (
            <button
              key={i}
              type="button"
              onClick={() => !solved && toggleCell(i)}
              disabled={solved}
              className={cn(
                'aspect-square rounded-[2px] transition',
                isNext
                  ? 'ring-1 ring-yellow-300'
                  : filled
                    ? 'bg-amber-400/80'
                    : boxShade
                      ? 'bg-zinc-900'
                      : 'bg-zinc-900/50',
                !solved && !filled && 'hover:bg-zinc-700',
              )}
              style={isNext && nextPiece ? { backgroundColor: STEP_COLORS[step] ?? '#eab308' } : undefined}
            />
          )
        })}
      </div>

      {/* actions */}
      {!solved ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={runSolve} disabled={selected.length === 0}>
            <Wand2 className="h-3.5 w-3.5" />
            {t('tools.tetramino.solve')}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <RotateCcw className="h-3.5 w-3.5" />
            {t('tools.tetramino.clear')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.min(placements.length, s + 1))}
            disabled={step >= placements.length}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="secondary" size="sm" onClick={backToEdit}>
            <RotateCcw className="h-3.5 w-3.5" />
            {t('tools.tetramino.edit')}
          </Button>
        </div>
      )}

      {/* result */}
      {solved && result.status === 'ok' && (
        <p className="mt-3 text-sm text-zinc-300">
          {t('tools.tetramino.result', { placed: placements.length, cleared: result.totalCleared })}
          {nextPiece && (
            <span className="ml-2 text-zinc-400">
              {t('tools.tetramino.place_next', {
                piece: nextPiece.shapeId,
                row: nextPiece.atR + 1,
                col: nextPiece.atC + 1,
              })}
            </span>
          )}
        </p>
      )}
      {solved && result.status === 'none' && (
        <p className="mt-3 text-sm text-red-300">{t('tools.tetramino.no_fit')}</p>
      )}
    </div>
  )
}
