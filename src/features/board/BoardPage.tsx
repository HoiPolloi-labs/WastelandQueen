import { useRef, useState } from 'react'
import { useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
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
import { shiftWindowLabel } from '@/features/event/shift-window'

export function BoardPage() {
  const { t, i18n } = useTranslation()
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
        <h1 className="mt-4 text-xl font-semibold">{t('board.event_not_found')}</h1>
      </div>
    )
  }

  // Short URL for the QR code + display — denser QR scans faster with the
  // game's in-app camera, and players can read out the URL if they prefer
  // typing. Long URL still works (redirect target).
  const signupUrl = `${window.location.origin}/s/${event.id}`

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
          <p className="text-xs text-zinc-400">
            Start {new Date(event.starts_at_utc).toLocaleString(i18n.language)} ·{' '}
            {t('board.players', { count: signups.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {event.shift_count >= 2 && (
            <Segmented<ShiftNumber>
              options={Array.from({ length: event.shift_count }, (_, i) => ({
                value: (i + 1) as ShiftNumber,
                label: t('signup.shift_n', { n: i + 1 }),
                hint: shiftWindowLabel(event.starts_at_utc, event.shift_count, (i + 1) as ShiftNumber),
              }))}
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
        <div className="mb-4 flex items-center justify-between text-xs text-zinc-400">
          <span>{t('board.shift_setup', { n: shift })}</span>
          <span>{t('board.view_only')}</span>
        </div>
        <Plaza
          shift={shift}
          signups={signups}
          assignments={assignments}
          foreignTargets={event.foreign_targets}
        />
        {napTerms.length > 0 && (
          <div className="mt-6 border-t border-zinc-800 pt-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Handshake className="h-3.5 w-3.5" />
              {t('board.nap_terms_header')}
            </h3>
            <NapList terms={napTerms} />
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <Qr value={signupUrl} size={140} />
          <div className="text-sm">
            <div className="font-medium text-zinc-100">{t('board.not_signed_up_yet_title')}</div>
            <div className="mt-1 text-xs text-zinc-400">{t('board.not_signed_up_yet_hint')}</div>
            <code className="mt-2 block break-all rounded bg-zinc-900 px-2 py-1 font-mono text-[11px] text-yellow-300">
              {signupUrl}
            </code>
          </div>
        </div>
        {event.notes && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-300">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {t('board.notes_header')}
            </div>
            <p className="whitespace-pre-wrap">{event.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
