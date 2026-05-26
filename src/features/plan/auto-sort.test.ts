import { describe, it, expect } from 'vitest'
import {
  autoSort,
  captainScore,
  defenderContribution,
  fillToCapacity,
  type DraftAssignment,
} from './auto-sort'
import type { ShiftPref, Signup, TroopTier, TroopType } from '@/types/wk'

function s(opts: {
  id: string
  type?: TroopType
  tier?: TroopTier
  lair?: number
  rally?: number | null
  march?: number | null
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
    march_size: opts.march ?? null,
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

describe('defenderContribution', () => {
  it('uses march_size when present', () => {
    expect(defenderContribution(s({ id: 'a', march: 300_000, rally: 2_000_000 }))).toBe(300_000)
  })
  it('falls back to rally_size when march_size is null', () => {
    expect(defenderContribution(s({ id: 'a', march: null, rally: 2_000_000 }))).toBe(2_000_000)
  })
  it('returns 0 when both are null', () => {
    expect(defenderContribution(s({ id: 'a', march: null, rally: null }))).toBe(0)
  })
  it('clamps negative values to 0 (defensive)', () => {
    expect(defenderContribution(s({ id: 'a', march: -50, rally: null }))).toBe(0)
  })
  it('treats NaN as 0 (would otherwise bypass cap comparisons silently)', () => {
    const broken = s({ id: 'a', march: null, rally: null })
    // Bypass the type system to simulate a corrupt DB row / bad import
    ;(broken as { march_size: number }).march_size = NaN
    expect(defenderContribution(broken)).toBe(0)
  })
  it('treats Infinity as 0 (would otherwise sail past every cap)', () => {
    const broken = s({ id: 'a', march: null, rally: null })
    ;(broken as { march_size: number }).march_size = Infinity
    expect(defenderContribution(broken)).toBe(0)
  })
})

describe('fillToCapacity', () => {
  it('packs defenders until the next would overflow', () => {
    const candidates = [
      s({ id: 'a', march: 400_000 }),
      s({ id: 'b', march: 300_000 }),
      s({ id: 'c', march: 200_000 }),
      s({ id: 'd', march: 200_000 }),
    ]
    // cap = 1M → a(400)+b(300)+c(200) = 900, d(200) would push to 1.1M → reject
    const out = fillToCapacity(candidates, 1_000_000, new Set())
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('continues past a non-fitting candidate to pick smaller ones that still fit', () => {
    const candidates = [
      s({ id: 'big', march: 800_000 }),
      s({ id: 'huge', march: 1_500_000 }),
      s({ id: 'small', march: 100_000 }),
    ]
    // cap = 1M → big(800), huge(would overflow → skip), small(800+100=900 fits)
    const out = fillToCapacity(candidates, 1_000_000, new Set())
    expect(out.map((x) => x.id)).toEqual(['big', 'small'])
  })

  it('skips candidates already in the `used` set', () => {
    const candidates = [s({ id: 'a', march: 300_000 }), s({ id: 'b', march: 300_000 })]
    const used = new Set(['a'])
    expect(fillToCapacity(candidates, 1_000_000, used).map((x) => x.id)).toEqual(['b'])
  })

  it('cap of 0 admits nothing (defensive)', () => {
    expect(fillToCapacity([s({ id: 'a', march: 1 })], 0, new Set())).toEqual([])
  })

  it('null cap falls back to 0 → empty', () => {
    expect(fillToCapacity([s({ id: 'a', march: 1 })], NaN, new Set())).toEqual([])
  })
})

describe('autoSort capacity mode', () => {
  it('Hub fills with same-type defenders until rally cap reached, surplus → reserve', () => {
    // Hub captain: 1M rally, fighter
    // Defenders: 4 fighters @ 300k each → 3 fit (900k), 4th doesn't (1.2M)
    const captain = s({ id: 'cap', type: 'fighter', rally: 1_000_000, march: 200_000, captain: true })
    const d1 = s({ id: 'd1', type: 'fighter', march: 300_000 })
    const d2 = s({ id: 'd2', type: 'fighter', march: 300_000 })
    const d3 = s({ id: 'd3', type: 'fighter', march: 300_000 })
    const d4 = s({ id: 'd4', type: 'fighter', march: 300_000 })
    // Need a turret captain per type so the algorithm has somewhere to put leftovers
    const shooterCap = s({ id: 'sc', type: 'shooter', rally: 1_000_000, captain: true })
    const riderCap = s({ id: 'rc', type: 'rider', rally: 1_000_000, captain: true })
    const out = autoSort({
      signups: [captain, d1, d2, d3, d4, shooterCap, riderCap],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
      autoFillToCapacity: true,
    })
    const hub = at(out, 'hub', 1)
    expect(hub.filter((x) => x.is_captain).map((x) => x.signup_id)).toEqual(['cap'])
    const hubDefenders = hub.filter((x) => !x.is_captain).map((x) => x.signup_id)
    expect(hubDefenders).toHaveLength(3)
    // 4th defender lands in reserve, not hub
    const reserve = at(out, 'reserve', 1).map((x) => x.signup_id)
    expect(reserve).toContain('d4')
  })

  it('respects hub_defender_target (fixed mode) when autoFillToCapacity is false', () => {
    const captain = s({ id: 'cap', type: 'fighter', rally: 4_000_000, captain: true })
    const d1 = s({ id: 'd1', type: 'fighter' })
    const d2 = s({ id: 'd2', type: 'fighter' })
    const d3 = s({ id: 'd3', type: 'fighter' })
    const out = autoSort({
      signups: [captain, d1, d2, d3],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
      hubDefenderTarget: 2,
      autoFillToCapacity: false,
    })
    const hub = at(out, 'hub', 1).filter((x) => !x.is_captain)
    expect(hub).toHaveLength(2)
  })

  it('per-turret cap routes surplus to reserve in capacity mode', () => {
    // One fighter captain with small (400k) rally on a turret; 5 fighter
    // defenders @ 200k each. Hub captain is a shooter so fighters go to turret.
    const hubCap = s({ id: 'hubcap', type: 'shooter', rally: 1_000_000, captain: true })
    const fightCap = s({ id: 'fc', type: 'fighter', rally: 400_000, captain: true })
    const fd1 = s({ id: 'f1', type: 'fighter', march: 200_000 })
    const fd2 = s({ id: 'f2', type: 'fighter', march: 200_000 })
    const fd3 = s({ id: 'f3', type: 'fighter', march: 200_000 })
    const fd4 = s({ id: 'f4', type: 'fighter', march: 200_000 })
    const fd5 = s({ id: 'f5', type: 'fighter', march: 200_000 })
    const riderCap = s({ id: 'rc', type: 'rider', rally: 1_000_000, captain: true })
    const out = autoSort({
      signups: [hubCap, fightCap, fd1, fd2, fd3, fd4, fd5, riderCap],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
      autoFillToCapacity: true,
    })
    // Fighter turret has cap 400k → captain (host, 0) + 2 defenders (400k) fits;
    // 3rd would push to 600k → goes to reserve.
    const fighterTurret = ['turret-n', 'turret-s', 'turret-e', 'turret-w']
      .flatMap((t) => at(out, t, 1).filter((d) => d.signup_id.startsWith('f')))
    // fc captain + at most 2 defenders → 3 entries total on the fighter turret
    expect(fighterTurret.length).toBe(3)
    const reserve = at(out, 'reserve', 1).map((x) => x.signup_id)
    // Captain (host, 0 cost) + 2 defenders (2×200=400 = cap) fit; 3 overflow.
    expect(reserve.filter((id) => id.startsWith('f'))).toHaveLength(3)
  })

  it('never auto-routes to hit-squad or mud (capacity-mode regression guard)', () => {
    const captain = s({ id: 'cap', type: 'fighter', rally: 1_000_000, captain: true })
    const d1 = s({ id: 'd1', type: 'fighter', march: 200_000 })
    const out = autoSort({
      signups: [captain, d1],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
      autoFillToCapacity: true,
    })
    expect(out.filter((x) => x.building === 'hit-squad')).toEqual([])
    expect(out.filter((x) => x.building === 'mud')).toEqual([])
  })

  it('manual turret_mode dumps everyone to unassigned regardless of capacity flag', () => {
    const captain = s({ id: 'cap', type: 'fighter', rally: 1_000_000, captain: true })
    const d1 = s({ id: 'd1', type: 'fighter', march: 200_000 })
    const out = autoSort({
      signups: [captain, d1],
      turretMode: 'manual',
      shiftCount: 1,
      autoFillToCapacity: true,
    })
    // Manual mode bails before the capacity branch runs; everyone unassigned
    expect(out.every((x) => x.building === 'unassigned')).toBe(true)
    expect(out).toHaveLength(2)
  })

  it('captain-less turret in capacity mode rejects defenders to reserve', () => {
    // Domain intent: a turret without a captain has no rally being run on
    // it, so parking defenders there is meaningless. Capacity-mode cap=0
    // for no-captain turrets correctly spills same-type leftovers to
    // reserve instead. Non-capacity mode (`autoFillToCapacity: false`)
    // keeps the legacy "fits unbounded" behavior — there the planner's
    // ConflictBanner flags the captain-less turret separately.
    //
    // Setup: only a Hub captain (fighter), no willing-captain for any
    // turret type. d1 is a same-type fighter that has nowhere to go.
    const captain = s({ id: 'cap', type: 'fighter', rally: 1_000_000, captain: true })
    const d1 = s({ id: 'd1', type: 'fighter', march: 200_000 })
    const out = autoSort({
      signups: [captain, d1],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
      autoFillToCapacity: true,
    })
    // d1 fits the Hub (200k ≤ 1M cap) so it lands there as defender,
    // not on a captain-less turret. Verifies the Hub-first preference.
    const hub = at(out, 'hub', 1)
    expect(hub.filter((x) => !x.is_captain).map((x) => x.signup_id)).toEqual(['d1'])
  })

  it('Hub-captain with null rally_size in capacity mode admits no defenders', () => {
    // Documented behavior: missing rally → cap=0 → no defenders fit. Planner
    // sees Hub with captain only + same-type players in reserve, and has to
    // either fill rally_size on the signup or drag manually.
    const captain = s({ id: 'cap', type: 'fighter', rally: null, captain: true })
    const d1 = s({ id: 'd1', type: 'fighter', march: 100_000 })
    const riderCap = s({ id: 'rc', type: 'rider', rally: 1_000_000, captain: true })
    const shooterCap = s({ id: 'sc', type: 'shooter', rally: 1_000_000, captain: true })
    const out = autoSort({
      signups: [captain, d1, riderCap, shooterCap],
      turretMode: 'duplicate-strongest',
      shiftCount: 1,
      autoFillToCapacity: true,
    })
    const hubDefenders = at(out, 'hub', 1).filter((x) => !x.is_captain)
    expect(hubDefenders).toHaveLength(0)
    expect(at(out, 'reserve', 1).map((x) => x.signup_id)).toContain('d1')
  })
})
