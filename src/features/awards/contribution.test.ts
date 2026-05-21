import { describe, it, expect } from 'vitest'
import { computeAwardCandidates } from './contribution'
import type { Assignment, EventConfig, Signup } from '@/types/wk'

const EVENT_START = '2026-05-30T10:00:00Z'

const baseEvent: EventConfig = {
  id: 'wk-test',
  starts_at_utc: EVENT_START,
  shift_count: 2,
  turret_mode: 'duplicate-strongest',
  home_server: 'S724',
  notes: null,
  state_grade: null,
  governor_ign: null,
  assessor_ign: null,
  negotiator_ign: null,
  foreign_targets: null,
  discord_webhook_url: null,
  hub_defender_target: 4,
  created_at: EVENT_START,
}

function makeSignup(overrides: Partial<Signup> = {}): Signup {
  return {
    id: overrides.id ?? 'sid-1',
    event_id: 'wk-test',
    ign: overrides.ign ?? 'Player',
    alliance_tag: 'WQR',
    server: 'S724',
    tier: 10,
    troop_type: 'rider',
    max_solo_lair: 6,
    rally_size: null,
    true_might: null,
    willing_captain: false,
    shift_pref: '1',
    planner_notes: null,
    state_alliance_joined: false,
    attended: null,
    kill_points: 0,
    death_points: 0,
    occupation_points: 0,
    might_lost: 0,
    box_tier: null,
    edit_token: 't',
    submitted_at: EVENT_START,
    ...overrides,
  }
}

function makeAssignment(overrides: Partial<Assignment>): Assignment {
  return {
    id: 'aid',
    event_id: 'wk-test',
    signup_id: 'sid-1',
    building: 'turret-n',
    shift: 1,
    is_captain: false,
    position: 0,
    captain_present: null,
    updated_at: EVENT_START,
    ...overrides,
  }
}

describe('computeAwardCandidates', () => {
  it('sorts descending by score', () => {
    const a = makeSignup({ id: 'a', attended: true })
    const b = makeSignup({ id: 'b', attended: false })
    const result = computeAwardCandidates([b, a], [], baseEvent)
    expect(result[0]?.signup.id).toBe('a')
    expect(result[1]?.signup.id).toBe('b')
  })

  it('awards attendance bonus of 30', () => {
    const noShow = makeSignup({
      id: 'no',
      attended: false,
      submitted_at: EVENT_START,
    })
    const attended = makeSignup({
      id: 'yes',
      attended: true,
      submitted_at: EVENT_START,
    })
    const [winner, loser] = computeAwardCandidates([noShow, attended], [], baseEvent)
    expect(winner!.signup.id).toBe('yes')
    expect(winner!.score - loser!.score).toBeGreaterThanOrEqual(30)
  })

  it('counts captain assignments × 25', () => {
    const s = makeSignup({ id: 's', attended: true, submitted_at: EVENT_START })
    const cap1 = makeAssignment({ id: 'a1', signup_id: 's', shift: 1, is_captain: true })
    const cap2 = makeAssignment({ id: 'a2', signup_id: 's', shift: 2, is_captain: true })
    const noCap = makeAssignment({ id: 'a3', signup_id: 's', shift: 1, is_captain: false })

    const r1 = computeAwardCandidates([s], [noCap], baseEvent)
    const r2 = computeAwardCandidates([s], [cap1, cap2], baseEvent)
    // 2 captain assignments worth 50 + extra shift bonus (+10) vs no captain + 1 shift (+10)
    expect(r2[0]!.score - r1[0]!.score).toBeGreaterThanOrEqual(50)
  })

  it('counts unique shifts × 10', () => {
    const s = makeSignup({ id: 's', attended: true, submitted_at: EVENT_START })
    const oneShift = [makeAssignment({ signup_id: 's', shift: 1 })]
    const twoShifts = [
      makeAssignment({ id: 'a1', signup_id: 's', shift: 1 }),
      makeAssignment({ id: 'a2', signup_id: 's', shift: 2 }),
    ]
    const r1 = computeAwardCandidates([s], oneShift, baseEvent)
    const r2 = computeAwardCandidates([s], twoShifts, baseEvent)
    expect(r2[0]!.score - r1[0]!.score).toBe(10)
  })

  it('divides personal_points by 100', () => {
    const s = makeSignup({
      id: 's',
      attended: true,
      kill_points: 5000,
      death_points: 3000,
      occupation_points: 2000,
      submitted_at: EVENT_START,
    })
    const result = computeAwardCandidates([s], [], baseEvent)
    // 10000 points / 100 = 100 contribution from points
    expect(result[0]!.pointsBonus).toBe(100)
  })

  it('early-signup bonus caps at 30 (7+ days early)', () => {
    const veryEarly = makeSignup({
      id: 'early',
      attended: true,
      submitted_at: '2026-05-15T10:00:00Z', // 15 days early
    })
    const lateButShowed = makeSignup({
      id: 'late',
      attended: true,
      submitted_at: EVENT_START, // signed up at event start
    })
    const [early, late] = computeAwardCandidates(
      [veryEarly, lateButShowed],
      [],
      baseEvent,
    )
    expect(early!.signup.id).toBe('early')
    expect(early!.earlyBonus).toBe(30)
    expect(late!.earlyBonus).toBe(0)
  })

  it('no-show with late signup gets very low score', () => {
    const noShow = makeSignup({
      attended: false,
      submitted_at: '2026-05-29T10:00:00Z', // 1 day before
    })
    const r = computeAwardCandidates([noShow], [], baseEvent)
    expect(r[0]!.score).toBeLessThan(10) // only early bonus, ~4
  })

  it('attendance unknown (null) does not award the 30 bonus', () => {
    const unknown = makeSignup({
      attended: null,
      submitted_at: EVENT_START,
    })
    const r = computeAwardCandidates([unknown], [], baseEvent)
    expect(r[0]!.attendedBonus).toBe(0)
  })
})
