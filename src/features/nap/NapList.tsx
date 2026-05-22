import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import type { NapStatus, NapTerm } from '@/types/wk'

const STATUSES: NapStatus[] = ['proposed', 'agreed', 'broken', 'expired']

const STATUS_TONE: Record<NapStatus, string> = {
  proposed: 'border-zinc-600 bg-zinc-800 text-zinc-100',
  agreed: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
  broken: 'border-red-500/50 bg-red-500/10 text-red-300',
  expired: 'border-zinc-700 bg-zinc-900 text-zinc-400',
}

interface NapEditPatch {
  with_state: string
  terms: string
  starts_at_utc: string | null
  ends_at_utc: string | null
}

interface NapListProps {
  terms: NapTerm[]
  onEdit?: (id: string, patch: NapEditPatch) => Promise<void> | void
  onDelete?: (id: string) => Promise<void> | void
  onStatusChange?: (id: string, status: NapStatus) => Promise<void> | void
  empty?: React.ReactNode
}

export function NapList({ terms, onEdit, onDelete, onStatusChange, empty }: NapListProps) {
  const { t: tr } = useTranslation()
  const interactive = Boolean(onEdit || onDelete || onStatusChange)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (terms.length === 0) {
    return (
      <div className="rounded border border-dashed border-zinc-800 bg-zinc-900/40 px-3 py-4 text-center text-xs text-zinc-400">
        {empty ?? tr('nap.no_terms_default')}
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {terms.map((term) => {
        if (interactive && editingId === term.id && onEdit) {
          return (
            <NapEditForm
              key={term.id}
              initial={{
                with_state: term.with_state,
                terms: term.terms,
                starts_at_utc: term.starts_at_utc,
                ends_at_utc: term.ends_at_utc,
              }}
              onCancel={() => setEditingId(null)}
              onSave={async (patch) => {
                await onEdit(term.id, patch)
                setEditingId(null)
              }}
            />
          )
        }
        const window = formatNapWindow(term.starts_at_utc, term.ends_at_utc)
        return (
          <li
            key={term.id}
            className="rounded border border-zinc-800 bg-zinc-900/60 p-2.5 text-xs"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-zinc-100">vs {term.with_state}</span>
                <span
                  className={cn(
                    'rounded border px-1.5 py-px text-[10px] uppercase tracking-wider',
                    STATUS_TONE[term.status],
                  )}
                >
                  {term.status}
                  {term.status === 'agreed' && (
                    <Check className="ml-0.5 -mt-px inline h-2.5 w-2.5" />
                  )}
                </span>
              </div>
              {interactive && (
                <div className="flex gap-1 text-zinc-500">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => setEditingId(term.id)}
                      className="rounded p-1 hover:bg-zinc-800 hover:text-zinc-100"
                      title={tr('common.edit')}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(tr('nap.confirm_delete', { state: term.with_state }))) void onDelete(term.id)
                      }}
                      className="rounded p-1 hover:bg-red-500/20 hover:text-red-300"
                      title={tr('common.delete')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words text-zinc-300">{term.terms}</p>
            {window && (
              <p className="mt-1.5 font-mono text-[10px] text-zinc-400">{window}</p>
            )}
            {onStatusChange && (
              <div className="mt-2 flex flex-wrap gap-1">
                {STATUSES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => {
                      if (s !== term.status) void onStatusChange(term.id, s)
                    }}
                    className={cn(
                      'rounded border px-1.5 py-px text-[10px] uppercase tracking-wider transition',
                      s === term.status
                        ? STATUS_TONE[s]
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100',
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
  initial: {
    with_state: string
    terms: string
    starts_at_utc: string | null
    ends_at_utc: string | null
  }
  onSave: (patch: NapEditPatch) => Promise<void> | void
  onCancel: () => void
}

function NapEditForm({ initial, onSave, onCancel }: NapEditFormProps) {
  const { t } = useTranslation()
  const [withState, setWithState] = useState(initial.with_state)
  const [text, setText] = useState(initial.terms)
  const [startsLocal, setStartsLocal] = useState(isoToLocal(initial.starts_at_utc))
  const [endsLocal, setEndsLocal] = useState(isoToLocal(initial.ends_at_utc))

  return (
    <li className="flex flex-col gap-2 rounded border border-yellow-500/40 bg-zinc-900/60 p-2.5">
      <Input
        label={t('nap.vs_state_label')}
        value={withState}
        onChange={(e) => setWithState(e.target.value.toUpperCase())}
        className="font-mono text-xs uppercase"
        placeholder="S850"
      />
      <Textarea
        label={t('nap.terms_label')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={t('nap.terms_placeholder')}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          label={t('nap.start_label')}
          type="datetime-local"
          value={startsLocal}
          onChange={(e) => setStartsLocal(e.target.value)}
          hint={t('nap.optional_hint')}
        />
        <Input
          label={t('nap.end_label')}
          type="datetime-local"
          value={endsLocal}
          onChange={(e) => setEndsLocal(e.target.value)}
          hint={t('nap.optional_hint')}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            const ws = withState.trim().toUpperCase()
            const tx = text.trim()
            if (!ws || !tx) return
            void onSave({
              with_state: ws,
              terms: tx,
              starts_at_utc: localToIso(startsLocal),
              ends_at_utc: localToIso(endsLocal),
            })
          }}
        >
          {t('common.save')}
        </Button>
      </div>
    </li>
  )
}

function localToIso(local: string): string | null {
  if (!local.trim()) return null
  return new Date(`${local}:00Z`).toISOString()
}

function isoToLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 16)
}

function formatNapWindow(starts: string | null, ends: string | null): string | null {
  if (!starts && !ends) return null
  const fmt = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`
  }
  if (starts && ends) return `${fmt(starts)} → ${fmt(ends)} UTC`
  if (starts) return `ab ${fmt(starts)} UTC`
  return `bis ${fmt(ends!)} UTC`
}
