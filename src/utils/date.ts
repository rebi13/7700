/**
 * 날짜는 전부 **로컬 시간대** 기준으로 다룬다.
 *
 * `toISOString()` 과 `new Date('YYYY-MM-DD')` 는 둘 다 UTC 라, 한국(UTC+9)에서는
 * 자정부터 오전 9시까지 하루가 통째로 어긋난다. 그 시간대에 기록한 식사가 어제로
 * 저장되고 홈 화면은 어제 요약을 오늘로 보여준다. 그래서 이 파일에서는
 * `toISOString()` 도 `new Date(문자열)` 도 직접 쓰지 않는다.
 */

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** 'YYYY-MM-DD' 를 로컬 자정으로 읽는다. `new Date(s)` 는 UTC 자정이라 못 쓴다. */
function parseISODate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 날짜만 있는 문자열은 로컬 자정으로, 시각까지 있는 문자열은 그대로 읽는다. */
function toDate(date: string | Date): Date {
  if (typeof date !== 'string') return date
  return ISO_DATE_ONLY.test(date) ? parseISODate(date) : new Date(date)
}

/** Date 를 'YYYY-MM-DD' 로. 로컬 기준이다. */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** 'YYYY-MM-DD' 를 로컬 자정의 Date 로. 캘린더 컴포넌트에 넘길 때 쓴다. */
export function fromISODate(date: string): Date {
  return parseISODate(date)
}

export function getDaysRemaining(targetDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = toDate(targetDate)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDate(date: string | Date): string {
  const d = toDate(date)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

export function formatDateShort(date: string | Date): string {
  const d = toDate(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function addDays(date: string, days: number): string {
  const d = toDate(date)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}
