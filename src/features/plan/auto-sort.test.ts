import { describe, it, expect } from 'vitest'
import { autoSort, captainScore, type DraftAssignment } from './auto-sort'
import type { ShiftPref, Signup, TroopTier, TroopType } from '@/types/wk'

function s(opts: {
  id: string
  type?: TroopType
  tier?: TroopTier
  lair?: number
  rally?: number | null
  captain?: boolean
  shifts?: ShiftPref
}): Signup {
  return {
    id: opts.id,
    event_id: 'e',
    ign: opts.id,
    alliance_tag: 'WQR',
    server: 'S724',
    tier: opts.tier ?? 10,
    troop_type: opts.type ?? 'fighter',
    max_solo_lair: opts.lair ?? 5,
    rally_size: opts.rally ?? null,
    true_might: null,
    willing_captain: opts.captain ?? false,
    shift_pref: opts.shifts ?? '1',
    planner_notes: null,
    state_alliance_joined: false,
    attended: null,
    kill_points: 0,
    death_points: 0,
    occupation_points: 0,
    might_lost: 0,
    box_tier: null,
    checklist: {},
    agent_x_frags: 0,
    dr_j_frags: 0,
    nataly_frags: 0,
    edit_token: 't',
    submitted_at: '2026-05-30T10:00:00Z',
  }
}

function at(out: DraftAssignment[], building: string, shift: number) {
  return out.filter((d) => d.building === building && d.shift === shift)
}

describe('captainScore', () => {
  it('weights rally heavily', () => {
    const lowRally = s({ id: 'a', rally: 100_000, lair: 5, tier: 10 })
    const highRally = s({ id: 'b', rally: 3_000_000, lair: 5, tier: 10 })
    expect(captainScore(highRally)).toBeGreaterThan(captainScore(lowRally) + 100)
  })

  it('handles null rally as zero', () => {
    const noRally = s({ id: 'a', rally: null, lair: 5, tier: 10 })
    expect(captainScore(noRally)).toBe(10 * 20 + 5)
  })

  it('tier dominates over rally within ~1 tier gap', () => {
    const t11 = s({ id: 'a', rally: 1_000_000, lair: 6, tier: 11 })
    const t10 = s({ id: 'b', rally: 1_000_000, lair: 6, tier: 10 })
    expect(captainScore(t11)).toBe(captainScore(t10) + 20)
  })

  it('lair is the final tiebreaker', () => {
    const hi = s({ id: 'a', rally: 1_000_000, lair: 10, tier: 10 })
    const lo = s({ id: 'b', rally: 1_000_000, lair: 6, tier: 10 })
    expect(captainScore(hi)).toBe(captainScore(lo) + 4)
  })
})

describe('autoSort — manual mode', () => {
  it('puts everyone into unassigned', () => {
    const result = autoSort({
      signups: [
        s({ id: 'a', type: 'rider' }),
        s({ id: 'b', type: 'fighter' }),
      ],
      turretMode: 'manual',
      shiftCount: 1,
    })
    expect(result.every((d) => d.building === 'unassigned')).toBe(true)
    expect(result).toHaveLength(2)
  })
})

describe('autoSort — duplicate-strongest mode', () => {
  it('hub-captain is the strongest willing captain regardless of type', () => {
    const result = autoSort({
      signups: [
        s({ id: 'whale', type: 'rider', rally: 3_000_000, captain: true, tier: 12 }),
        s({ id: 'midShooter', type: 'shooter', rally: 1_500_000, captain: true, tier: 11 }),
        s({ id: 'small', type: 'fighter', rally: 500_000, captain: true, tier: 9 }),
      ],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
      hubDefenderTarget: 0, // captain-only
    })
    const hub = at(result, 'hub', 1)
    expect(hub).toHaveLength(1)
    expect(hub[0]!.signup_id).toBe('whale')
    expect(hub[0]!.is_captain).toBe(true)
  })

  it('parks N defenders of the captain-type on the Hub when hubDefenderTarget is set', () => {
    const result = autoSort({
      signups: [
        s({ id: 'whale', type: 'rider', rally: 3_000_000, captain: true, tier: 12 }),
        s({ id: 'r2', type: 'rider' }),
        s({ id: 'r3', type: 'rider' }),
        s({ id: 'r4', type: 'rider' }),
        s({ id: 's1', type: 'shooter', captain: true }),
        s({ id: 'f1', type: 'fighter', captain: true }),
      ],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
      hubDefenderTarget: 2,
    })
    const hub = at(result, 'hub', 1)
    // 1 captain + 2 rider defenders
    expect(hub).toHaveLength(3)
    expect(hub[0]!.signup_id).toBe('whale')
    expect(hub[0]!.is_captain).toBe(true)
    expect(hub.slice(1).every((a) => !a.is_captain)).toBe(true)
    // Defender IDs are pulled from rider pool, top-scored first (r2, r3, r4 are equal)
    expect(hub.slice(1).map((a) => a.signup_id).sort()).toEqual(['r2', 'r3'])
  })

  it('hubDefenderTarget caps at the available pool (no over-fill)', () => {
    const result = autoSort({
      signups: [
        s({ id: 'cap', type: 'rider', captain: true, rally: 3_000_000 }),
        s({ id: 'r2', type: 'rider' }),
      ],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
      hubDefenderTarget: 10,
    })
    const hub = at(result, 'hub', 1)
    expect(hub).toHaveLength(2) // captain + only 1 other rider available
  })

  it('dominant type gets 2 turrets, others get 1', () => {
    const result = autoSort({
      signups: [
        // 3 riders dominant
        s({ id: 'r1', type: 'rider', captain: true, rally: 2_000_000 }),
        s({ id: 'r2', type: 'rider', captain: true, rally: 1_500_000 }),
        s({ id: 'r3', type: 'rider' }),
        s({ id: 'f1', type: 'fighter', captain: true }),
        s({ id: 's1', type: 'shooter', captain: true }),
      ],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
      hubDefenderTarget: 0,
    })
    // hub gets r1 (strongest willing). Rider remaining = 2, gets turret-n + turret-s.
    expect(at(result, 'hub', 1)[0]!.signup_id).toBe('r1')
    const riderTurrets = result.filter(
      (d) => (d.building === 'turret-n' || d.building === 'turret-s') && d.shift === 1,
    )
    // r2 + r3 distributed across n/s (round-robin: cap to n, filler to s)
    expect(riderTurrets.map((d) => d.signup_id).sort()).toEqual(['r2', 'r3'])
    // fighter + shooter each get one turret
    const fighter = at(result, 'turret-e', 1).concat(at(result, 'turret-w', 1))
    expect(fighter.map((d) => d.signup_id)).toContain('f1')
    expect(fighter.map((d) => d.signup_id)).toContain('s1')
  })

  it('non-captain leftover routes to the matching type-turret', () => {
    const result = autoSort({
      signups: [
        s({ id: 'cap', type: 'fighter', captain: true, rally: 2_000_000 }),
        s({ id: 'cap2', type: 'shooter', captain: true }),
        s({ id: 'cap3', type: 'rider', captain: true }),
        s({ id: 'extraF', type: 'fighter' }),
      ],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
      hubDefenderTarget: 0,
    })
    // extraF (fighter) should land on a fighter turret (the dominant type since 2 fighters)
    // hub is 'cap'. fighter is dominant (2 fighters: cap+extraF), so fighter gets 2 turrets.
    // After hub-cap consumed, fighter remaining = 1 (extraF) → goes to first fighter turret.
    const extraFLoc = result.find((d) => d.signup_id === 'extraF')
    expect(extraFLoc?.building).toMatch(/^turret-/)
  })

  it('with no willing captains anywhere, hub stays empty but pool still distributes', () => {
    const result = autoSort({
      signups: [
        s({ id: 'a', type: 'fighter' }),
        s({ id: 'b', type: 'shooter' }),
      ],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
    })
    expect(at(result, 'hub', 1)).toHaveLength(0)
    // Both players still routed to their type-turret
    expect(result.filter((d) => d.building.startsWith('turret-'))).toHaveLength(2)
  })
})

describe('autoSort — mixed-4th mode', () => {
  it('routes each type to its dedicated turret; turret-w stays empty for manual fill', () => {
    const result = autoSort({
      signups: [
        s({ id: 'f1', type: 'fighter', captain: true }),
        s({ id: 'f2', type: 'fighter' }),
        s({ id: 'f3', type: 'fighter' }),
        s({ id: 's1', type: 'shooter', captain: true }),
        s({ id: 'r1', type: 'rider', captain: true, rally: 3_000_000 }),
      ],
      turretMode: 'mixed-4th',
      shiftCount: 1,
    })
    // hub-cap is the strongest willing (r1)
    expect(at(result, 'hub', 1)[0]!.signup_id).toBe('r1')
    // turret-n holds fighters (f1 cap, f2 + f3 fillers via round-robin against [turret-n])
    const tn = at(result, 'turret-n', 1).map((d) => d.signup_id).sort()
    expect(tn).toEqual(['f1', 'f2', 'f3'])
    // turret-e holds shooter
    expect(at(result, 'turret-e', 1)[0]!.signup_id).toBe('s1')
    // turret-s holds rider (r1 went to hub; turret-s is empty since only 1 rider)
    expect(at(result, 'turret-s', 1)).toHaveLength(0)
    // turret-w is the "captain's choice" overflow — auto-sort leaves it empty.
    expect(at(result, 'turret-w', 1)).toHaveLength(0)
  })
})

describe('autoSort — multi-shift', () => {
  it('respects shift_pref array', () => {
    const result = autoSort({
      signups: [
        s({ id: 'only1', type: 'rider', captain: true, shifts: '1' }),
        s({ id: 'only2', type: 'rider', captain: true, shifts: '2' }),
        s({ id: 'both', type: 'rider', captain: true, shifts: '1,2' }),
      ],
      turretMode: 'duplicate-strongest',
      shiftCount: 2,
    })
    const ids = result.map((d) => `${d.signup_id}@${d.shift}`).sort()
    // only1 lands in shift 1, only2 in shift 2, both in both shifts
    expect(ids).toContain('only1@1')
    expect(ids).toContain('only2@2')
    expect(ids).toContain('both@1')
    expect(ids).toContain('both@2')
    expect(ids).not.toContain('only1@2')
    expect(ids).not.toContain('only2@1')
  })

  it('supports 3-shift events', () => {
    const result = autoSort({
      signups: [
        s({ id: 'allshifts', type: 'rider', captain: true, shifts: '1,2,3' }),
      ],
      turretMode: 'duplicate-strongest',
      shiftCount: 3,
    })
    const shifts = [...new Set(result.map((d) => d.shift))].sort()
    expect(shifts).toEqual([1, 2, 3])
  })
})

describe('autoSort — invariants', () => {
  it('never assigns the same signup twice in one shift', () => {
    const result = autoSort({
      signups: [
        s({ id: 'a', type: 'fighter', captain: true }),
        s({ id: 'b', type: 'shooter', captain: true }),
        s({ id: 'c', type: 'rider', captain: true }),
      ],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
    })
    const counts = new Map<string, number>()
    for (const d of result) {
      const key = `${d.signup_id}:${d.shift}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    for (const [, n] of counts) {
      expect(n).toBe(1)
    }
  })

  it('never routes to hit-squad (manual-only bucket)', () => {
    const result = autoSort({
      signups: Array.from({ length: 20 }, (_, i) =>
        s({
          id: `p${i}`,
          type: (['fighter', 'shooter', 'rider'] as const)[i % 3],
          captain: i < 5,
        }),
      ),
      turretMode: 'duplicate-strongest',
      shiftCount: 2,
    })
    expect(result.filter((d) => d.building === 'hit-squad')).toHaveLength(0)
  })

  it('never routes to mud (manual-only bucket — paired invariant with hit-squad)', () => {
    // Regression guard for the wipe bug: applyDraft now scopes its delete
    // to NOT IN (mud, hit-squad). That fix relies on the algorithm never
    // emitting either bucket. If a future change starts auto-routing to
    // mud, the persistence layer would also need to start clearing it.
    const result = autoSort({
      signups: Array.from({ length: 20 }, (_, i) =>
        s({
          id: `p${i}`,
          type: (['fighter', 'shooter', 'rider'] as const)[i % 3],
          captain: i < 5,
        }),
      ),
      turretMode: 'duplicate-strongest',
      shiftCount: 2,
    })
    expect(result.filter((d) => d.building === 'mud')).toHaveLength(0)
  })

  it('empty pool produces empty output', () => {
    const result = autoSort({
      signups: [],
      turretMode: 'duplicate-strongest',
      shiftCount: 2,
    })
    expect(result).toEqual([])
  })
})
