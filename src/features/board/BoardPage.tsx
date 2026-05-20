import { useRef, useState } from 'react'
import { useParams } from 'react-router'
import { Crown, Download, Loader2, AlertCircle } from 'lucide-react'
import { useEvent } from '@/features/event/use-event'
import { useSignups } from '@/features/plan/use-signups'
import { useAssignments } from '@/features/plan/use-assignments'
import { Plaza } from '@/features/plan/Plaza'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { downloadAsPng } from '@/lib/capture'
import type { ShiftNumber } from '@/types/wk'
import { Qr } from './Qr'
import { useNapTerms } from '@/features/nap/use-nap-terms'
import { NapList } from '@/features/nap/NapList'
import { Handshake } from 'lucide-react'

export function BoardPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { event, loading } = useEvent(eventId)
  const { signups } = useSignups(eventId)
  const { assignments } = useAssignments(eventId)
  const { terms: napTerms } = useNapTerms(eventId)
  const [shift, setShift] = useState<ShiftNumber>(1)
  const captureRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  if (!event) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-xl font-semibold">Event nicht gefunden</h1>
      </div>
    )
  }

  const signupUrl = `${window.location.origin}/signup/${event.id}`

  const exportPng = async () => {
    if (!captureRef.current) return
    setExporting(true)
    try {
      await downloadAsPng(captureRef.current, `wk-${event.id}-shift-${shift}.png`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-yellow-400">
            <Crown className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Wasteland Queen · {event.home_server}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">{event.id}</h1>
          <p className="text-xs text-zinc-500">
            Start {new Date(event.starts_at_utc).toLocaleString('de-DE')} · {signups.length}{' '}
            Spieler
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {event.shift_count >= 2 && (
            <Segmented<ShiftNumber>
              options={[
                { value: 1, label: 'Shift 1' },
                { value: 2, label: 'Shift 2' },
              ]}
              value={shift}
              onChange={setShift}
            />
          )}
          <Button variant="secondary" size="sm" onClick={exportPng} disabled={exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            PNG
          </Button>
        </div>
      </header>

      <div ref={captureRef} className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
          <span>Shift {shift} · WK Setup</span>
          <span>Drag-frei · nur Anzeige</span>
        </div>
        <Plaza shift={shift} signups={signups} assignments={assignments} />
        {napTerms.length > 0 && (
          <div className="mt-6 border-t border-zinc-800 pt-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Handshake className="h-3.5 w-3.5" />
              NAP-Terms
            </h3>
            <NapList terms={napTerms} />
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <Qr value={signupUrl} size={140} />
          <div className="text-sm">
            <div className="font-medium text-zinc-100">Noch nicht eingetragen?</div>
            <div className="mt-1 text-xs text-zinc-500">QR scannen oder Link öffnen:</div>
            <code className="mt-2 block break-all rounded bg-zinc-900 px-2 py-1 font-mono text-[11px] text-yellow-300">
              {signupUrl}
            </code>
          </div>
        </div>
        {event.notes && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-300">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Notes
            </div>
            <p className="whitespace-pre-wrap">{event.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
