import type { ChecklistKey, Signup } from '@/types/wk'
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
