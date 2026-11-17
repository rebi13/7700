import { useAiStore } from '@/stores/aiStore'

const mockInvoke = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}))

beforeEach(() => {
  useAiStore.setState({ isEstimating: false, isParsing: false, error: null })
  mockInvoke.mockReset()
})

describe('estimateCalories', () => {
  it('성공 시 isEstimating을 false로 돌리고 결과를 반환한다', async () => {
    const mockData = { calories: 200, protein_g: 30, carbs_g: 0, fat_g: 4, confidence: 'high', note: '저지방' }
    mockInvoke.mockResolvedValue({ data: mockData, error: null })

    const result = await useAiStore.getState().estimateCalories('닭가슴살', '점심')

    expect(mockInvoke).toHaveBeenCalledWith('estimate-calories', {
      body: { food_name: '닭가슴살', meal_type: '점심' },
    })
    expect(result).toEqual(mockData)
    expect(useAiStore.getState().isEstimating).toBe(false)
    expect(useAiStore.getState().error).toBeNull()
  })

  it('API 에러 시 error 상태를 설정하고 null을 반환한다', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Function error' } })

    const result = await useAiStore.getState().estimateCalories('파스타')

    expect(result).toBeNull()
    expect(useAiStore.getState().isEstimating).toBe(false)
    expect(useAiStore.getState().error).toBe('Function error')
  })

  it('data가 null이면 fallback 에러 메시지를 설정한다', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: null })

    const result = await useAiStore.getState().estimateCalories('파스타')

    expect(result).toBeNull()
    expect(useAiStore.getState().error).toBe('추정 실패')
  })

  it('호출 중에는 isEstimating이 true로 설정된다', async () => {
    let resolveInvoke!: (v: unknown) => void
    mockInvoke.mockReturnValue(new Promise(r => { resolveInvoke = r }))

    const promise = useAiStore.getState().estimateCalories('닭가슴살')
    expect(useAiStore.getState().isEstimating).toBe(true)

    resolveInvoke({ data: null, error: { message: 'err' } })
    await promise
    expect(useAiStore.getState().isEstimating).toBe(false)
  })
})

describe('parseLog', () => {
  it('문장과 체중을 parse-log 로 보내고 항목을 돌려준다', async () => {
    const items = [{ kind: 'weight', day_offset: 0, weight_kg: 68 }]
    mockInvoke.mockResolvedValue({ data: { items }, error: null })

    const result = await useAiStore.getState().parseLog('체중 68', 68.5)

    expect(mockInvoke).toHaveBeenCalledWith('parse-log', {
      body: { text: '체중 68', weight_kg: 68.5 },
    })
    expect(result).toEqual(items)
    expect(useAiStore.getState().isParsing).toBe(false)
  })

  it('실패하면 error 를 남기고 null 을 돌려준다', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Input too long' } })

    const result = await useAiStore.getState().parseLog('...')

    expect(result).toBeNull()
    expect(useAiStore.getState().isParsing).toBe(false)
    expect(useAiStore.getState().error).toBe('입력이 너무 깁니다. 1000자 이내로 줄여 주세요.')
  })

  it('응답에 items 배열이 없으면 실패로 본다', async () => {
    mockInvoke.mockResolvedValue({ data: { foo: 1 }, error: null })
    expect(await useAiStore.getState().parseLog('점심 김밥')).toBeNull()
    expect(useAiStore.getState().error).toBe('기록을 정리하지 못했습니다')
  })
})
