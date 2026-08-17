import { translateFunctionError } from '@/lib/functions'

/** 실제로 관측된 502 응답 본문의 error 필드 형태 */
const openAiWrapped = (body: unknown) =>
  `OpenAI error: ${JSON.stringify(body, null, 4)}\n`

describe('translateFunctionError', () => {
  describe('OpenAI 오류 코드', () => {
    it('크레딧 소진(insufficient_quota)을 한국어 안내로 바꾼다', () => {
      const raw = openAiWrapped({
        error: {
          message:
            'You exceeded your current quota, please check your plan and billing details.',
          type: 'insufficient_quota',
          param: null,
          code: 'insufficient_quota',
        },
      })

      expect(translateFunctionError(raw)).toBe(
        'AI 사용량이 모두 소진되었습니다. 관리자에게 문의해 주세요.'
      )
    })

    it('요청 한도 초과를 한국어 안내로 바꾼다', () => {
      const raw = openAiWrapped({
        error: { message: 'Rate limit reached', code: 'rate_limit_exceeded' },
      })

      expect(translateFunctionError(raw)).toBe(
        '요청이 몰리고 있습니다. 잠시 후 다시 시도해 주세요.'
      )
    })

    it('code 가 없으면 type 으로 매핑한다', () => {
      const raw = openAiWrapped({
        error: { message: 'Server had an error', type: 'server_error' },
      })

      expect(translateFunctionError(raw)).toBe(
        'AI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.'
      )
    })

    it('모르는 코드는 JSON 덩어리 대신 OpenAI 의 message 만 남긴다', () => {
      const raw = openAiWrapped({
        error: { message: 'Something unfamiliar happened', code: 'brand_new_code' },
      })

      expect(translateFunctionError(raw)).toBe('Something unfamiliar happened')
    })
  })

  describe('Edge Function 자체 오류', () => {
    it('키 미설정을 한국어 안내로 바꾼다', () => {
      expect(translateFunctionError('OpenAI API key not configured')).toBe(
        'AI 서비스가 설정되지 않았습니다. 관리자에게 문의해 주세요.'
      )
    })

    it('인증 만료를 한국어 안내로 바꾼다', () => {
      expect(translateFunctionError('Unauthorized')).toBe(
        '로그인이 만료되었습니다. 다시 로그인해 주세요.'
      )
    })
  })

  describe('그 외', () => {
    it('알 수 없는 문자열은 진단을 위해 그대로 남긴다', () => {
      expect(translateFunctionError('target_date is required')).toBe(
        'target_date is required'
      )
    })

    it('JSON 이 깨져 있어도 원문을 잃지 않는다', () => {
      const raw = 'OpenAI error: {"error": {oops'
      expect(translateFunctionError(raw)).toBe(raw)
    })

    it('빈 문자열은 빈 문자열로 둔다', () => {
      expect(translateFunctionError('   ')).toBe('')
    })
  })
})
