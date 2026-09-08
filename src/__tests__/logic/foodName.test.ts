import { normalizeFoodName, escapeLike } from '@/utils/foodName'

describe('normalizeFoodName', () => {
  it('앞뒤 공백을 없애고 내부 연속 공백을 1칸으로 줄인다', () => {
    expect(normalizeFoodName('  김치   찌개 ')).toBe('김치 찌개')
  })

  it('영문은 소문자로 통일한다', () => {
    expect(normalizeFoodName('Chicken Salad')).toBe('chicken salad')
  })

  it('한글은 그대로 둔다', () => {
    expect(normalizeFoodName('비빔밥')).toBe('비빔밥')
  })

  it('양이 다르면 다른 키가 된다 (양을 제거하지 않는다)', () => {
    expect(normalizeFoodName('밥')).not.toBe(normalizeFoodName('밥 1공기'))
  })

  it('빈 문자열/공백만이면 빈 키가 된다', () => {
    expect(normalizeFoodName('   ')).toBe('')
  })
})

describe('escapeLike', () => {
  it('ilike 특수문자 %, _, \\ 를 이스케이프한다', () => {
    expect(escapeLike('100%_밥\\')).toBe('100\\%\\_밥\\\\')
  })

  it('특수문자가 없으면 그대로 둔다', () => {
    expect(escapeLike('비빔밥')).toBe('비빔밥')
  })
})
