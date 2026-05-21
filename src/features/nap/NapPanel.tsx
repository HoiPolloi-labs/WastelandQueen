import { useState } from 'react'
import { Handshake, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { useNapTerms } from './use-nap-terms'
import { NapList } from './NapList'

interface NapPanelProps {
  eventId: string
}

export function NapPanel({ eventId }: NapPanelProps) {
  const { terms, add, update, remove, setStatus } = useNapTerms(eventId)
  const [adding, setAdding] = useState(false)
  const [withState, setWithState] = useState('')
  const [text, setText] = useState('')
  const [startsLocal, setStartsLocal] = useState('')
  const [endsLocal, setEndsLocal] = useState('')

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
          NAP <span className="font-normal normal-case text-zinc-400">· {terms.length}</span>
        </h3>
        {!adding && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" />
            Add
          </Button>
        )}
      </header>

      {adding && (
        <div className="mb-3 flex flex-col gap-2 rounded border border-yellow-500/40 bg-zinc-900/60 p-2.5">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-zinc-300">Neuer NAP-Eintrag</span>
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
            label="vs State"
            value={withState}
            onChange={(e) => setWithState(e.target.value.toUpperCase())}
            placeholder="S850"
            className="font-mono text-xs uppercase"
          />
          <Textarea
            label="Terms"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="No T11+ marches into Hub, mud-sit RSS allowed both sides…"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Start (UTC)"
              type="datetime-local"
              value={startsLocal}
              onChange={(e) => setStartsLocal(e.target.value)}
              hint="Optional"
            />
            <Input
              label="Ende (UTC)"
              type="datetime-local"
              value={endsLocal}
              onChange={(e) => setEndsLocal(e.target.value)}
              hint="Optional"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={submitNew}
              disabled={!withState.trim() || !text.trim()}
            >
              Speichern
            </Button>
          </div>
        </div>
      )}

      <NapList
        terms={terms}
        onEdit={(id, patch) => update(id, patch)}
        onDelete={remove}
        onStatusChange={setStatus}
        empty="Noch keine NAP-Terms — leg den ersten mit + Add an."
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
