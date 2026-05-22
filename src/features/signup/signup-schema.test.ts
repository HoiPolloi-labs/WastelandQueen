import { describe, it, expect } from 'vitest'
import { signupSchema } from './signup-schema'

const baseValid = {
  ign: 'WhalerKing',
  alliance_tag: 'wqr',
  server: 's724',
  tier: 11,
  troop_type: 'rider' as const,
  max_solo_lair: 7,
  rally_size: 1_500_000,
  true_might: 80_000_000,
  willing_captain: true,
  shift_pref: '1,2',
}

describe('signupSchema', () => {
  it('accepts a minimal valid payload', () => {
    const r = signupSchema.safeParse(baseValid)
    expect(r.success).toBe(true)
  })

  it('uppercases alliance_tag and server', () => {
    const r = signupSchema.safeParse(baseValid)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.alliance_tag).toBe('WQR')
      expect(r.data.server).toBe('S724')
    }
  })

  it('rejects alliance_tag longer than 4 chars', () => {
    const r = signupSchema.safeParse({ ...baseValid, alliance_tag: 'TOOLONG' })
    expect(r.success).toBe(false)
  })

  it('rejects server without S-prefix', () => {
    const r = signupSchema.safeParse({ ...baseValid, server: '724' })
    expect(r.success).toBe(false)
  })

  it('accepts tier 1..13', () => {
    expect(signupSchema.safeParse({ ...baseValid, tier: 1 }).success).toBe(true)
    expect(signupSchema.safeParse({ ...baseValid, tier: 13 }).success).toBe(true)
  })

  it('rejects tier out of 1..13', () => {
    expect(signupSchema.safeParse({ ...baseValid, tier: 0 }).success).toBe(false)
    expect(signupSchema.safeParse({ ...baseValid, tier: 14 }).success).toBe(false)
  })

  it('rejects unknown troop_type', () => {
    const r = signupSchema.safeParse({ ...baseValid, troop_type: 'mage' })
    expect(r.success).toBe(false)
  })

  it('accepts null true_might (rally_size now required)', () => {
    const r = signupSchema.safeParse({
      ...baseValid,
      true_might: null,
    })
    expect(r.success).toBe(true)
  })

  it('rejects negative or zero rally_size', () => {
    expect(signupSchema.safeParse({ ...baseValid, rally_size: -1 }).success).toBe(false)
    expect(signupSchema.safeParse({ ...baseValid, rally_size: 0 }).success).toBe(false)
  })

  it('rejects missing rally_size', () => {
    const { rally_size: _omit, ...withoutRally } = baseValid
    void _omit
    expect(signupSchema.safeParse(withoutRally).success).toBe(false)
  })

  it.each(['1', '2', '1,2', '1,3,4', '1,2,3,4'])(
    'accepts shift_pref %s',
    (pref) => {
      const r = signupSchema.safeParse({ ...baseValid, shift_pref: pref })
      expect(r.success).toBe(true)
    },
  )

  it.each(['', '5', '1,5', '1 2', 'abc'])(
    'rejects shift_pref %s',
    (pref) => {
      const r = signupSchema.safeParse({ ...baseValid, shift_pref: pref })
      expect(r.success).toBe(false)
    },
  )

  it('trims and requires IGN', () => {
    expect(signupSchema.safeParse({ ...baseValid, ign: '   ' }).success).toBe(false)
    expect(signupSchema.safeParse({ ...baseValid, ign: 'a'.repeat(33) }).success).toBe(false)
  })
})
