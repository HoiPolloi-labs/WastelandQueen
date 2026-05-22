import { describe, it, expect } from 'vitest'
import { computePreEventGaps, formatPreEventReminder } from './preevent-status'
import type { Signup, TroopTier, TroopType, Checklist } from '@/types/wk'

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
