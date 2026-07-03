import {
  buildEstimateUserMessage,
  parseEstimateResponse,
} from '../../../supabase/functions/_shared/estimate-calories.logic'

describe('buildEstimateUserMessage', () => {
  it('음식명만 있을 때 올바른 메시지를 생성한다', () => {
    expect(buildEstimateUserMessage('닭가슴살')).toBe('음식: 닭가슴살')
  })

  it('식사 종류가 있을 때 메시지에 포함한다', () => {
    expect(buildEstimateUserMessage('닭가슴살', '점심')).toBe('음식: 닭가슴살, 식사 종류: 점심')
  })
})

describe('parseEstimateResponse', () => {
  const validResponse = {
    calories: 200,
    protein_g: 30.5,
    carbs_g: 0.0,
    fat_g: 4.2,
    confidence: 'high',
    note: '저지방 고단백',
  }

  it('유효한 응답을 파싱한다', () => {
    const result = parseEstimateResponse(validResponse)
    expect(result.calories).toBe(200)
    expect(result.protein_g).toBe(30.5)
    expect(result.confidence).toBe('high')
    expect(result.note).toBe('저지방 고단백')
  })

  it('null이 아닌 객체가 아니면 에러를 던진다', () => {
    expect(() => parseEstimateResponse(null)).toThrow('not an object')
    expect(() => parseEstimateResponse('string')).toThrow('not an object')
  })

  it('calories가 숫자가 아니면 에러를 던진다', () => {
    expect(() => parseEstimateResponse({ ...validResponse, calories: '200' })).toThrow('calories')
  })

  it('confidence가 잘못된 값이면 에러를 던진다', () => {
    expect(() => parseEstimateResponse({ ...validResponse, confidence: 'unknown' })).toThrow('confidence')
  })

  it('영양소 필드가 없으면 null로 처리한다', () => {
    const result = parseEstimateResponse({ calories: 300, confidence: 'low', note: '' })
    expect(result.protein_g).toBeNull()
    expect(result.carbs_g).toBeNull()
    expect(result.fat_g).toBeNull()
  })
})
