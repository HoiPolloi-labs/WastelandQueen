/**
 * Fast Comeback math (WK guide, docs/wasteland-king-guide.md lines 6/59/86/169):
 * after the event FC gives a 300% training boost, **capped at 120% of the might
 * you lost in Hub/turret deaths** (turret-fire deaths and mud deaths do NOT
 * count toward the cap). You must be able to consume the cap with stockpiled
 * speedups + resources or it's wasted.
 */
export interface FastComebackResult {
  /** Eligible might lost (Hub/turret deaths only) — the validated input. */
  mightLost: number
  /** FC cap = 120% of eligible might lost: the max might you can retrain under
   *  the boost before it expires unused. */
  cap: number
  /** Training-speed boost FC grants. */
  boostPct: number
}

export const FC_CAP_RATE = 1.2
export const FC_BOOST_PCT = 300

export function computeFastComeback(mightLost: number): FastComebackResult {
  const safe = Number.isFinite(mightLost) && mightLost > 0 ? mightLost : 0
  return {
    mightLost: safe,
    cap: Math.round(safe * FC_CAP_RATE),
    boostPct: FC_BOOST_PCT,
  }
}
