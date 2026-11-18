import { pickDailyWeights } from '../../../supabase/functions/_shared/daily-weight.logic'

describe('pickDailyWeights', () => {
  it('하루에 여러 기록이 있으면 기상 직후 값을 고른다', () => {
    const picked = pickDailyWeights([
      { weight_date: '2026-11-18', weight_kg: 68.9, measured_timing: 'after_workout', created_at: '2026-11-18T01:00:00Z' },
      { weight_date: '2026-11-18', weight_kg: 68.1, measured_timing: 'morning', created_at: '2026-11-18T12:00:00Z' },
      { weight_date: '2026-11-18', weight_kg: 69.4, measured_timing: 'evening', created_at: '2026-11-18T13:00:00Z' },
    ])
    expect(picked.map((w) => w.weight_kg)).toEqual([68.1])
  })

  it('기상 직후 기록이 없으면 그날 먼저 넣은 기록을 고른다', () => {
    const picked = pickDailyWeights([
      { weight_date: '2026-11-18', weight_kg: 69.4, measured_timing: null, created_at: '2026-11-18T13:00:00Z' },
      { weight_date: '2026-11-18', weight_kg: 68.7, measured_timing: 'afternoon', created_at: '2026-11-18T05:00:00Z' },
    ])
    expect(picked.map((w) => w.weight_kg)).toEqual([68.7])
  })

  it('기상 직후 기록이 둘이면 먼저 넣은 값을 고른다', () => {
    const picked = pickDailyWeights([
      { weight_date: '2026-11-18', weight_kg: 68.3, measured_timing: 'morning', created_at: '2026-11-18T02:00:00Z' },
      { weight_date: '2026-11-18', weight_kg: 68.1, measured_timing: 'morning', created_at: '2026-11-18T01:00:00Z' },
    ])
    expect(picked.map((w) => w.weight_kg)).toEqual([68.1])
  })

  it('날짜마다 하나씩 날짜 오름차순으로 돌려준다', () => {
    const picked = pickDailyWeights([
      { weight_date: '2026-11-18', weight_kg: 68 },
      { weight_date: '2026-11-16', weight_kg: 69 },
      { weight_date: '2026-11-17', weight_kg: 68.5 },
      { weight_date: '2026-11-17', weight_kg: 70 },
    ])
    expect(picked.map((w) => [w.weight_date, w.weight_kg])).toEqual([
      ['2026-11-16', 69],
      ['2026-11-17', 68.5],
      ['2026-11-18', 68],
    ])
  })

  it('기록이 없으면 빈 배열', () => {
    expect(pickDailyWeights([])).toEqual([])
  })
})
