import { describe, it, expect } from 'vitest'
import {
  computePreEventGaps,
  formatPreEventReminder,
  computeMudsitShieldGaps,
  formatMudsitReminder,
} from './preevent-status'
import type { Assignment, Signup, TroopTier, TroopType, Checklist } from '@/types/wk'

function sig(opts: {
  id: string
  ign?: string
  tag?: string
  checklist?: Checklist
}): Signup {
  return {
    id: opts.id,
    event_id: 'e',
    ign: opts.ign ?? opts.id,
    alliance_tag: opts.tag ?? 'WQR',
    server: 'S724',
    tier: 11 as TroopTier,
    troop_type: 'rider' as TroopType,
    max_solo_lair: 5,
    rally_size: 1_000_000,
    march_size: null,
    secondary_troop_types: null,
    secondary_tier: null,
    defend_at_start: false,
    willing_foreign_hub: false,
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
    checklist: opts.checklist ?? {},
    agent_x_frags: 0,
    dr_j_frags: 0,
    nataly_frags: 0,
    edit_token: 't',
    submitted_at: '2026-05-30T10:00:00Z',
  }
}

describe('computePreEventGaps', () => {
  it('omits signups with all items checked', () => {
    const ready = sig({
      id: 'a',
      checklist: { taxis: true, speedups: true, heroes: true, shield: true },
    })
    expect(computePreEventGaps([ready])).toEqual([])
  })

  it('reports per-signup missing keys', () => {
    const half = sig({
      id: 'b',
      ign: 'WhalerKing',
      checklist: { taxis: true, heroes: true },
    })
    const gaps = computePreEventGaps([half])
    expect(gaps).toHaveLength(1)
    expect(gaps[0]!.missing).toEqual(['speedups', 'shield'])
  })

  it('treats absent checklist as all-missing', () => {
    const fresh = sig({ id: 'c' })
    const gaps = computePreEventGaps([fresh])
    expect(gaps[0]!.missing).toEqual(['taxis', 'speedups', 'heroes', 'shield'])
  })

  it('sorts most-incomplete first, then alphabetical', () => {
    const a = sig({ id: 'a', ign: 'Alpha', checklist: { taxis: true, speedups: true, heroes: true } })
    const b = sig({ id: 'b', ign: 'Bravo' }) // all missing
    const c = sig({ id: 'c', ign: 'Charlie', checklist: { taxis: true } })
    const gaps = computePreEventGaps([a, b, c])
    expect(gaps.map((g) => g.signup.ign)).toEqual(['Bravo', 'Charlie', 'Alpha'])
  })
})

describe('formatPreEventReminder', () => {
  it('renders an all-clear line when no gaps', () => {
    expect(formatPreEventReminder([])).toContain('all clear')
  })

  it('lists each gap as one indented line', () => {
    const text = formatPreEventReminder([
      { signup: sig({ id: 'a', ign: 'Whaler', tag: 'WQR' }), missing: ['taxis', 'shield'] },
    ])
    expect(text).toContain('Pre-Event reminder:')
    expect(text).toContain('  Whaler [WQR] — taxis, shield')
  })
})

function asg(signupId: string, building: Assignment['building']): Assignment {
  return {
    id: `a-${signupId}`,
    event_id: 'e',
    signup_id: signupId,
    building,
    shift: 1,
    is_captain: false,
    position: 0,
    captain_present: null,
    foreign_target: null,
    updated_at: '',
  }
}

describe('computeMudsitShieldGaps', () => {
  it('returns empty when no one is assigned to mud', () => {
    const s = sig({ id: 'a' })
    expect(computeMudsitShieldGaps([s], [asg('a', 'hub')])).toEqual([])
  })

  it('returns empty when assigned mud-sitters all ticked shield', () => {
    const s = sig({ id: 'a', checklist: { shield: true } })
    expect(computeMudsitShieldGaps([s], [asg('a', 'mud')])).toEqual([])
  })

  it('flags assigned mud-sitter without shield ticked', () => {
    const s = sig({ id: 'a', ign: 'MudSitter' })
    const gaps = computeMudsitShieldGaps([s], [asg('a', 'mud')])
    expect(gaps).toHaveLength(1)
    expect(gaps[0]!.signup.ign).toBe('MudSitter')
  })

  it('ignores players who are not assigned (even if checklist incomplete)', () => {
    const s = sig({ id: 'a' })
    // assignment for a different signup
    const other = asg('other', 'mud')
    expect(computeMudsitShieldGaps([s], [other])).toEqual([])
  })

  it('sorts gaps alphabetically by IGN', () => {
    const a = sig({ id: '1', ign: 'Zeta' })
    const b = sig({ id: '2', ign: 'Alpha' })
    const c = sig({ id: '3', ign: 'Mike' })
    const gaps = computeMudsitShieldGaps(
      [a, b, c],
      [asg('1', 'mud'), asg('2', 'mud'), asg('3', 'mud')],
    )
    expect(gaps.map((g) => g.signup.ign)).toEqual(['Alpha', 'Mike', 'Zeta'])
  })
})

describe('formatMudsitReminder', () => {
  it('renders an all-clear line when no gaps', () => {
    expect(formatMudsitReminder([])).toContain('all clear')
  })

  it('lists each gap as one indented line', () => {
    const text = formatMudsitReminder([{ signup: sig({ id: 'a', ign: 'Whaler', tag: 'WQR' }) }])
    expect(text).toContain('Mudsit shield check')
    expect(text).toContain('  Whaler [WQR]')
  })
})

describe('computePreEventGaps tiebreaker', () => {
  it('alphabetizes by IGN when missing-checklist counts tie', () => {
    // All three players missing 2 items each (taxis + speedups) → sort
    // falls back to alphabetical on IGN.
    const checklist: Checklist = { taxis: false, speedups: false, heroes: true, shield: true }
    const gaps = computePreEventGaps([
      sig({ id: '1', ign: 'Zeta', checklist }),
      sig({ id: '2', ign: 'Alpha', checklist }),
      sig({ id: '3', ign: 'Mike', checklist }),
    ])
    expect(gaps.map((g) => g.signup.ign)).toEqual(['Alpha', 'Mike', 'Zeta'])
  })
})
