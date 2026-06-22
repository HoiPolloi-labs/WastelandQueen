/**
 * Troop-loss math (WK guide lines 62–66/84): casualties route
 * Infirmary → Deep Healing → Alliance Infirmary → permanent. The permanent
 * fraction depends on Nova/Research "Miraculous Survival": ~30% with no
 * investment, ~18% floor when maxed.
 */
export interface HealingResult {
  /** Validated casualty count (troops or might — caller's unit). */
  casualties: number
  /** Permanent-loss percentage applied (0–100). */
  lossPct: number
  /** Casualties that die permanently. */
  permanent: number
  /** Casualties that can still be healed (Deep Healing). */
  healable: number
}

export const LOSS_PCT_NONE = 30
export const LOSS_PCT_MAXED = 18

export function computeHealing(casualties: number, lossPct: number): HealingResult {
  const c = Number.isFinite(casualties) && casualties > 0 ? Math.floor(casualties) : 0
  const pct = Number.isFinite(lossPct) ? Math.min(100, Math.max(0, lossPct)) : 0
  const permanent = Math.round(c * (pct / 100))
  return { casualties: c, lossPct: pct, permanent, healable: c - permanent }
}
