/**
 * Tiny localStorage wrapper with JSON serialization and a versioned namespace.
 * Swap-in candidate: replace with a fetch-based client when a backend lands.
 */

const NAMESPACE = 'wq/v1'

function key(name: string): string {
  return `${NAMESPACE}:${name}`
}

export function load<T>(name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(name))
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save<T>(name: string, value: T): void {
  localStorage.setItem(key(name), JSON.stringify(value))
}

export function remove(name: string): void {
  localStorage.removeItem(key(name))
}

export function exportAll(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(`${NAMESPACE}:`)) {
      const short = k.slice(NAMESPACE.length + 1)
      const raw = localStorage.getItem(k)
      out[short] = raw === null ? null : JSON.parse(raw)
    }
  }
  return out
}

export function importAll(data: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(data)) {
    save(name, value)
  }
}
