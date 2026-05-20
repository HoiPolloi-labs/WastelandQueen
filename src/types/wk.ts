/**
 * Domain types for the Wasteland King (WK) event.
 * See docs/wasteland-king-guide.md for mechanics background.
 */

export type TroopTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export type TroopType = 'fighter' | 'shooter' | 'rider'

export type StateGrade =
  | 'starter'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'legend'

export type Turret = 'north' | 'south' | 'east' | 'west'
export type Building = Turret | 'hub'

export interface Player {
  id: string
  ign: string
  discordHandle?: string
  mightTrue?: number
  rallySize?: number
  mainTroopType?: TroopType
  highestTier?: TroopTier
  hasAgentX?: boolean
  agentXRedStars?: number
  hasDrJ?: boolean
  natalyLevel?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export type ShiftRole = 'captain' | 'defender' | 'mudsitter' | 'hit-squad' | 'reserve'

export interface Shift {
  id: string
  building: Building | 'mud' | 'foreign-hub'
  startUtc: string
  endUtc: string
  playerIds: string[]
  captainPlayerId?: string
  role: ShiftRole
  notes?: string
}

export interface NapTerm {
  id: string
  withState: string
  text: string
  startsAtUtc?: string
  endsAtUtc?: string
  status: 'proposed' | 'agreed' | 'broken' | 'expired'
}

export interface ScoreEntry {
  id: string
  playerId: string
  source: 'kill' | 'death' | 'occupation'
  points: number
  recordedAt: string
  note?: string
}

/**
 * Per the pnsdme.com point chart.
 * Kill points = points YOU earn for killing enemy units (at Hub/turrets OR in mud/foreign RSS tiles).
 * Death points = points YOU earn when YOUR troops die (Hub or turret only — mud deaths don't count).
 */
export const KILL_POINTS: Record<TroopTier, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 8,
  5: 12,
  6: 16,
  7: 20,
  8: 30,
  9: 40,
  10: 60,
  11: 80,
  12: 100,
}

export const DEATH_POINTS: Record<TroopTier, number> = {
  1: 4,
  2: 6,
  3: 8,
  4: 12,
  5: 15,
  6: 20,
  7: 25,
  8: 33,
  9: 45,
  10: 60,
  11: 80,
  12: 100,
}

export const OCCUPATION_CAP_POINTS = 2000
export const OCCUPATION_CAP_MINUTES = 120
export const PERSONAL_REWARD_TARGET = 10_000
