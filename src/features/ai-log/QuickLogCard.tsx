import { useRef, useState, type ComponentProps } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useAiStore, type ParsedLogItem } from '@/stores/aiStore'
import { useFoodStore } from '@/stores/foodStore'
import { useProfileStore } from '@/stores/profileStore'
import { useMealStore } from '@/stores/mealStore'
import { useExerciseStore } from '@/stores/exerciseStore'
import { MEAL_TYPES } from '@/features/meal/options'
import {
  applyCandidate,
  buildDrafts,
  patchMeal,
  saveDrafts,
  validateDraft,
  type DayLogs,
  type ExerciseDraft,
  type LogDraft,
  type MealDraft,
  type WeightDraft,
} from '@/features/ai-log/quickLog'
import { ChipGroup } from '@/components/ChipGroup'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { blurActiveElement } from '@/lib/dom'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { formatDateShort } from '@/utils/date'

const PLACEHOLDER =
  '예) 점심 회사 앞 김치찌개 / 아침엔 토스트랑 라떼, 저녁 치킨 반 마리. 30분 러닝했고 체중 68.2'

const KIND_LABEL: Record<LogDraft['kind'], string> = {
  meal: '식사',
  exercise: '운동',
  weight: '체중',
}

/** 공백만 다른 같은 문장은 같은 입력으로 본다 */
const sameText = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ') === b.trim().replace(/\s+/g, ' ')

async function existingLogs(date: string): Promise<DayLogs> {
  const [meals, exercises] = await Promise.all([
    useMealStore.getState().peekLogs(date),
    useExerciseStore.getState().peekLogs(date),
  ])
  return { meals, exercises }
}

interface Props {
  /** "어제" 같은 말을 해석할 기준 날짜 */
  date: string
  /** 저장이 끝난 뒤 기록이 바뀐 날짜들 */
  onSaved?: (dates: string[]) => void
}

/**
 * 기록을 자연어로 받아 항목별로 나눠 보여주고, 확인 후 한 번에 저장한다.
 * 하루를 몰아 쓰든 끼니마다 따로 쓰든 같은 입력창을 쓴다.
 */
export function QuickLogCard({ date, onSaved }: Props) {
  const parseLog = useAiStore((st) => st.parseLog)
  const isParsing = useAiStore((st) => st.isParsing)
  const parseQuota = useAiStore((st) => st.parseQuota)
  const weightKg = useProfileStore((st) => st.profile?.current_weight_kg ?? null)

  const [text, setText] = useState('')
  const [drafts, setDrafts] = useState<LogDraft[] | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  // 마지막으로 정리한 문장과 결과. "다시 입력" 후 문장을 안 고치고 다시 정리하면
  // AI 를 또 부르지 않고 이 결과를 쓴다(하루 한도와 토큰을 아낀다).
  const lastParse = useRef<{ text: string; items: ParsedLogItem[] } | null>(null)

  const handleParse = async () => {
    blurActiveElement()
    let items: ParsedLogItem[] | null
    if (lastParse.current && sameText(lastParse.current.text, text)) {
      items = lastParse.current.items
    } else {
      items = await parseLog(text, weightKg)
      if (!items) {
        toast.error(useAiStore.getState().error ?? '기록을 정리하지 못했습니다')
        return
      }
      lastParse.current = { text, items }
    }
    if (items.length === 0) {
      toast.error('기록할 식사·운동·체중을 찾지 못했습니다')
      return
    }
    const { lookup, findVariants } = useFoodStore.getState()
    setDrafts(
      await buildDrafts(items, date, { lookup, findVariants }, { existing: existingLogs })
    )
    setErrors({})
  }

  const update = (id: string, fn: (d: LogDraft) => LogDraft) => {
    setDrafts((prev) => prev?.map((d) => (d.id === id ? fn(d) : d)) ?? null)
    setErrors((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const remove = (id: string) => {
    setDrafts((prev) => {
      const next = prev?.filter((d) => d.id !== id) ?? null
      return next && next.length > 0 ? next : null
    })
  }

  const toSave = drafts?.filter((d) => !d.skip) ?? []

  const handleSave = async () => {
    if (!drafts || toSave.length === 0) return
    const found: Record<string, string> = {}
    for (const d of toSave) {
      const msg = validateDraft(d)
      if (msg) found[d.id] = msg
    }
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setIsSaving(true)
    const { failed, dates } = await saveDrafts(toSave)
    setIsSaving(false)

    const savedCount = toSave.length - failed.length
    if (dates.length > 0) onSaved?.(dates)
    if (failed.length > 0) {
      setDrafts(failed)
      toast.error(`${failed.length}건을 저장하지 못했습니다. 다시 시도해 주세요.`)
      return
    }
    setDrafts(null)
    setText('')
    toast.success(`${savedCount}건을 기록했습니다`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Sparkles className="size-4 text-deficit" />
          말로 기록하기
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {drafts === null ? (
          <>
            <Textarea
              aria-label="기록 내용"
              placeholder={PLACEHOLDER}
              value={text}
              maxLength={1000}
              rows={3}
              onChange={(e) => setText(e.target.value)}
            />
            <Button onClick={handleParse} disabled={!text.trim() || isParsing}>
              {isParsing ? '정리하는 중...' : '항목으로 정리하기'}
            </Button>
            {parseQuota && (
              <p className="text-xs text-muted-foreground">
                오늘 남은 정리 횟수 {parseQuota.remaining}/{parseQuota.limit}회
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              확인하고 고칠 부분을 고친 뒤 저장하세요.
            </p>
            <ul className="flex flex-col gap-3">
              {drafts.map((d) => (
                <li
                  key={d.id}
                  className={cn(
                    'rounded-md border p-3',
                    errors[d.id] && 'border-destructive',
                    d.skip && 'bg-muted/50'
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {KIND_LABEL[d.kind]}
                      {d.date !== date && (
                        <span className="ml-1.5 text-surplus">
                          {formatDateShort(d.date)}
                        </span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="항목 삭제"
                      onClick={() => remove(d.id)}
                    >
                      <X />
                    </Button>
                  </div>
                  {d.duplicate && (
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {d.skip
                          ? '이미 기록된 항목이라 빼 두었어요.'
                          : '이미 같은 기록이 있어요.'}
                      </span>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => update(d.id, (x) => ({ ...x, skip: !x.skip }))}
                      >
                        {d.skip ? '그래도 추가' : '빼기'}
                      </Button>
                    </div>
                  )}
                  {!d.skip && d.kind === 'meal' && (
                    <MealDraftFields
                      draft={d}
                      onChange={(fn) => update(d.id, (x) => fn(x as MealDraft))}
                    />
                  )}
                  {!d.skip && d.kind === 'exercise' && (
                    <ExerciseDraftFields
                      draft={d}
                      onChange={(patch) =>
                        update(d.id, (x) => ({ ...(x as ExerciseDraft), ...patch }))
                      }
                    />
                  )}
                  {!d.skip && d.kind === 'weight' && (
                    <WeightDraftFields
                      draft={d}
                      onChange={(patch) =>
                        update(d.id, (x) => ({ ...(x as WeightDraft), ...patch }))
                      }
                    />
                  )}
                  {d.skip && (
                    <p className="text-sm text-muted-foreground">
                      {d.kind === 'meal' && d.food_name}
                      {d.kind === 'exercise' && d.exercise_name}
                    </p>
                  )}
                  {errors[d.id] && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      {errors[d.id]}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDrafts(null)}
                disabled={isSaving}
              >
                다시 입력
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving || toSave.length === 0}
              >
                {isSaving ? '저장 중...' : `${toSave.length}건 저장`}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/** 빈 칸은 null, 숫자가 아니면 null 로 둔다(검사 단계에서 안내한다). */
function toNumber(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * 숫자 초안을 고치는 입력칸. 입력 중인 원문("68.")을 따로 들고 있어야
 * 소수점이나 빈 칸을 지나는 중간 상태가 숫자로 변환되며 지워지지 않는다.
 * 후보 선택처럼 바깥에서 값이 바뀌면 원문을 그 값으로 맞춘다.
 */
function NumberInput({
  value,
  onValueChange,
  ...props
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  value: number | null
  onValueChange: (value: number | null) => void
}) {
  const [raw, setRaw] = useState(value == null ? '' : String(value))
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    if (toNumber(raw) !== value) setRaw(value == null ? '' : String(value))
  }
  return (
    <Input
      {...props}
      value={raw}
      onChange={(e) => {
        setRaw(e.target.value)
        const n = toNumber(e.target.value)
        setSynced(n)
        onValueChange(n)
      }}
    />
  )
}

const ORIGIN_LABEL = {
  saved: '저장된 값',
  ai: 'AI 추정',
  manual: '직접 입력',
} as const

function MealDraftFields({
  draft,
  onChange,
}: {
  draft: MealDraft
  onChange: (fn: (d: MealDraft) => MealDraft) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <ChipGroup
        aria-label="식사 종류"
        options={MEAL_TYPES}
        value={draft.meal_type}
        onChange={(v) => onChange((d) => patchMeal(d, { meal_type: v }))}
      />
      <div className="flex gap-2">
        <Input
          aria-label="음식 이름"
          value={draft.food_name}
          onChange={(e) => onChange((d) => patchMeal(d, { food_name: e.target.value }))}
        />
        <div className="flex shrink-0 items-center gap-1">
          <NumberInput
            aria-label="칼로리"
            inputMode="numeric"
            className="w-20 text-right"
            value={draft.calories}
            onValueChange={(n) => onChange((d) => patchMeal(d, { calories: n }))}
          />
          <span className="text-sm text-muted-foreground">kcal</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {ORIGIN_LABEL[draft.origin]}
        {draft.note && ` · ${draft.note}`}
      </p>
      {draft.meal_type_guessed && (
        <p className="text-xs text-muted-foreground">
          끼니는 지금 시각으로 골랐어요. 다르면 바꿔 주세요.
        </p>
      )}
      {draft.candidates.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">저장된 비슷한 메뉴</span>
          <div className="flex flex-wrap gap-1.5">
            {draft.candidates.map((food) => (
              <Button
                key={food.id}
                variant="outline"
                size="xs"
                aria-pressed={
                  draft.origin === 'saved' && draft.food_name === food.display_name
                }
                onClick={() => onChange((d) => applyCandidate(d, food))}
              >
                {food.display_name} · {food.calories}kcal
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ExerciseDraftFields({
  draft,
  onChange,
}: {
  draft: ExerciseDraft
  onChange: (patch: Partial<ExerciseDraft>) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        aria-label="운동 이름"
        className="min-w-0 flex-1"
        value={draft.exercise_name}
        onChange={(e) => onChange({ exercise_name: e.target.value })}
      />
      <div className="flex items-center gap-1">
        <NumberInput
          aria-label="운동 시간"
          inputMode="numeric"
          className="w-16 text-right"
          value={draft.duration_minutes}
          onValueChange={(n) => onChange({ duration_minutes: n })}
        />
        <span className="text-sm text-muted-foreground">분</span>
      </div>
      <div className="flex items-center gap-1">
        <NumberInput
          aria-label="소모 칼로리"
          inputMode="numeric"
          className="w-20 text-right"
          value={draft.calories_burned}
          onValueChange={(n) => onChange({ calories_burned: n })}
        />
        <span className="text-sm text-muted-foreground">kcal</span>
      </div>
    </div>
  )
}

function WeightDraftFields({
  draft,
  onChange,
}: {
  draft: WeightDraft
  onChange: (patch: Partial<WeightDraft>) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <NumberInput
        aria-label="체중"
        inputMode="decimal"
        className="w-24 text-right"
        value={draft.weight_kg}
        onValueChange={(n) => onChange({ weight_kg: n })}
      />
      <span className="text-sm text-muted-foreground">kg</span>
    </div>
  )
}
