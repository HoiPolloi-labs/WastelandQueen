import { supabase } from '@/lib/supabase'

/**
 * Fire-and-forget invocation of the notify-discord edge function.
 * Failures are swallowed — the webhook is best-effort and shouldn't block
 * the signup UX.
 */
export function notifyDiscord(
  eventId: string,
  signupId: string,
  action: 'inserted' | 'updated' | 'withdrawn',
): void {
  void supabase.functions
    .invoke('notify-discord', {
      body: { event_id: eventId, signup_id: signupId, action },
    })
    .catch(() => {
      // intentionally silent
    })
}

/** Tri-state outcome so the UI can distinguish a deliberate skip
 *  ("no webhook configured" — not really a failure) from an actual error
 *  ("Discord rate-limited, 5xx, etc."). */
export type ReminderResult = 'posted' | 'no_webhook' | 'failed'

/**
 * Planner-triggered broadcast (Pre-Event reminder, Mudsit shield check).
 * Awaited so the caller can show a status indicator. The edge function
 * returns `{ posted: true }` when Discord 2xx'd, `{ skipped: 'no webhook
 * configured' }` when the planner hasn't wired one up yet, or various
 * error shapes for actual failures. UI should treat `no_webhook` as a
 * call-to-action ("configure webhook in the Discord panel"), not a
 * red-toast failure.
 */
export async function pushDiscordReminder(
  eventId: string,
  action: 'reminder' | 'mudsit_reminder',
  content: string,
): Promise<ReminderResult> {
  try {
    const { data } = await supabase.functions.invoke('notify-discord', {
      body: { event_id: eventId, action, content },
    })
    const payload = data as { posted?: boolean; skipped?: string } | null
    if (payload?.posted) return 'posted'
    if (payload?.skipped === 'no webhook configured') return 'no_webhook'
    return 'failed'
  } catch {
    return 'failed'
  }
}
