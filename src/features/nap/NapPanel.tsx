import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Handshake, Plus, X, FileText, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { formatNapAsText } from '@/lib/share-formats'
import { useNapTerms } from './use-nap-terms'
import { NapList } from './NapList'

interface NapPanelProps {
  eventId: string
}

export function NapPanel({ eventId }: NapPanelProps) {
  const { t } = useTranslation()
  const { terms, add, update, remove, setStatus } = useNapTerms(eventId)
  const [adding, setAdding] = useState(false)
  const [withState, setWithState] = useState('')
  const [text, setText] = useState('')
  const [startsLocal, setStartsLocal] = useState('')
  const [endsLocal, setEndsLocal] = useState('')
  const [copied, setCopied] = useState(false)

  const copyForChat = async () => {
    await navigator.clipboard.writeText(formatNapAsText(terms, eventId))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const submitNew = async () => {
    const ws = withState.trim().toUpperCase()
    const tx = text.trim()
    if (!ws || !tx) return
    await add(ws, tx, {
      starts_at_utc: localToIso(startsLocal),
      ends_at_utc: localToIso(endsLocal),
    })
    setWithState('')
    setText('')
    setStartsLocal('')
    setEndsLocal('')
    setAdding(false)
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Handshake className="h-3.5 w-3.5" />
          {t('nap.section_title')} <span className="font-normal normal-case text-zinc-400">· {terms.length}</span>
        </h3>
        <div className="flex items-center gap-1">
          {terms.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyForChat}
              title={t('nap.copy_title')}
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-300" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
            </Button>
          )}
          {!adding && (
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-3 w-3" />
              {t('common.add')}
            </Button>
          )}
        </div>
      </header>

      {adding && (
        <div className="mb-3 flex flex-col gap-2 rounded border border-yellow-500/40 bg-zinc-900/60 p-2.5">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-zinc-300">{t('nap.new_entry_title')}</span>
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setWithState('')
                setText('')
              }}
              className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <Input
            label={t('nap.vs_state_label')}
            value={withState}
            onChange={(e) => setWithState(e.target.value.toUpperCase())}
            placeholder="S850"
            className="font-mono text-xs uppercase"
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
            <Button
              variant="primary"
              size="sm"
              onClick={submitNew}
              disabled={!withState.trim() || !text.trim()}
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      )}

      <NapList
        terms={terms}
        onEdit={(id, patch) => update(id, patch)}
        onDelete={remove}
        onStatusChange={setStatus}
        empty={t('nap.no_terms_planner')}
      />
    </section>
  )
}

/** datetime-local fields emit "2026-06-06T18:00" (naive local). We treat the
 *  string as UTC because the NAP-window labels are explicitly UTC throughout. */
function localToIso(local: string): string | null {
  if (!local.trim()) return null
  return new Date(`${local}:00Z`).toISOString()
}
