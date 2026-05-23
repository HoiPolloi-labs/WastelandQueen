import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck, FileText, Check, Send, Loader2, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import type { Assignment, ChecklistKey, Signup } from '@/types/wk'
import {
  computePreEventGaps,
  formatPreEventReminder,
  computeMudsitShieldGaps,
  formatMudsitReminder,
} from './preevent-status'
import { pushDiscordReminder } from '@/features/signup/notify'

interface PreEventStatusPanelProps {
  eventId: string
  signups: Signup[]
  /** Needed to detect mud-sit assignments for the shield reminder. */
  assignments: Assignment[]
}

const ITEM_DOT_LABEL: Record<ChecklistKey, string> = {
  taxis: 'T',
  speedups: 'S',
  heroes: 'H',
  shield: 'D',
}

type SendStatus = 'idle' | 'sending' | 'ok' | 'fail'

/**
 * Per-signup view of pre-event readiness. Each gap row shows the player name
 * and which items are still missing. Two action buttons:
 *
 * - **Copy reminder** — paste-friendly block on the clipboard for any chat.
 * - **Send to Discord** — posts the same content as a reminder embed via the
 *   notify-discord edge function (no-op when no webhook is configured for
 *   the event; the function returns `skipped`).
 *
 * Also surfaces a Mudsit-Shield-Check action when any assigned mud-sitter
 * hasn't ticked the shield item. Same Copy + Send mechanics, separate text.
 *
 * Stays in the planner sidebar — only the planner sees this. Players see
 * the checklist on their own signup form.
 */
export function PreEventStatusPanel({ eventId, signups, assignments }: PreEventStatusPanelProps) {
  const { t } = useTranslation()
  const gaps = useMemo(() => computePreEventGaps(signups), [signups])
  const mudsitGaps = useMemo(
    () => computeMudsitShieldGaps(signups, assignments),
    [signups, assignments],
  )
  const [copied, setCopied] = useState(false)
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [mudsitCopied, setMudsitCopied] = useState(false)
  const [mudsitSendStatus, setMudsitSendStatus] = useState<SendStatus>('idle')

  const copyReminder = async () => {
    await navigator.clipboard.writeText(formatPreEventReminder(gaps)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const sendReminder = async () => {
    setSendStatus('sending')
    const ok = await pushDiscordReminder(eventId, 'reminder', formatPreEventReminder(gaps))
    setSendStatus(ok ? 'ok' : 'fail')
    setTimeout(() => setSendStatus('idle'), 2000)
  }

  const copyMudsit = async () => {
    await navigator.clipboard.writeText(formatMudsitReminder(mudsitGaps)).catch(() => {})
    setMudsitCopied(true)
    setTimeout(() => setMudsitCopied(false), 1500)
  }

  const sendMudsit = async () => {
    setMudsitSendStatus('sending')
    const ok = await pushDiscordReminder(
      eventId,
      'mudsit_reminder',
      formatMudsitReminder(mudsitGaps),
    )
    setMudsitSendStatus(ok ? 'ok' : 'fail')
    setTimeout(() => setMudsitSendStatus('idle'), 2000)
  }

  const ready = signups.length - gaps.length

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <ClipboardCheck className="h-3.5 w-3.5" />
          {t('preevent.section_title')}
        </h3>
        <span className="text-[10px]">
          <span className="text-emerald-300">{ready}</span>
          <span className="text-zinc-500"> / {t('preevent.ready_count', { ready, total: signups.length })}</span>
        </span>
      </header>

      {gaps.length === 0 ? (
        <p className="text-[11px] text-emerald-300">{t('preevent.all_ready')}</p>
      ) : (
        <>
          <ul className="mb-2 max-h-48 overflow-y-auto text-[11px]">
            {gaps.map((g) => (
              <li
                key={g.signup.id}
                className="flex items-center justify-between gap-2 border-b border-zinc-800/40 py-1 last:border-b-0"
              >
                <span className="truncate font-mono text-zinc-200">
                  {g.signup.ign}
                  <span className="ml-1 text-zinc-500">[{g.signup.alliance_tag}]</span>
                </span>
                <span className="flex flex-shrink-0 gap-0.5">
                  {(['taxis', 'speedups', 'heroes', 'shield'] as ChecklistKey[]).map((k) => {
                    const missing = g.missing.includes(k)
                    const tooltip = `${t(`preevent.item_tooltip_${k}` as 'preevent.item_tooltip_taxis')} — ${
                      missing
                        ? t('preevent.item_status_missing')
                        : t('preevent.item_status_done')
                    }`
                    return (
                      <span
                        key={k}
                        title={tooltip}
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border text-[9px] font-bold',
                          missing
                            ? 'border-red-500/60 bg-red-500/10 text-red-300'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
                        )}
                      >
                        {ITEM_DOT_LABEL[k]}
                      </span>
                    )
                  })}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyReminder}
              title={t('preevent.copy_reminder_title')}
              className="flex-1 justify-center"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-300" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              {t('preevent.copy_reminder_button')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={sendReminder}
              disabled={sendStatus === 'sending'}
              title={t('preevent.send_reminder_title')}
              className="flex-1 justify-center"
            >
              {sendStatus === 'sending' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : sendStatus === 'ok' ? (
                <Check className="h-3 w-3" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              {sendStatus === 'fail' ? t('preevent.send_failed') : t('preevent.send_reminder_button')}
            </Button>
          </div>
        </>
      )}

      {mudsitGaps.length > 0 && (
        <div className="mt-3 rounded border border-amber-500/30 bg-amber-500/5 p-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-200">
            <ShieldAlert className="h-3 w-3" />
            {t('preevent.mudsit_header', { count: mudsitGaps.length })}
          </div>
          <ul className="mb-2 max-h-32 overflow-y-auto text-[11px] text-zinc-300">
            {mudsitGaps.map((g) => (
              <li key={g.signup.id} className="font-mono">
                {g.signup.ign} <span className="text-zinc-500">[{g.signup.alliance_tag}]</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyMudsit}
              title={t('preevent.mudsit_copy_title')}
              className="flex-1 justify-center"
            >
              {mudsitCopied ? (
                <Check className="h-3 w-3 text-emerald-300" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              {t('preevent.mudsit_copy_button')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={sendMudsit}
              disabled={mudsitSendStatus === 'sending'}
              title={t('preevent.mudsit_send_title')}
              className="flex-1 justify-center"
            >
              {mudsitSendStatus === 'sending' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : mudsitSendStatus === 'ok' ? (
                <Check className="h-3 w-3" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              {mudsitSendStatus === 'fail' ? t('preevent.send_failed') : t('preevent.mudsit_send_button')}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
