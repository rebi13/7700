/**
 * 시차 버그를 잡는 테스트라 시간대를 고정한다. 이 줄이 없으면 CI 가 UTC 로 돌 때
 * 어긋남이 0 이 되어 회귀를 놓친다. Node 는 실행 중 TZ 변경을 반영한다.
 */
// 이 앱은 브라우저용이라 @types/node 를 두지 않는다. 여기서만 최소로 선언한다.
declare const process: { env: Record<string, string> }
process.env.TZ = 'Asia/Seoul'

import {
  addDays,
  formatDate,
  formatDateShort,
  getDaysRemaining,
  todayISO,
  toISODate,
} from '@/utils/date'

/** 로컬 시각으로 Date 를 만든다 (월은 0-based) */
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min)

describe('toISODate', () => {
  it('로컬 날짜를 그대로 쓴다', () => {
    expect(toISODate(at(2026, 8, 30))).toBe('2026-08-30')
  })

  /**
   * 핵심 회귀 테스트. toISOString() 은 UTC 라 KST 00:30 을 전날 15:30 으로 본다.
   * 이 버그가 있으면 새벽에 기록한 식사가 어제 날짜로 저장된다.
   */
  it('자정 직후에도 오늘 날짜를 준다', () => {
    expect(toISODate(at(2026, 8, 30, 0, 30))).toBe('2026-08-30')
  })

  it('오전 9시 이전 전 구간에서 날짜가 밀리지 않는다', () => {
    for (const h of [0, 1, 3, 6, 8]) {
      expect(toISODate(at(2026, 8, 30, h))).toBe('2026-08-30')
    }
  })

  it('밤 늦은 시각에도 날짜가 앞당겨지지 않는다', () => {
    expect(toISODate(at(2026, 8, 30, 23, 59))).toBe('2026-08-30')
  })

  it('한 자리 월·일을 0 으로 채운다', () => {
    expect(toISODate(at(2026, 1, 5))).toBe('2026-01-05')
  })
})

describe('todayISO', () => {
  it('로컬 기준 오늘과 같다', () => {
    const now = new Date()
    expect(todayISO()).toBe(toISODate(now))
  })
})

describe('addDays', () => {
  it('날짜를 더한다', () => {
    expect(addDays('2026-08-30', 5)).toBe('2026-09-04')
  })

  it('음수로 뺀다', () => {
    expect(addDays('2026-08-30', -1)).toBe('2026-08-29')
  })

  it('달을 넘긴다', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
  })

  it('해를 넘긴다', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('여러 번 더해도 밀리지 않는다', () => {
    // 문자열 → Date → 문자열 왕복에서 시차가 새면 여기서 하루씩 어긋난다.
    let d = '2026-08-30'
    for (let i = 0; i < 10; i++) d = addDays(d, 1)
    expect(d).toBe('2026-09-09')
  })
})

describe('formatDate', () => {
  it('날짜 문자열을 로컬 날짜 그대로 읽는다', () => {
    // new Date('2026-08-30') 은 UTC 자정 → KST 오전 9시라 우연히 맞지만,
    // 서쪽 시간대에서는 하루 전으로 밀린다. 문자열은 로컬 자정으로 읽어야 한다.
    expect(formatDate('2026-08-30')).toBe('2026년 8월 30일')
  })

  it('Date 객체도 받는다', () => {
    expect(formatDate(at(2026, 8, 30))).toBe('2026년 8월 30일')
  })

  it('시각이 붙은 문자열도 깨지지 않는다', () => {
    // created_at 같은 값이 들어올 수 있다.
    expect(formatDate('2026-08-30T01:00:00+09:00')).toBe('2026년 8월 30일')
  })
})

describe('formatDateShort', () => {
  it('월/일로 줄인다', () => {
    expect(formatDateShort('2026-08-30')).toBe('8/30')
  })
})

describe('getDaysRemaining', () => {
  it('오늘이면 0 이다', () => {
    expect(getDaysRemaining(todayISO())).toBe(0)
  })

  it('내일이면 1 이다', () => {
    expect(getDaysRemaining(addDays(todayISO(), 1))).toBe(1)
  })

  it('지난 날짜는 음수다', () => {
    expect(getDaysRemaining(addDays(todayISO(), -3))).toBe(-3)
  })

  it('100일 뒤를 100 으로 센다', () => {
    expect(getDaysRemaining(addDays(todayISO(), 100))).toBe(100)
  })
})
