-- 누적 적자는 "직전 요약의 누적 + 오늘 적자"로 저장해 왔다. 이 방식은 기준일이 없고,
-- 지난 날짜를 고쳐도 뒤 날짜의 누적이 그대로 남으며, 식사를 기록하지 않은 날의
-- TDEE 전체가 적자로 쌓였다. 이제 앱이 목표 시작일부터 식사를 기록한 날의
-- calorie_delta 를 읽을 때 더하므로, 저장된 파생 값은 지운다.
alter table public.daily_summaries
  drop column if exists cumulative_delta,
  drop column if exists estimated_weight_change_kg;
