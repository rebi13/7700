import { useFoodStore } from '@/stores/foodStore'
import { useAuthStore } from '@/stores/authStore'
import type { FoodRow } from '@/types/database'

const mockFrom = jest.fn()
const mockMaybeSingle = jest.fn()
const mockLimit = jest.fn()
const mockUpsert = jest.fn()
const mockUpdate = jest.fn()

const eqCalls: unknown[][] = []
const ilikeCalls: unknown[][] = []
const orderCalls: unknown[][] = []

function makeChain() {
  const chain = {
    select: () => chain,
    eq: (...a: unknown[]) => {
      eqCalls.push(a)
      return chain
    },
    ilike: (...a: unknown[]) => {
      ilikeCalls.push(a)
      return chain
    },
    order: (...a: unknown[]) => {
      orderCalls.push(a)
      return chain
    },
    limit: (...a: unknown[]) => mockLimit(...a),
    maybeSingle: (...a: unknown[]) => mockMaybeSingle(...a),
    upsert: (...a: unknown[]) => mockUpsert(...a),
    update: (...a: unknown[]) => {
      mockUpdate(...a)
      return chain
    },
  }
  return chain
}

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

function food(overrides: Partial<FoodRow> = {}): FoodRow {
  return {
    id: 'f1',
    user_id: 'u1',
    normalized_name: '김치찌개',
    display_name: '김치찌개',
    calories: 250,
    protein_g: 12,
    carbs_g: null,
    fat_g: null,
    source: 'ai',
    confidence: 'high',
    note: '',
    use_count: 3,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  mockFrom.mockReset().mockImplementation(() => makeChain())
  mockMaybeSingle.mockReset()
  mockLimit.mockReset()
  mockUpsert.mockReset().mockResolvedValue({ error: null })
  mockUpdate.mockReset()
  eqCalls.length = 0
  ilikeCalls.length = 0
  orderCalls.length = 0
  useAuthStore.setState({ user: { id: 'u1' } as never })
  useFoodStore.setState({ suggestions: [] })
})

describe('lookup', () => {
  it('저장된 음식이면 행을 돌려준다', async () => {
    mockMaybeSingle.mockResolvedValue({ data: food() })

    const row = await useFoodStore.getState().lookup(' 김치찌개 ')

    expect(row?.display_name).toBe('김치찌개')
    // 정규화한 키와 user_id 로 조회한다.
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        ['user_id', 'u1'],
        ['normalized_name', '김치찌개'],
      ])
    )
  })

  it('없으면 null 을 돌려준다', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })
    expect(await useFoodStore.getState().lookup('없는음식')).toBeNull()
  })

  it('DB 오류가 나도 던지지 않고 null 을 돌려준다', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } })
    expect(await useFoodStore.getState().lookup('김치찌개')).toBeNull()
  })

  it('로그인 전이면 조회하지 않는다', async () => {
    useAuthStore.setState({ user: null })
    expect(await useFoodStore.getState().lookup('김치찌개')).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('search', () => {
  it('접두어로 조회하고 use_count 순으로 정렬해 suggestions 에 담는다', async () => {
    mockLimit.mockResolvedValue({ data: [food()] })

    const rows = await useFoodStore.getState().search('김')

    expect(rows).toHaveLength(1)
    expect(useFoodStore.getState().suggestions).toHaveLength(1)
    expect(ilikeCalls[0]).toEqual(['normalized_name', '김%'])
    expect(orderCalls[0]).toEqual(['use_count', { ascending: false }])
    expect(mockLimit).toHaveBeenCalledWith(8)
  })

  it('빈 접두어면 조회 없이 빈 배열로 비운다', async () => {
    useFoodStore.setState({ suggestions: [food()] })
    const rows = await useFoodStore.getState().search('   ')
    expect(rows).toEqual([])
    expect(useFoodStore.getState().suggestions).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('upsertFromEstimate', () => {
  it('onConflict 로 업서트하고 use_count 는 보내지 않는다', async () => {
    await useFoodStore.getState().upsertFromEstimate({
      displayName: '  김치찌개 ',
      calories: 250,
      protein_g: 12,
      source: 'ai',
      confidence: 'high',
      note: '메모',
    })

    const [payload, options] = mockUpsert.mock.calls[0]
    expect(payload).toMatchObject({
      user_id: 'u1',
      normalized_name: '김치찌개',
      display_name: '김치찌개',
      calories: 250,
      source: 'ai',
    })
    expect(payload).not.toHaveProperty('use_count')
    expect(options).toEqual({
      onConflict: 'user_id,normalized_name',
      ignoreDuplicates: false,
    })
  })

  it('ignoreDuplicates 를 전달한다', async () => {
    await useFoodStore.getState().upsertFromEstimate({
      displayName: '김치찌개',
      calories: 250,
      source: 'ai',
      ignoreDuplicates: true,
    })
    expect(mockUpsert.mock.calls[0][1]).toMatchObject({ ignoreDuplicates: true })
  })
})

describe('recordUsage', () => {
  it('현재 use_count 를 읽어 1 올린다', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { use_count: 3 } })

    await useFoodStore.getState().recordUsage('김치찌개')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ use_count: 4 })
    )
  })

  it('행이 없으면 아무것도 하지 않는다', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })
    await useFoodStore.getState().recordUsage('없는음식')
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
