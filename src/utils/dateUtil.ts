const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function formatDate(date: Date | string | number, pattern: string = 'YYYY-MM-DD'): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return pattern
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

export function formatDateTime(date: Date | string | number): string {
  return formatDate(date, 'YYYY-MM-DD HH:mm')
}

export function daysBetween(from: Date | string | number, to: Date | string | number): number {
  const fromDate = new Date(from)
  const toDate = new Date(to)

  const fromMidnight = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime()
  const toMidnight = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate()).getTime()

  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((toMidnight - fromMidnight) / msPerDay)
}

export function isOverdue(estimatedFinishAt: Date | string | number, now: Date = new Date()): boolean {
  return daysBetween(estimatedFinishAt, now) > 3
}

export function getOverdueDays(estimatedFinishAt: Date | string | number, now: Date = new Date()): number {
  const diff = daysBetween(estimatedFinishAt, now)
  return diff > 3 ? diff - 3 : 0
}

export function addDays(date: Date | string | number, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function startOfDay(date: Date | string | number): Date {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function isSameDay(d1: Date | string | number, d2: Date | string | number): boolean {
  const a = new Date(d1)
  const b = new Date(d2)
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function relativeTime(date: Date | string | number): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  return formatDate(target)
}

export function parseDate(str: string): Date | null {
  if (!DATE_PATTERN.test(str)) return null
  const [year, month, day] = str.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return isNaN(d.getTime()) ? null : d
}
