import { load, save, remove } from '@/lib/storage'

/**
 * Edit-tokens are stored client-side per (eventId, lower(IGN)).
 * Used to gate the Withdraw button — anyone with the URL can update an
 * existing signup (low-harm), but only the original device can delete.
 */
function key(eventId: string, ign: string): string {
  return `signup_tokens/${eventId}/${ign.toLowerCase()}`
}

export function rememberToken(eventId: string, ign: string, token: string): void {
  save(key(eventId, ign), token)
}

export function recallToken(eventId: string, ign: string): string | null {
  return load<string | null>(key(eventId, ign), null)
}

export function forgetToken(eventId: string, ign: string): void {
  remove(key(eventId, ign))
}
