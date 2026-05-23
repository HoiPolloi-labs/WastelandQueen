import type { Assignment, ChecklistKey, Signup } from '@/types/wk'
import { CHECKLIST_KEYS } from '@/types/wk'

const ITEM_LABEL: Record<ChecklistKey, string> = {
  taxis: 'taxis',
  speedups: 'speedups',
  heroes: 'heroes',
  shield: 'shield',
}

/**
 * Per-signup "what's missing from the pre-event checklist" summary for the
 * planner sidebar. Pure function so the planner panel can re-render cheaply
 * and we can roundtrip-test the reminder-text formatting.
 */
export interface PreEventGap {
  signup: Signup
  missing: ChecklistKey[]
}

export function computePreEventGaps(signups: Signup[]): PreEventGap[] {
  const gaps: PreEventGap[] = []
  for (const s of signups) {
    const missing = CHECKLIST_KEYS.filter((k) => !s.checklist?.[k])
    if (missing.length > 0) gaps.push({ signup: s, missing })
  }
  // most-incomplete first, then alphabetical
  gaps.sort((a, b) => {
    if (b.missing.length !== a.missing.length) return b.missing.length - a.missing.length
    return a.signup.ign.localeCompare(b.signup.ign)
  })
  return gaps
}

/**
 * In-game-chat-friendly reminder text. Universal English item names so a
 * mixed-language alliance can read it without per-player localization.
 *
 *   Pre-Event reminder:
 *     WhalerKing [WQR] — taxis, speedups
 *     IronVeil [WQR]   — shield
 *     ...
 */
export function formatPreEventReminder(gaps: PreEventGap[]): string {
  if (gaps.length === 0) return 'Pre-Event reminder: all clear ✓\n'
  const lines = ['Pre-Event reminder:']
  for (const g of gaps) {
    const items = g.missing.map((k) => ITEM_LABEL[k]).join(', ')
    lines.push(`  ${g.signup.ign} [${g.signup.alliance_tag}] — ${items}`)
  }
  return lines.join('\n') + '\n'
}

/**
 * Subset of pre-event gaps that matter on event day: players who are
 * planner-assigned to the `mud` bucket AND haven't ticked the 3-day-shield
 * checklist item. Without that shield, troops in mud get cleared on contact —
 * we want to ping them specifically, not bundled with the broader reminder.
 */
export interface MudsitGap {
  signup: Signup
}

export function computeMudsitShieldGaps(
  signups: Signup[],
  assignments: Assignment[],
): MudsitGap[] {
  const mudSignupIds = new Set(
    assignments.filter((a) => a.building === 'mud').map((a) => a.signup_id),
  )
  if (mudSignupIds.size === 0) return []
  const out: MudsitGap[] = []
  for (const s of signups) {
    if (!mudSignupIds.has(s.id)) continue
    if (s.checklist?.shield) continue
    out.push({ signup: s })
  }
  out.sort((a, b) => a.signup.ign.localeCompare(b.signup.ign))
  return out
}

export function formatMudsitReminder(gaps: MudsitGap[]): string {
  if (gaps.length === 0) return 'Mudsit shield check: all clear ✓\n'
  const lines = [
    'Mudsit shield check — please confirm 3-day shield is up:',
  ]
  for (const g of gaps) {
    lines.push(`  ${g.signup.ign} [${g.signup.alliance_tag}]`)
  }
  return lines.join('\n') + '\n'
}
