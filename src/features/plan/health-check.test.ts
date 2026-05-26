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
    march_size: null,
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
    foreign_target: null,
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
  heroes_enabled: false,
  auto_fill_to_capacity: false,
  created_at: '',
}

describe('healthCheck', () => {
  it('flags missing Hub captain as error', () => {
    const items = healthCheck([s({ id: 'a' })], [], baseEvent, 1)
    expect(items.some((i) => i.level === 'error' && i.labelKey === 'health.hub_no_captain')).toBe(true)
  })

  it('marks Hub captain as ok when assigned', () => {
    const sig = s({ id: 'cap', captain: true })
    const items = healthCheck(
      [sig],
      [a({ signupId: 'cap', building: 'hub', captain: true })],
      baseEvent,
      1,
    )
    expect(items.some((i) => i.level === 'ok' && i.labelKey === 'health.hub_captain')).toBe(true)
  })

  it('warns when type pool is thin', () => {
    const items = healthCheck(
      [s({ id: 'a', type: 'fighter' })],
      [],
      baseEvent,
      1,
    )
    // Only fighter present; shooter + rider missing
    expect(items.filter((i) => i.labelParams?.type === 'shooter').length).toBe(1)
    expect(items.filter((i) => i.labelParams?.type === 'rider').length).toBe(1)
  })

  it('errors on absent captain', () => {
    const items = healthCheck(
      [s({ id: 'cap', captain: true })],
      [a({ signupId: 'cap', building: 'hub', captain: true, present: false })],
      baseEvent,
      1,
    )
    expect(items.some((i) => i.level === 'error' && i.labelKey === 'health.captains_absent')).toBe(true)
  })

  it('flags foreign targets without hit-squad', () => {
    const ev: EventConfig = { ...baseEvent, foreign_targets: ['S850'] }
    const items = healthCheck([s({ id: 'a' })], [], ev, 1)
    expect(
      items.some((i) => i.level === 'warn' && i.labelKey === 'health.foreign_targets_no_squad'),
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
    expect(items[0]!.labelKey).toBe('health.pool_info')
    expect(items[0]!.labelParams).toEqual({ count: 1, shift: 1 })
  })

  // Coverage backfill: previously uncovered ok/info branches
  it('marks all-turrets-have-captains as ok when each of the 4 turrets has one', () => {
    // Signal only fires when ALL four turrets (N/S/E/W) have a captain flag.
    const items = healthCheck(
      [
        s({ id: 'hc', type: 'fighter', captain: true }),
        s({ id: 'fc1', type: 'fighter', captain: true }),
        s({ id: 'fc2', type: 'fighter', captain: true }),
        s({ id: 'sc', type: 'shooter', captain: true }),
        s({ id: 'rc', type: 'rider', captain: true }),
      ],
      [
        a({ signupId: 'hc', building: 'hub', captain: true }),
        a({ signupId: 'fc1', building: 'turret-n', captain: true }),
        a({ signupId: 'fc2', building: 'turret-s', captain: true }),
        a({ signupId: 'sc', building: 'turret-e', captain: true }),
        a({ signupId: 'rc', building: 'turret-w', captain: true }),
      ],
      baseEvent,
      1,
    )
    expect(items.some((i) => i.level === 'ok' && i.labelKey === 'health.all_turrets_have_captains')).toBe(true)
  })

  it('reports willing captains not yet assigned as info', () => {
    const items = healthCheck(
      [
        s({ id: 'cap', type: 'fighter', captain: true }),
        s({ id: 'spare', type: 'shooter', captain: true }),
      ],
      [a({ signupId: 'cap', building: 'hub', captain: true })],
      baseEvent,
      1,
    )
    expect(
      items.some(
        (i) => i.level === 'info' && i.labelKey === 'health.willing_captains_unassigned',
      ),
    ).toBe(true)
  })

  it('marks hit-squad coverage as ok when foreign targets have squad members', () => {
    const ev: EventConfig = { ...baseEvent, foreign_targets: ['S850'] }
    const items = healthCheck(
      [
        s({ id: 'cap', captain: true }),
        s({ id: 'hs', type: 'fighter', captain: true }),
      ],
      [
        a({ signupId: 'cap', building: 'hub', captain: true }),
        a({ signupId: 'hs', building: 'hit-squad', captain: true }),
      ],
      ev,
      1,
    )
    expect(
      items.some((i) => i.level === 'ok' && i.labelKey === 'health.hit_squad_captains'),
    ).toBe(true)
  })

  it('flags hub_defender_target shortfall (info when partial, warn when zero)', () => {
    const ev: EventConfig = { ...baseEvent, hub_defender_target: 4 }
    // Hub captain present + 2 defenders → info (partial)
    const partial = healthCheck(
      [
        s({ id: 'cap', captain: true }),
        s({ id: 'd1' }),
        s({ id: 'd2' }),
      ],
      [
        a({ signupId: 'cap', building: 'hub', captain: true }),
        a({ signupId: 'd1', building: 'hub' }),
        a({ signupId: 'd2', building: 'hub' }),
      ],
      ev,
      1,
    )
    const partialItem = partial.find((i) => i.labelKey === 'health.hub_defenders')
    expect(partialItem?.level).toBe('info')
    expect(partialItem?.labelParams).toEqual({ count: 2, target: 4 })

    // Hub captain only, 0 defenders → warn
    const empty = healthCheck(
      [s({ id: 'cap', captain: true })],
      [a({ signupId: 'cap', building: 'hub', captain: true })],
      ev,
      1,
    )
    const emptyItem = empty.find((i) => i.labelKey === 'health.hub_defenders')
    expect(emptyItem?.level).toBe('warn')
  })
})
