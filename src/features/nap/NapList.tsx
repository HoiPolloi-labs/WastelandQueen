import { useState } from 'react'
import { Pencil, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import type { NapStatus, NapTerm } from '@/types/wk'

const STATUSES: NapStatus[] = ['proposed', 'agreed', 'broken', 'expired']

const STATUS_TONE: Record<NapStatus, string> = {
  proposed: 'border-zinc-600 bg-zinc-800 text-zinc-300',
  agreed: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
  broken: 'border-red-500/50 bg-red-500/10 text-red-300',
  expired: 'border-zinc-700 bg-zinc-900 text-zinc-500',
}

interface NapListProps {
  terms: NapTerm[]
  onEdit?: (id: string, patch: { with_state: string; terms: string }) => Promise<void> | void
  onDelete?: (id: string) => Promise<void> | void
  onStatusChange?: (id: string, status: NapStatus) => Promise<void> | void
  empty?: React.ReactNode
}

export function NapList({ terms, onEdit, onDelete, onStatusChange, empty }: NapListProps) {
  const interactive = Boolean(onEdit || onDelete || onStatusChange)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (terms.length === 0) {
    return (
      <div className="rounded border border-dashed border-zinc-800 bg-zinc-900/40 px-3 py-4 text-center text-xs text-zinc-500">
        {empty ?? 'Keine NAP-Terms erfasst.'}
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {terms.map((t) => {
        if (interactive && editingId === t.id && onEdit) {
          return (
            <NapEditForm
              key={t.id}
              initial={{ with_state: t.with_state, terms: t.terms }}
              onCancel={() => setEditingId(null)}
              onSave={async (patch) => {
                await onEdit(t.id, patch)
                setEditingId(null)
              }}
            />
          )
        }
        return (
          <li
            key={t.id}
            className="rounded border border-zinc-800 bg-zinc-900/60 p-2.5 text-xs"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-zinc-100">vs {t.with_state}</span>
                <span
                  className={cn(
                    'rounded border px-1.5 py-px text-[10px] uppercase tracking-wider',
                    STATUS_TONE[t.status],
                  )}
                >
                  {t.status}
                  {t.status === 'agreed' && (
                    <Check className="ml-0.5 -mt-px inline h-2.5 w-2.5" />
                  )}
                </span>
              </div>
              {interactive && (
                <div className="flex gap-1 text-zinc-500">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => setEditingId(t.id)}
                      className="rounded p-1 hover:bg-zinc-800 hover:text-zinc-100"
                      title="Bearbeiten"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`NAP vs ${t.with_state} löschen?`)) void onDelete(t.id)
                      }}
                      className="rounded p-1 hover:bg-red-500/20 hover:text-red-300"
                      title="Löschen"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words text-zinc-300">{t.terms}</p>
            {onStatusChange && (
              <div className="mt-2 flex flex-wrap gap-1">
                {STATUSES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => {
                      if (s !== t.status) void onStatusChange(t.id, s)
                    }}
                    className={cn(
                      'rounded border px-1.5 py-px text-[10px] uppercase tracking-wider transition',
                      s === t.status
                        ? STATUS_TONE[s]
                        : 'border-zinc-800 bg-zinc-900 text-zinc-600 hover:border-zinc-700 hover:text-zinc-300',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

interface NapEditFormProps {
  initial: { with_state: string; terms: string }
  onSave: (patch: { with_state: string; terms: string }) => Promise<void> | void
  onCancel: () => void
}

function NapEditForm({ initial, onSave, onCancel }: NapEditFormProps) {
  const [withState, setWithState] = useState(initial.with_state)
  const [text, setText] = useState(initial.terms)

  return (
    <li className="flex flex-col gap-2 rounded border border-yellow-500/40 bg-zinc-900/60 p-2.5">
      <Input
        label="vs State"
        value={withState}
        onChange={(e) => setWithState(e.target.value.toUpperCase())}
        className="font-mono text-xs uppercase"
        placeholder="S850"
      />
      <Textarea
        label="Terms"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="No T11+ marches into Hub, mud-sit RSS allowed both sides…"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            const ws = withState.trim().toUpperCase()
            const tx = text.trim()
            if (!ws || !tx) return
            void onSave({ with_state: ws, terms: tx })
          }}
        >
          Speichern
        </Button>
      </div>
    </li>
  )
}
