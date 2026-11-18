import {
  PARSE_LOG_SCHEMA,
  parseParseResponse,
} from '../../../supabase/functions/_shared/parse-log.logic'
import {
  PARSE_LOG_FEW_SHOT,
  buildParseMessages,
  buildParseRequestBody,
} from '../../../supabase/functions/_shared/parse-log.prompt'
import { PARSE_LOG_CASES } from '../../../scripts/eval/parse-log.cases'
import {
  count,
  empty,
  exercise,
  meal,
  noBurnedEstimate,
  runChecks,
} from '../../../scripts/eval/parse-log.check'

describe('few-shot 예시', () => {
  it.each(PARSE_LOG_FEW_SHOT.map((ex) => [ex.input, ex]))(
    '서버 검사를 거쳐도 그대로 남는다: %s',
    (_input, ex) => {
      // 검사에서 잘리거나 버려지는 예시는 모델에게 틀린 모양을 가르친다.
      expect(parseParseResponse(ex.output)).toEqual(ex.output.items)
    }
  )

  it('strict 스키마의 필드를 정확히 채운다', () => {
    const variants = PARSE_LOG_SCHEMA.properties.items.items.anyOf
    for (const ex of PARSE_LOG_FEW_SHOT) {
      for (const item of ex.output.items) {
        const variant = variants.find((v) => v.properties.kind.enum[0] === item.kind)
        expect(Object.keys(item).sort()).toEqual([...(variant?.required ?? [])].sort())
      }
    }
  })

  it('평가 문장과 겹치지 않는다(예시를 외운 점수를 막는다)', () => {
    const shots = new Set(PARSE_LOG_FEW_SHOT.map((ex) => ex.input))
    expect(PARSE_LOG_CASES.filter((c) => shots.has(c.input))).toEqual([])
  })
})

describe('buildParseMessages', () => {
  it('시스템 → 예시 쌍 → 실제 입력 순서로 만든다', () => {
    const msgs = buildParseMessages('점심 김밥')
    expect(msgs[0].role).toBe('system')
    expect(msgs).toHaveLength(2 + PARSE_LOG_FEW_SHOT.length * 2)
    expect(msgs.at(-1)).toEqual({ role: 'user', content: '<user_log>\n점심 김밥\n</user_log>' })
    expect(msgs[1].content).toContain('<user_log>')
    expect(msgs[2].role).toBe('assistant')
  })

  it('예시를 끄면 시스템과 입력만 보낸다', () => {
    expect(buildParseMessages('점심 김밥', false)).toHaveLength(2)
  })

  it('요청 본문은 strict 스키마와 기본 모델 설정을 쓴다', () => {
    const body = buildParseRequestBody('점심 김밥')
    expect(body.response_format.json_schema.strict).toBe(true)
    expect(body.model).toBe('gpt-5-mini')
    expect(buildParseRequestBody('x', { reasoningEffort: 'medium' }).reasoning_effort).toBe('medium')
  })
})

describe('평가 검사 도구', () => {
  const items = [
    { kind: 'meal' as const, day_offset: 0, meal_type: 'lunch' as const, food_name: '회사 앞 김치찌개', calories: 500, protein_g: null, carbs_g: null, fat_g: null, confidence: 'medium' as const, note: '' },
    { kind: 'exercise' as const, day_offset: 0, exercise_name: '러닝', duration_minutes: 30, calories_burned: 250 },
  ]

  it('맞으면 실패 이유가 없다', () => {
    expect(
      runChecks(
        [count('meal', 1), meal({ name: ['회사 앞', '김치찌개'], meal_type: 'lunch' }), exercise({ calories_burned: 250 })],
        items
      )
    ).toEqual([])
  })

  it('틀리면 무엇이 틀렸는지와 실제 항목을 알려준다', () => {
    const failures = runChecks([meal({ name: ['김치찌개'], meal_type: 'dinner' }), noBurnedEstimate(), empty()], items)
    expect(failures).toHaveLength(3)
    expect(failures[0]).toContain('meal(회사 앞 김치찌개/lunch/0)')
    expect(failures[1]).toContain('소모 칼로리를 추정함')
  })

  it('케이스 id 는 겹치지 않는다', () => {
    const ids = PARSE_LOG_CASES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
