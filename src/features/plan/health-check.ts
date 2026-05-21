import type { Assignment, EventConfig, ShiftNumber, Signup, TroopType } from '@/types/wk'
import { TURRETS, parseShiftPref } from '@/types/wk'

export type HealthLevel = 'ok' | 'warn' | 'error' | 'info'

export interface HealthItem {
  level: HealthLevel
  label: string
  /** Extra context shown on hover */
  detail?: string
}

const ALL_TYPES: TroopType[] = ['fighter', 'shooter', 'rider']

/**
 * Pre-event / mid-event readiness signals for the current shift. Pure function
 * so it's testable and the panel can re-render cheaply on every realtime tick.
 *
 * The list is intentionally short — Marcel scans this in 3 seconds before
 * the event window opens to decide "ready or scramble?".
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
    label: `Pool: ${pool.length} Spieler in Shift ${shift}`,
    detail: `${signups.length} Sign-ups total`,
  })

  const hubCap = shiftAssignments.find((a) => a.building === 'hub' && a.is_captain)
  if (!hubCap) {
    items.push({
      level: 'error',
      label: 'Hub ohne Captain',
      detail: 'Auto-Sort oder manuell zuweisen — ohne Hub-Captain kein Super Reinforcement.',
    })
  } else {
    const cap = signups.find((s) => s.id === hubCap.signup_id)
    items.push({
      level: 'ok',
      label: `Hub-Captain: ${cap?.ign ?? '?'}`,
      detail: cap ? `${cap.troop_type} · T${cap.tier} · Rally ${cap.rally_size ?? '?'}` : undefined,
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
      label: `${missing.length}/4 Türme ohne Captain`,
      detail: missing.map((m) => m.turret.replace('turret-', '').toUpperCase()).join(', '),
    })
  } else {
    items.push({ level: 'ok', label: 'Alle 4 Türme haben einen Captain' })
  }

  for (const type of ALL_TYPES) {
    const count = pool.filter((s) => s.troop_type === type).length
    if (count === 0) {
      items.push({
        level: 'warn',
        label: `0× ${type} im Pool`,
        detail: 'Kein Captain dieses Typs möglich — Mixed-Turm wird unvermeidbar.',
      })
    } else if (count === 1) {
      items.push({
        level: 'warn',
        label: `Nur 1× ${type}`,
        detail: 'Knappes Backup falls Captain ausfällt.',
      })
    }
  }

  const willingNotAssigned = pool.filter(
    (s) => s.willing_captain && !assignedIds.has(s.id),
  ).length
  if (willingNotAssigned > 0) {
    items.push({
      level: 'info',
      label: `${willingNotAssigned} willige Captains nicht zugewiesen`,
      detail: 'Auto-Sort drücken oder manuell in Reserve/Hit-Squad parken.',
    })
  }

  if (event.foreign_targets && event.foreign_targets.length > 0) {
    const hitSquadCount = shiftAssignments.filter((a) => a.building === 'hit-squad').length
    if (hitSquadCount === 0) {
      items.push({
        level: 'warn',
        label: `${event.foreign_targets.length} Foreign-Target(s) ohne Hit-Squad`,
        detail: `Ziele: ${event.foreign_targets.join(', ')}`,
      })
    } else {
      items.push({ level: 'ok', label: `Hit-Squad: ${hitSquadCount} captain(s)` })
    }
  }

  const hubDefenders = shiftAssignments.filter(
    (a) => a.building === 'hub' && !a.is_captain,
  ).length
  const hubTarget = event.hub_defender_target
  if (hubTarget > 0 && hubDefenders < hubTarget) {
    items.push({
      level: hubDefenders === 0 ? 'warn' : 'info',
      label: `Hub-Defender: ${hubDefenders}/${hubTarget}`,
      detail: 'Same-type defenders für Super-Reinforcement-Stack.',
    })
  }

  const absent = shiftAssignments.filter(
    (a) => a.is_captain && a.captain_present === false,
  )
  if (absent.length > 0) {
    items.push({
      level: 'error',
      label: `${absent.length} Captain(s) abwesend`,
      detail: 'Reinforcer sollten umrouten — Super Reinforcement gebrochen.',
    })
  }

  return items
}
