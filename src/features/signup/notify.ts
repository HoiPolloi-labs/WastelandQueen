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
