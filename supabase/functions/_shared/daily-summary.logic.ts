/**
 * 식사를 하나라도 기록한 날인지. 섭취가 0 인 날은 굶은 날보다 기록을 깜빡한 날일
 * 가능성이 훨씬 높고, 그대로 두면 TDEE 전체가 적자로 잡혀 적자가 부풀려진다.
 *
 * 앱(누적 적자·통계)과 주간 피드백 Edge Function 이 같은 기준을 쓰도록 여기 둔다.
 */
export function isRecordedDay(summary: { total_intake_calories: number }): boolean {
  return summary.total_intake_calories > 0
}
