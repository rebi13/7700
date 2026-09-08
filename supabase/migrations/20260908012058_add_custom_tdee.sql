-- 유지 칼로리(TDEE)를 활동 수준으로 계산하는 대신, 인바디 등에서 측정한 값을
-- 직접 입력할 수 있게 한다. NULL 이면 자동 계산, 값이 있으면 그 값을 TDEE 로 쓴다.
alter table public.profiles
  add column if not exists custom_tdee integer
    check (custom_tdee is null or (custom_tdee >= 800 and custom_tdee <= 6000));

comment on column public.profiles.custom_tdee is
  '사용자가 직접 입력한 유지 칼로리(kcal). NULL 이면 활동 수준으로 자동 계산한다.';
