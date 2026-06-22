import { describe, it, expect } from 'vitest'
import { computeAllianceStats } from './alliance-stats'
import type { Assignment, Building, Signup, TroopTier, TroopType } from '@/types/wk'

function s(id: string, tag: string, type: TroopType = 'fighter'): Signup {
  return {
    id,
    event_id: 'e',
    ign: id,
    alliance_tag: tag,
    server: 'S724',
    tier: 11 as TroopTier,
    troop_type: type,
    max_solo_lair: 5,
    rally_size: 1_000_000,
    march_size: 200_000,
    secondary_troop_types: null,
    secondary_tier: null,
    true_might: null,
    willing_captain: false,
    defend_at_start: false,
    willing_foreign_hub: false,
    shift_pref: '1',
    planner_notes: null,
    state_alliance_joined: false,
    checklist: {},
    attended: null,
    kill_points: 0,
    death_points: 0,
    occupation_points: 0,
    might_lost: 0,
    box_tier: null,
    agent_x_frags: 0,
    dr_j_frags: 0,
    nataly_frags: 0,
    wk_points: null,
    awards_verified: false,
    edit_token: 't',
    submitted_at: '2026-06-06T10:00:00Z',
  }
}

let aid = 0
function a(signupId: string, building: Building, shift = 1): Assignment {
  return {
    id: `a${aid++}`,
    event_id: 'e',
    signup_id: signupId,
    building,
    shift: shift as Assignment['shift'],
    is_captain: false,
    position: 0,
    captain_present: null,
    foreign_target: null,
    updated_at: '2026-06-06T10:00:00Z',
  }
}

describe('computeAllianceStats', () => {
  it('counts sign-ups per alliance and computes participation %', () => {
    const signups = [s('1', 'LOY'), s('2', 'LOY'), s('3', 'WOW')]
    const stats = computeAllianceStats(signups, [], { LOY: 100, WOW: 50 }, 15)
    const loy = stats.find((x) => x.tag === 'LOY')!
    const wow = stats.find((x) => x.tag === 'WOW')!
    expect(loy.signupCount).toBe(2)
    expect(loy.totalMembers).toBe(100)
    expect(loy.participationPct).toBe(2)
    expect(loy.belowLine).toBe(true) // 2% < 15%
    expect(wow.participationPct).toBe(2)
  })

  it('above the minimum line is not flagged', () => {
    const signups = Array.from({ length: 20 }, (_, i) => s(String(i), 'LOY'))
    const stats = computeAllianceStats(signups, [], { LOY: 100 }, 15)
    expect(stats[0]!.participationPct).toBe(20)
    expect(stats[0]!.belowLine).toBe(false)
  })

  it('missing/zero total members → null pct, never below-line, no DIV/0', () => {
    const signups = [s('1', 'LOY'), s('2', 'GLE')]
    const stats = computeAllianceStats(signups, [], { GLE: 0 }, 15)
    const loy = stats.find((x) => x.tag === 'LOY')!
    const gle = stats.find((x) => x.tag === 'GLE')!
    expect(loy.totalMembers).toBe(null)
    expect(loy.participationPct).toBe(null)
    expect(loy.belowLine).toBe(false)
    expect(gle.participationPct).toBe(null) // 0 total → null, not Infinity
  })

  it('"in towers" counts only defensive buildings, deduped across shifts', () => {
    const signups = [s('1', 'LOY'), s('2', 'LOY'), s('3', 'LOY')]
    const assignments = [
      a('1', 'hub', 1),
      a('1', 'hub', 2), // same player both shifts → counts once
      a('2', 'turret-n', 1),
      a('3', 'reserve', 1), // reserve is NOT a tower
      a('3', 'mud', 1), // mud is NOT a tower
    ]
    const stats = computeAllianceStats(signups, assignments, { LOY: 100 }, 15)
    expect(stats[0]!.inTowers).toBe(2) // players 1 and 2; player 3 in reserve/mud
  })

  it('hit-squad does not count as "in towers"', () => {
    const signups = [s('1', 'LOY')]
    const stats = computeAllianceStats(signups, [a('1', 'hit-squad', 1)], { LOY: 100 }, 15)
    expect(stats[0]!.inTowers).toBe(0)
  })

  it('includes alliances pre-entered in sizes even with zero sign-ups', () => {
    const stats = computeAllianceStats([s('1', 'LOY')], [], { LOY: 100, KOB: 50 }, 15)
    const kob = stats.find((x) => x.tag === 'KOB')!
    expect(kob.signupCount).toBe(0)
    expect(kob.participationPct).toBe(0)
    expect(kob.belowLine).toBe(true)
  })

  it('sorts by sign-up count desc then alphabetically', () => {
    const signups = [s('1', 'WOW'), s('2', 'LOY'), s('3', 'LOY'), s('4', 'AAA')]
    const stats = computeAllianceStats(signups, [], {}, 15)
    expect(stats.map((x) => x.tag)).toEqual(['LOY', 'AAA', 'WOW'])
  })
})
