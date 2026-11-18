export { pickDailyWeights } from '../../../supabase/functions/_shared/daily-weight.logic.ts'

/** 통계가 하루 대표 체중을 어떻게 고르는지 기록 화면에서 알려 준다 */
export const DAILY_WEIGHT_RULE =
  '통계에는 하루 한 값만 써요. 기상 직후 기록이 있으면 그 값을, 없으면 그날 먼저 넣은 값을 써요.'

/** 측정 시간대를 비워 둔 체중 기록에 보여 준다 */
export const DAILY_WEIGHT_HINT =
  '언제 쟀는지 고르면 통계가 더 정확해져요. 매일 기상 직후에 재는 게 가장 좋아요.'
