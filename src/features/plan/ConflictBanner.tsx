import { AlertTriangle, Lightbulb } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { Assignment, ShiftNumber, Signup, TroopType } from '@/types/wk'
import { TURRETS, parseShiftPref } from '@/types/wk'
import { captainScore } from './auto-sort'

interface ConflictBannerProps {
  shift: ShiftNumber
  signups: Signup[]
  assignments: Assignment[]
}

type Conflict = { kind: 'error' | 'warn' | 'hint'; msg: string }

function detectConflicts(
  shift: ShiftNumber,
  signups: Signup[],
  assignments: Assignment[],
  t: TFunction,
): Conflict[] {
  const out: Conflict[] = []
  const shiftAssigns = assignments.filter((a) => a.shift === shift)
  const assignedIds = new Set(shiftAssigns.map((a) => a.signup_id))
  const shiftPool = signups.filter((s) => parseShiftPref(s.shift_pref).includes(shift))
  const idToSignup = new Map(signups.map((s) => [s.id, s]))

  const hubAssigns = shiftAssigns.filter((a) => a.building === 'hub')
  const hubCaptainId = hubAssigns.find((a) => a.is_captain)?.signup_id
  const hubCaptain = hubCaptainId ? idToSignup.get(hubCaptainId) : null

  if (hubAssigns.length === 0) {
    out.push({ kind: 'warn', msg: t('conflict.hub_empty') })
  } else if (!hubCaptain) {
    out.push({ kind: 'error', msg: t('conflict.hub_no_captain') })
  } else {
    const stronger = shiftPool
      .filter((s) => s.willing_captain && s.id !== hubCaptain.id)
      .filter((s) => captainScore(s) > captainScore(hubCaptain) + 5)
      .sort((a, b) => captainScore(b) - captainScore(a))[0]
    if (stronger) {
      out.push({
        kind: 'hint',
        msg: t('conflict.stronger_hub_captain', {
          ign: stronger.ign,
          score: Math.round(captainScore(stronger)),
          currentScore: Math.round(captainScore(hubCaptain)),
        }),
      })
    }
  }

  for (const turret of TURRETS) {
    const list = shiftAssigns.filter((a) => a.building === turret)
    if (list.length === 0) continue
    const members = list
      .map((a) => idToSignup.get(a.signup_id))
      .filter((s): s is Signup => Boolean(s))
    const captainId = list.find((a) => a.is_captain)?.signup_id
    const captain = captainId ? idToSignup.get(captainId) : null
    const turretLabel = turret.toUpperCase()

    if (!captain) {
      out.push({ kind: 'warn', msg: t('conflict.turret_no_captain', { turret: turretLabel }) })
    } else {
      const stronger = shiftPool
        .filter(
          (s) =>
            s.willing_captain &&
            s.troop_type === captain.troop_type &&
            s.id !== captain.id,
        )
        .filter((s) => captainScore(s) > captainScore(captain) + 5)
        .sort((a, b) => captainScore(b) - captainScore(a))[0]
      if (stronger && !assignedIds.has(stronger.id)) {
        out.push({
          kind: 'hint',
          msg: t('conflict.stronger_turret_captain', {
            turret: turretLabel,
            ign: stronger.ign,
            score: Math.round(captainScore(stronger)),
            currentScore: Math.round(captainScore(captain)),
          }),
        })
      }
    }

    const types = new Set(members.map((m) => m.troop_type as TroopType))
    if (types.size > 1) {
      out.push({
        kind: 'warn',
        msg: t('conflict.mixed_types', { turret: turretLabel }),
      })
    }
  }

  return out
}

export function ConflictBanner({ shift, signups, assignments }: ConflictBannerProps) {
  const { t } = useTranslation()
  const conflicts = detectConflicts(shift, signups, assignments, t)
  if (conflicts.length === 0) {
    return (
      <div className="rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
        {t('conflict.no_conflicts')}
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {conflicts.map((c, i) => {
        const tone =
          c.kind === 'error'
            ? 'border-red-500/40 bg-red-500/5 text-red-300'
            : c.kind === 'warn'
              ? 'border-amber-500/40 bg-amber-500/5 text-amber-300'
              : 'border-sky-500/40 bg-sky-500/5 text-sky-200'
        const Icon = c.kind === 'hint' ? Lightbulb : AlertTriangle
        return (
          <li
            key={i}
            className={`flex items-start gap-2 rounded border px-3 py-1.5 text-xs ${tone}`}
          >
            <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{c.msg}</span>
          </li>
        )
      })}
    </ul>
  )
}
