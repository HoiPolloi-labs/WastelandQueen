import { describe, it, expect } from 'vitest'
import { healthCheck } from './health-check'
import type {
  Assignment,
  EventConfig,
  ShiftNumber,
  Signup,
  TroopTier,
  TroopType,
} from '@/types/wk'

function s(opts: {
  id: string
  type?: TroopType
  tier?: TroopTier
  captain?: boolean
  shifts?: string
}): Signup {
  return {
    id: opts.id,
    event_id: 'e',
    ign: opts.id,
    alliance_tag: 'WQR',
    server: 'S724',
    tier: opts.tier ?? 10,
    troop_type: opts.type ?? 'fighter',
    max_solo_lair: 5,
    rally_size: 1_000_000,
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
    edit_token: 't',
    submitted_at: '2026-05-30T10:00:00Z',
  }
}

function a(opts: {
  id?: string
  signupId: string
  building: Assignment['building']
  shift?: ShiftNumber
  captain?: boolean
  present?: boolean | null
}): Assignment {
  return {
    id: opts.id ?? `a-${opts.signupId}`,
    event_id: 'e',
    signup_id: opts.signupId,
    building: opts.building,
    shift: opts.shift ?? 1,
    is_captain: opts.captain ?? false,
    position: 0,
    captain_present: opts.present ?? null,
    updated_at: '',
  }
}

const baseEvent: EventConfig = {
  id: 'e',
  starts_at_utc: '2026-06-06T18:00:00Z',
  shift_count: 1,
  turret_mode: 'duplicate-strongest',
  home_server: 'S724',
  notes: null,
  state_grade: null,
  governor_ign: null,
  assessor_ign: null,
  negotiator_ign: null,
  foreign_targets: null,
  signup_token: '00000000-0000-0000-0000-000000000000',
  planner_token: '00000000-0000-0000-0000-000000000000',
  board_token: '00000000-0000-0000-0000-000000000000',
  hub_defender_target: 0,
  king_sword_recipient_ign: null,
  king_sword_grade: null,
  coffer_collected_at: null,
  coffer_notes: null,
  created_at: '',
}

describe('healthCheck', () => {
  it('flags missing Hub captain as error', () => {
    const items = healthCheck([s({ id: 'a' })], [], baseEvent, 1)
    expect(items.some((i) => i.level === 'error' && i.label.includes('Hub'))).toBe(true)
  })

  it('marks Hub captain as ok when assigned', () => {
    const sig = s({ id: 'cap', captain: true })
    const items = healthCheck(
      [sig],
      [a({ signupId: 'cap', building: 'hub', captain: true })],
      baseEvent,
      1,
    )
    expect(items.some((i) => i.level === 'ok' && i.label.includes('Hub-Captain'))).toBe(true)
  })

  it('warns when type pool is thin', () => {
    const items = healthCheck(
      [s({ id: 'a', type: 'fighter' })],
      [],
      baseEvent,
      1,
    )
    // Only fighter present; shooter + rider missing
    expect(items.filter((i) => i.label.includes('shooter')).length).toBe(1)
    expect(items.filter((i) => i.label.includes('rider')).length).toBe(1)
  })

  it('errors on absent captain', () => {
    const items = healthCheck(
      [s({ id: 'cap', captain: true })],
      [a({ signupId: 'cap', building: 'hub', captain: true, present: false })],
      baseEvent,
      1,
    )
    expect(items.some((i) => i.level === 'error' && i.label.includes('abwesend'))).toBe(true)
  })

  it('flags foreign targets without hit-squad', () => {
    const ev: EventConfig = { ...baseEvent, foreign_targets: ['S850'] }
    const items = healthCheck([s({ id: 'a' })], [], ev, 1)
    expect(
      items.some((i) => i.level === 'warn' && i.label.includes('Hit-Squad')),
    ).toBe(true)
  })

  it('only counts pool members for the requested shift', () => {
    const items = healthCheck(
      [
        s({ id: 'shift1', shifts: '1' }),
        s({ id: 'shift2', shifts: '2' }),
      ],
      [],
      { ...baseEvent, shift_count: 2 },
      1,
    )
    expect(items[0]!.label).toBe('Pool: 1 Spieler in Shift 1')
  })
})
