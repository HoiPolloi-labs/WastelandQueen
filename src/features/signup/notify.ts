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

/**
 * Planner-triggered broadcast (Pre-Event reminder, Mudsit shield check).
 * Awaited so the caller can show a saved/error indicator. Returns true if
 * the function reported `posted: true` (webhook responded 2xx).
 */
export async function pushDiscordReminder(
  eventId: string,
  action: 'reminder' | 'mudsit_reminder',
  content: string,
): Promise<boolean> {
  try {
    const { data } = await supabase.functions.invoke('notify-discord', {
      body: { event_id: eventId, action, content },
    })
    return Boolean((data as { posted?: boolean } | null)?.posted)
  } catch {
    return false
  }
}
