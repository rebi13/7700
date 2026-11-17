import {
  buildParseUserMessage,
  parseParseResponse,
} from '../../../supabase/functions/_shared/parse-log.logic'

describe('buildParseUserMessage', () => {
  it('체중이 있으면 운동 칼로리 계산용으로 함께 보낸다', () => {
    expect(buildParseUserMessage(' 점심 김치찌개 ', 68.2)).toBe(
      '기록: 점심 김치찌개\n사용자 체중: 68.2kg (운동 소모 칼로리 계산에 사용)'
    )
  })

  it('체중이 없으면 기록만 보낸다', () => {
    expect(buildParseUserMessage('점심 김치찌개', null)).toBe('기록: 점심 김치찌개')
  })
})

describe('parseParseResponse', () => {
  const meal = {
    kind: 'meal',
    day_offset: 0,
    meal_type: 'lunch',
    food_name: '회사 앞 김치찌개',
    calories: 650.4,
    protein_g: 30.04,
    carbs_g: 50,
    fat_g: 20,
    confidence: 'medium',
    note: '돼지고기 김치찌개',
  }

  it('식사·운동·체중을 각각 읽는다', () => {
    const items = parseParseResponse({
      items: [
        meal,
        { kind: 'exercise', day_offset: 0, exercise_name: '러닝', duration_minutes: 30, calories_burned: 300 },
        { kind: 'weight', day_offset: 0, weight_kg: 68.25 },
      ],
    })
    expect(items).toEqual([
      { ...meal, calories: 650, protein_g: 30 },
      { kind: 'exercise', day_offset: 0, exercise_name: '러닝', duration_minutes: 30, calories_burned: 300 },
      { kind: 'weight', day_offset: 0, weight_kg: 68.3 },
    ])
  })

  it('가게 이름 같은 수식어를 지우지 않는다', () => {
    const [item] = parseParseResponse({ items: [meal] })
    expect(item).toMatchObject({ food_name: '회사 앞 김치찌개' })
  })

  it('범위를 벗어난 칼로리는 null 로 두어 사용자가 채우게 한다', () => {
    const [item] = parseParseResponse({ items: [{ ...meal, calories: 0 }] })
    expect(item).toMatchObject({ calories: null })
  })

  it('모르는 끼니는 null, 모르는 신뢰도는 low 로 둔다', () => {
    const [item] = parseParseResponse({
      items: [{ ...meal, meal_type: 'brunch', confidence: 'sure' }],
    })
    expect(item).toMatchObject({ meal_type: null, confidence: 'low' })
  })

  it('미래 날짜는 기준일로, 7일보다 이전은 -7 로 자른다', () => {
    const items = parseParseResponse({
      items: [
        { ...meal, day_offset: 1 },
        { ...meal, day_offset: -1 },
        { ...meal, day_offset: -30 },
        { ...meal, day_offset: 'yesterday' },
      ],
    })
    expect(items.map((i) => i.day_offset)).toEqual([0, -1, -7, 0])
  })

  it('이름이 없거나 종류를 모르는 항목, 범위 밖 체중은 버린다', () => {
    const items = parseParseResponse({
      items: [
        { ...meal, food_name: '  ' },
        { kind: 'sleep', hours: 7 },
        { kind: 'weight', weight_kg: 500 },
        null,
        meal,
      ],
    })
    expect(items).toHaveLength(1)
  })

  it('items 배열이 없으면 에러를 던진다', () => {
    expect(() => parseParseResponse(null)).toThrow('not an object')
    expect(() => parseParseResponse({ items: 'x' })).toThrow('items')
  })
})
