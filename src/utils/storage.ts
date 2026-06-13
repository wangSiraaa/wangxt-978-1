const PREFIX = 'laundry_'

function get<T>(key: string, defaultValue: T | null = null): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return defaultValue
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

function remove(key: string): void {
  localStorage.removeItem(PREFIX + key)
}

function clearAll(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k))
}

function has(key: string): boolean {
  return localStorage.getItem(PREFIX + key) !== null
}

export const storage = {
  get,
  set,
  remove,
  clearAll,
  has,
}
