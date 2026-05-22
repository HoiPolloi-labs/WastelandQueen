import { describe, it, expect } from 'vitest'
import { formatPlazaAsText, formatNapAsText } from './share-formats'
import type {
  Assignment,
  EventConfig,
  NapTerm,
  ShiftNumber,
  Signup,
  TroopTier,
  TroopType,
} from '@/types/wk'

function sig(opts: {
  id: string
  ign?: string
  tag?: string
  tier?: TroopTier
  type?: TroopType
  rally?: number | null
}): Signup {
  return {
    id: opts.id,
    event_id: 'e',
    ign: opts.ign ?? opts.id,
    alliance_tag: opts.tag ?? 'WQR',
    server: 'S724',
    tier: opts.tier ?? 11,
    troop_type: opts.type ?? 'rider',
    max_solo_lair: 5,
    rally_size: opts.rally ?? null,
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
    checklist: {},
    edit_token: 't',
    submitted_at: '2026-05-30T10:00:00Z',
  }
}

function asg(opts: {
  signupId: string
  building: Assignment['building']
  shift?: ShiftNumber
  captain?: boolean
}): Assignment {
  return {
    id: `a-${opts.signupId}`,
    event_id: 'e',
    signup_id: opts.signupId,
    building: opts.building,
    shift: opts.shift ?? 1,
    is_captain: opts.captain ?? false,
    position: 0,
    captain_present: null,
    updated_at: '',
  }
}

const baseEvent: EventConfig = {
  id: 'wk-2026-06-06',
  starts_at_utc: '2026-06-06T10:00:00Z',
  shift_count: 1,
  turret_mode: 'duplicate-strongest',
  home_server: 'S724',
  notes: null,
  state_grade: null,
  governor_ign: null,
  assessor_ign: null,
  negotiator_ign: null,
  foreign_targets: null,
  signup_token: 'x',
  planner_token: 'x',
  board_token: 'x',
  hub_defender_target: 0,
  king_sword_recipient_ign: null,
  king_sword_grade: null,
  coffer_collected_at: null,
  coffer_notes: null,
  created_at: '',
}

describe('formatPlazaAsText', () => {
  it('renders header + empty buildings', () => {
    const out = formatPlazaAsText(baseEvent, [], [], 1)
    expect(out).toContain('=== Shift 1 / wk-2026-06-06 / S724 ===')
    expect(out).toContain('HUB  (empty)')
  })

  it('formats hub with captain + members', () => {
    const signups = [
      sig({ id: 'cap', ign: 'WhalerKing', tier: 13, type: 'rider', rally: 4_000_000 }),
      sig({ id: 'def', ign: 'IronVeil', tier: 11, type: 'rider' }),
    ]
    const assignments = [
      asg({ signupId: 'cap', building: 'hub', captain: true }),
      asg({ signupId: 'def', building: 'hub' }),
    ]
    const out = formatPlazaAsText(baseEvent, signups, assignments, 1)
    expect(out).toContain('HUB  C:WhalerKing [WQR] T13 R 4.0M')
    expect(out).toContain('  IronVeil [WQR] T11 R')
  })

  it('annotates hit-squad with foreign targets', () => {
    const ev = { ...baseEvent, foreign_targets: ['S850', 'S612'] }
    const signups = [sig({ id: 'h1', ign: 'WhaleHit', tier: 13 })]
    const assignments = [asg({ signupId: 'h1', building: 'hit-squad' })]
    const out = formatPlazaAsText(ev, signups, assignments, 1)
    expect(out).toContain('Hit -> S850, S612 (1):')
    expect(out).toContain('  WhaleHit [WQR] T13 R')
  })

  it('compacts mud and reserve to one line', () => {
    const signups = [
      sig({ id: 'm1', ign: 'Mudder1' }),
      sig({ id: 'm2', ign: 'Mudder2' }),
      sig({ id: 'r1', ign: 'Reserver' }),
    ]
    const assignments = [
      asg({ signupId: 'm1', building: 'mud' }),
      asg({ signupId: 'm2', building: 'mud' }),
      asg({ signupId: 'r1', building: 'reserve' }),
    ]
    const out = formatPlazaAsText(baseEvent, signups, assignments, 1)
    expect(out).toContain('Mud (2): Mudder1, Mudder2')
    expect(out).toContain('Res (1): Reserver')
  })
})

describe('formatNapAsText', () => {
  it('handles empty list', () => {
    expect(formatNapAsText([], 'wk-test')).toContain('(no entries)')
  })

  it('renders a window-bound agreed NAP', () => {
    const term: NapTerm = {
      id: 'n1',
      event_id: 'e',
      with_state: 'S850',
      terms: 'No T11+ in Hub\nMud-sit allowed',
      status: 'agreed',
      starts_at_utc: '2026-06-06T18:00:00Z',
      ends_at_utc: '2026-06-08T18:00:00Z',
      created_at: '',
      updated_at: '',
    }
    const out = formatNapAsText([term], 'wk-2026-06-06')
    expect(out).toContain('vs S850 [AGREED]')
    expect(out).toContain('2026-06-06 18:00 -> 2026-06-08 18:00 UTC')
    expect(out).toContain('  No T11+ in Hub')
    expect(out).toContain('  Mud-sit allowed')
  })

  it('omits the window line for open-ended NAPs', () => {
    const term: NapTerm = {
      id: 'n1',
      event_id: 'e',
      with_state: 'S612',
      terms: 'proposed truce',
      status: 'proposed',
      starts_at_utc: null,
      ends_at_utc: null,
      created_at: '',
      updated_at: '',
    }
    const out = formatNapAsText([term], 'wk-test')
    expect(out).not.toContain('UTC')
    expect(out).toContain('vs S612 [PROPOSED]')
  })
})
