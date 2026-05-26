import { describe, it, expect } from 'vitest'
import { computeRefreshDelayMs, decodeJwtExpMs } from './EventAuthGate'

/**
 * Helper: build a JWT-shaped string with the given exp claim (header +
 * payload + dummy signature). Signature is never verified here — these
 * helpers only inspect the payload.
 */
function jwtWithExp(exp: number | null): string {
  const header = btoa('{"alg":"HS256","typ":"JWT"}')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  const payloadObj = exp === null ? { sub: 'x' } : { sub: 'x', exp }
  const payload = btoa(JSON.stringify(payloadObj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${payload}.sig`
}

describe('decodeJwtExpMs', () => {
  it('returns exp * 1000 for a well-formed JWT', () => {
    const expSeconds = 1779872790
    expect(decodeJwtExpMs(jwtWithExp(expSeconds))).toBe(expSeconds * 1000)
  })

  it('returns 0 for a JWT without an exp claim', () => {
    expect(decodeJwtExpMs(jwtWithExp(null))).toBe(0)
  })

  it('returns 0 for a malformed JWT (not 3 segments)', () => {
    expect(decodeJwtExpMs('not.a.jwt.really')).toBe(0)
    expect(decodeJwtExpMs('only-one-segment')).toBe(0)
    expect(decodeJwtExpMs('')).toBe(0)
  })

  it('returns 0 when the payload is not valid base64url or not JSON', () => {
    expect(decodeJwtExpMs('header.@@@.sig')).toBe(0)
    // valid base64 of "not json" — decoded but JSON.parse throws
    const notJson = btoa('not json').replace(/=+$/, '')
    expect(decodeJwtExpMs(`header.${notJson}.sig`)).toBe(0)
  })
})

describe('computeRefreshDelayMs', () => {
  const now = 1_700_000_000_000

  it('schedules at exp - 5min when there is plenty of headroom', () => {
    const expMs = now + 24 * 60 * 60 * 1000 // 24h ahead
    expect(computeRefreshDelayMs(expMs, now)).toBe(24 * 60 * 60 * 1000 - 5 * 60 * 1000)
  })

  it('floors at 60s when exp is within the 5min lead window', () => {
    // exp is 4min ahead — schedule formula would give a negative delay
    const expMs = now + 4 * 60 * 1000
    expect(computeRefreshDelayMs(expMs, now)).toBe(60 * 1000)
  })

  it('floors at 60s when exp has already passed', () => {
    const expMs = now - 10 * 60 * 1000
    expect(computeRefreshDelayMs(expMs, now)).toBe(60 * 1000)
  })

  it('floors at 60s when exp is unknown (0)', () => {
    expect(computeRefreshDelayMs(0, now)).toBe(60 * 1000)
  })

  it('honors exact boundary: exp = now + LEAD + 60s yields 60s', () => {
    const expMs = now + 5 * 60 * 1000 + 60 * 1000
    expect(computeRefreshDelayMs(expMs, now)).toBe(60 * 1000)
  })

  it('honors exact boundary: exp = now + LEAD + 61s yields 61s', () => {
    const expMs = now + 5 * 60 * 1000 + 61 * 1000
    expect(computeRefreshDelayMs(expMs, now)).toBe(61 * 1000)
  })
})
