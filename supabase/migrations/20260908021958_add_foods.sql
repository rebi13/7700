-- 사용자별 "음식 라이브러리": 같은 음식 이름은 항상 같은 영양 값을 재사용한다.
-- 요리(dish) 단위 캐시이며 재료/100g 단위가 아니다. 한 행 = 한 음식 이름의 1인분 영양.
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  normalized_name text not null,
  display_name text not null,
  calories integer not null check (calories >= 0 and calories <= 9999),
  protein_g numeric(6, 1) check (protein_g is null or (protein_g >= 0 and protein_g <= 999)),
  carbs_g numeric(6, 1) check (carbs_g is null or (carbs_g >= 0 and carbs_g <= 999)),
  fat_g numeric(6, 1) check (fat_g is null or (fat_g >= 0 and fat_g <= 999)),
  source text not null default 'ai' check (source in ('ai', 'manual')),
  confidence text check (confidence is null or confidence in ('high', 'medium', 'low')),
  note text,
  use_count integer not null default 1 check (use_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint foods_user_normalized_unique unique (user_id, normalized_name)
);

comment on table public.foods is
  '사용자별 음식 라이브러리. 요리 단위로 이름→영양을 캐시해 AI 호출을 줄이고 값을 통일한다.';
comment on column public.foods.normalized_name is
  '조회·업서트 키. 공백 정규화 + 소문자화한 이름. "밥"과 "밥 1공기"는 다른 키(양이 영양을 바꾸므로).';
comment on column public.foods.display_name is '사용자가 마지막으로 입력한 원문 음식 이름.';
comment on column public.foods.source is 'ai=AI 추정 생성, manual=사용자가 직접 입력/수정한 값.';
comment on column public.foods.use_count is '식사로 저장한 누적 횟수. 자동완성 정렬에 쓴다.';

-- 자동완성 접두어 검색(ilike 'prefix%')용
create index if not exists foods_user_prefix_idx
  on public.foods (user_id, normalized_name text_pattern_ops);

alter table public.foods enable row level security;

create policy "foods_select_own" on public.foods
  for select using (auth.uid() = user_id);
create policy "foods_insert_own" on public.foods
  for insert with check (auth.uid() = user_id);
create policy "foods_update_own" on public.foods
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "foods_delete_own" on public.foods
  for delete using (auth.uid() = user_id);
