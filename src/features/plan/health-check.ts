import type { Assignment, EventConfig, ShiftNumber, Signup, TroopType } from '@/types/wk'
import { TURRETS, parseShiftPref } from '@/types/wk'

export type HealthLevel = 'ok' | 'warn' | 'error' | 'info'

/**
 * Result entries are i18n keys + params, NOT rendered strings — the panel
 * applies t() at render time. This keeps the pure function side-effect-free
 * and lets each locale render the appropriate text without re-running the
 * check.
 */
export interface HealthItem {
  level: HealthLevel
  labelKey: string
  labelParams?: Record<string, string | number>
  detailKey?: string
  detailParams?: Record<string, string | number>
  /** Pre-rendered detail string for free-form text (e.g. captain name + stats). */
  detailRaw?: string
}

const ALL_TYPES: TroopType[] = ['fighter', 'shooter', 'rider']

/**
 * Pre-event / mid-event readiness signals for the current shift. Pure
 * function so it's testable and the panel can re-render cheaply on every
 * realtime tick. Output is i18n-key shaped — see HealthItem.
 */
export function healthCheck(
  signups: Signup[],
  assignments: Assignment[],
  event: EventConfig,
  shift: ShiftNumber,
): HealthItem[] {
  const items: HealthItem[] = []

  const pool = signups.filter((s) => parseShiftPref(s.shift_pref).includes(shift))
  const shiftAssignments = assignments.filter((a) => a.shift === shift)
  const assignedIds = new Set(shiftAssignments.map((a) => a.signup_id))

  items.push({
    level: 'info',
    labelKey: 'health.pool_info',
    labelParams: { count: pool.length, shift },
    detailKey: 'health.total_signups_detail',
    detailParams: { total: signups.length },
  })

  const hubCap = shiftAssignments.find((a) => a.building === 'hub' && a.is_captain)
  if (!hubCap) {
    items.push({
      level: 'error',
      labelKey: 'health.hub_no_captain',
      detailKey: 'health.hub_no_captain_detail',
    })
  } else {
    const cap = signups.find((s) => s.id === hubCap.signup_id)
    items.push({
      level: 'ok',
      labelKey: 'health.hub_captain',
      labelParams: { ign: cap?.ign ?? '?' },
      detailRaw: cap
        ? `${cap.troop_type} · T${cap.tier} · Rally ${cap.rally_size ?? '?'}`
        : undefined,
    })
  }

  const turretCaptains = TURRETS.map((t) => ({
    turret: t,
    cap: shiftAssignments.find((a) => a.building === t && a.is_captain),
  }))
  const missing = turretCaptains.filter((t) => !t.cap)
  if (missing.length > 0) {
    items.push({
      level: 'warn',
      labelKey: 'health.turrets_missing_captains',
      labelParams: { count: missing.length },
      detailRaw: missing.map((m) => m.turret.replace('turret-', '').toUpperCase()).join(', '),
    })
  } else {
    items.push({ level: 'ok', labelKey: 'health.all_turrets_have_captains' })
  }

  for (const type of ALL_TYPES) {
    const count = pool.filter((s) => s.troop_type === type).length
    if (count === 0) {
      items.push({
        level: 'warn',
        labelKey: 'health.no_type_in_pool',
        labelParams: { type },
        detailKey: 'health.no_type_detail',
      })
    } else if (count === 1) {
      items.push({
        level: 'warn',
        labelKey: 'health.only_one_type',
        labelParams: { type },
        detailKey: 'health.only_one_type_detail',
      })
    }
  }

  const willingNotAssigned = pool.filter(
    (s) => s.willing_captain && !assignedIds.has(s.id),
  ).length
  if (willingNotAssigned > 0) {
    items.push({
      level: 'info',
      labelKey: 'health.willing_captains_unassigned',
      labelParams: { count: willingNotAssigned },
      detailKey: 'health.willing_captains_detail',
    })
  }

  if (event.foreign_targets && event.foreign_targets.length > 0) {
    const hitSquadCount = shiftAssignments.filter((a) => a.building === 'hit-squad').length
    if (hitSquadCount === 0) {
      items.push({
        level: 'warn',
        labelKey: 'health.foreign_targets_no_squad',
        labelParams: { count: event.foreign_targets.length },
        detailRaw: event.foreign_targets.join(', '),
      })
    } else {
      items.push({
        level: 'ok',
        labelKey: 'health.hit_squad_captains',
        labelParams: { count: hitSquadCount },
      })
    }
  }

  const hubDefenders = shiftAssignments.filter(
    (a) => a.building === 'hub' && !a.is_captain,
  ).length
  const hubTarget = event.hub_defender_target
  if (hubTarget > 0 && hubDefenders < hubTarget) {
    items.push({
      level: hubDefenders === 0 ? 'warn' : 'info',
      labelKey: 'health.hub_defenders',
      labelParams: { count: hubDefenders, target: hubTarget },
      detailKey: 'health.hub_defenders_detail',
    })
  }

  const absent = shiftAssignments.filter(
    (a) => a.is_captain && a.captain_present === false,
  )
  if (absent.length > 0) {
    items.push({
      level: 'error',
      labelKey: 'health.captains_absent',
      labelParams: { count: absent.length },
      detailKey: 'health.captains_absent_detail',
    })
  }

  return items
}
