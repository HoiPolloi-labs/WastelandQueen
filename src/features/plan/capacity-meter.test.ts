import { describe, it, expect } from 'vitest'
import { computeCapacityMeter } from './capacity-meter'
import type { Signup, TroopTier, TroopType } from '@/types/wk'

function s(opts: {
  id: string
  rally?: number | null
  march?: number | null
  type?: TroopType
}): Signup {
  return {
    id: opts.id,
    event_id: 'e',
    ign: opts.id,
    alliance_tag: 'WQR',
    server: 'S724',
    tier: 11 as TroopTier,
    troop_type: opts.type ?? 'fighter',
    max_solo_lair: 5,
    rally_size: opts.rally ?? null,
    march_size: opts.march ?? null,
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
    edit_token: 't',
    submitted_at: '2026-06-06T10:00:00Z',
  }
}

describe('computeCapacityMeter', () => {
  it('no captain → empty meter, hasCaptain false', () => {
    const m = computeCapacityMeter([s({ id: 'a', march: 200_000 })], null)
    expect(m).toMatchObject({ cap: 0, used: 0, pct: 0, overCap: false, hasCaptain: false })
  })

  it('captain rally is the cap; captain does not consume it', () => {
    const cap = s({ id: 'cap', rally: 1_000_000, march: 300_000 })
    const d1 = s({ id: 'd1', march: 200_000 })
    const d2 = s({ id: 'd2', march: 300_000 })
    const m = computeCapacityMeter([cap, d1, d2], 'cap')
    expect(m.cap).toBe(1_000_000)
    expect(m.used).toBe(500_000) // captain's 300k excluded
    expect(m.pct).toBe(50)
    expect(m.overCap).toBe(false)
    expect(m.hasCaptain).toBe(true)
  })

  it('flags over-cap and clamps pct to 100', () => {
    const cap = s({ id: 'cap', rally: 400_000 })
    const members = [cap, s({ id: 'd1', march: 300_000 }), s({ id: 'd2', march: 300_000 })]
    const m = computeCapacityMeter(members, 'cap')
    expect(m.used).toBe(600_000)
    expect(m.overCap).toBe(true)
    expect(m.pct).toBe(100)
  })

  it('falls back to rally_size for a defender with null march (defenderContribution)', () => {
    const cap = s({ id: 'cap', rally: 5_000_000 })
    const legacy = s({ id: 'd1', march: null, rally: 800_000 })
    const m = computeCapacityMeter([cap, legacy], 'cap')
    expect(m.used).toBe(800_000)
  })

  it('null captain rally → cap 0, pct 0, never over-cap', () => {
    const cap = s({ id: 'cap', rally: null })
    const m = computeCapacityMeter([cap, s({ id: 'd1', march: 200_000 })], 'cap')
    expect(m.cap).toBe(0)
    expect(m.pct).toBe(0)
    expect(m.overCap).toBe(false)
    expect(m.hasCaptain).toBe(true)
  })
})
