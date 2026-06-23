# Phase 1: Supabase Backend 인프라 구축 가이드

이 문서는 7700 앱의 데이터베이스 스키마와 보안 정책을 Supabase에 설정하는 방법을 안내합니다.

---

## 📋 목차

1. [데이터베이스 테이블 생성](#1-데이터베이스-테이블-생성)
2. [인덱스 생성](#2-인덱스-생성)
3. [RLS 정책 설정](#3-rls-정책-설정)
4. [검증](#4-검증)

---

## 실행 방법

1. Supabase Dashboard 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. **SQL Editor** 메뉴로 이동
4. 아래 SQL 스크립트를 순서대로 복사해서 실행

---

## 1. 데이터베이스 테이블 생성

### 1.1 profiles 테이블

사용자 기본 프로필 정보 (키, 체중, 생년월일, 성별, 활동 수준)

```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  height_cm numeric(5,2) not null,
  current_weight_kg numeric(5,2) not null,

  birth_date date not null,

  gender text check (
    gender in ('male', 'female', 'other')
  ),

  activity_level text check (
    activity_level in (
      'sedentary',
      'light',
      'moderate',
      'active',
      'very_active'
    )
  ),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- user_id에 unique 제약 추가 (사용자당 하나의 프로필)
create unique index idx_profiles_user_id on profiles(user_id);
```

---

### 1.2 goals 테이블

목표 체중 및 달성 기간 정보

```sql
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  start_weight_kg numeric(5,2) not null,
  target_weight_kg numeric(5,2) not null,

  start_date date not null default current_date,
  target_date date not null,

  is_active boolean default true,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

### 1.3 meal_logs 테이블

식사 기록 (음식명, 칼로리, 매크로)

```sql
create table meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  meal_date date not null,

  meal_type text check (
    meal_type in (
      'breakfast',
      'lunch',
      'dinner',
      'snack',
      'late_night'
    )
  ),

  food_name text not null,

  calories integer not null,

  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),

  memo text,

  created_at timestamptz default now()
);
```

---

### 1.4 exercise_logs 테이블

운동 기록 (운동명, 시간, 소모 칼로리)

```sql
create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  exercise_date date not null,

  exercise_name text not null,

  duration_minutes integer,
  calories_burned integer not null,

  memo text,

  created_at timestamptz default now()
);
```

---

### 1.5 weight_logs 테이블

체중 기록 (체중, 측정 시간대)

```sql
create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  weight_date date not null,

  weight_kg numeric(5,2) not null,

  measured_timing text check (
    measured_timing in (
      'morning',
      'afternoon',
      'evening',
      'after_workout',
      'other'
    )
  ),

  memo text,

  created_at timestamptz default now()
);
```

---

### 1.6 daily_summaries 테이블

일일 칼로리 집계 및 계산 결과

```sql
create table daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  summary_date date not null,

  total_intake_calories integer default 0,
  total_exercise_calories integer default 0,

  net_calories integer default 0,
  calorie_delta integer default 0,

  cumulative_delta integer default 0,

  estimated_weight_change_kg numeric(6,2),

  created_at timestamptz default now()
);

-- user_id + summary_date에 unique 제약 (하루에 하나의 요약)
create unique index idx_daily_summaries_user_date on daily_summaries(user_id, summary_date);
```

---

### 1.7 llm_parse_logs 테이블

LLM 자연어 파싱 로그 (원본 입력 + 파싱 결과)

```sql
create table llm_parse_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  raw_input text not null,

  parsed_result jsonb not null,

  created_at timestamptz default now()
);
```

---

### 1.8 llm_feedbacks 테이블

LLM 생성 피드백 (일일/주간)

```sql
create table llm_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  feedback_type text check (
    feedback_type in ('daily', 'weekly')
  ),

  target_date date not null,

  feedback text not null,

  created_at timestamptz default now()
);
```

---

### 1.9 health_workout_sync_logs 테이블

Apple Health 운동 동기화 로그 (중복 방지)

```sql
create table health_workout_sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  health_workout_id text not null,

  workout_type text,
  calories_burned integer,

  synced_at timestamptz default now()
);

-- health_workout_id에 unique 제약 (중복 동기화 방지)
create unique index idx_health_sync_workout_id on health_workout_sync_logs(user_id, health_workout_id);
```

---

## 2. 인덱스 생성

성능 최적화를 위한 인덱스 추가

```sql
-- meal_logs 인덱스
create index idx_meal_logs_user_date on meal_logs(user_id, meal_date);

-- exercise_logs 인덱스
create index idx_exercise_logs_user_date on exercise_logs(user_id, exercise_date);

-- weight_logs 인덱스
create index idx_weight_logs_user_date on weight_logs(user_id, weight_date);

-- goals 인덱스 (활성 목표 조회 최적화)
create index idx_goals_user_active on goals(user_id, is_active);

-- llm_feedbacks 인덱스
create index idx_llm_feedbacks_user_date on llm_feedbacks(user_id, target_date, feedback_type);
```

---

## 3. RLS 정책 설정

Row Level Security (RLS) 정책으로 사용자 데이터 보호

### 3.1 profiles 테이블 RLS

```sql
alter table profiles enable row level security;

create policy "Users can read own profile"
on profiles for select
using (auth.uid() = user_id);

create policy "Users can insert own profile"
on profiles for insert
with check (auth.uid() = user_id);

create policy "Users can update own profile"
on profiles for update
using (auth.uid() = user_id);

create policy "Users can delete own profile"
on profiles for delete
using (auth.uid() = user_id);
```

---

### 3.2 goals 테이블 RLS

```sql
alter table goals enable row level security;

create policy "Users can read own goals"
on goals for select
using (auth.uid() = user_id);

create policy "Users can insert own goals"
on goals for insert
with check (auth.uid() = user_id);

create policy "Users can update own goals"
on goals for update
using (auth.uid() = user_id);

create policy "Users can delete own goals"
on goals for delete
using (auth.uid() = user_id);
```

---

### 3.3 meal_logs 테이블 RLS

```sql
alter table meal_logs enable row level security;

create policy "Users can read own meal logs"
on meal_logs for select
using (auth.uid() = user_id);

create policy "Users can insert own meal logs"
on meal_logs for insert
with check (auth.uid() = user_id);

create policy "Users can update own meal logs"
on meal_logs for update
using (auth.uid() = user_id);

create policy "Users can delete own meal logs"
on meal_logs for delete
using (auth.uid() = user_id);
```

---

### 3.4 exercise_logs 테이블 RLS

```sql
alter table exercise_logs enable row level security;

create policy "Users can read own exercise logs"
on exercise_logs for select
using (auth.uid() = user_id);

create policy "Users can insert own exercise logs"
on exercise_logs for insert
with check (auth.uid() = user_id);

create policy "Users can update own exercise logs"
on exercise_logs for update
using (auth.uid() = user_id);

create policy "Users can delete own exercise logs"
on exercise_logs for delete
using (auth.uid() = user_id);
```

---

### 3.5 weight_logs 테이블 RLS

```sql
alter table weight_logs enable row level security;

create policy "Users can read own weight logs"
on weight_logs for select
using (auth.uid() = user_id);

create policy "Users can insert own weight logs"
on weight_logs for insert
with check (auth.uid() = user_id);

create policy "Users can update own weight logs"
on weight_logs for update
using (auth.uid() = user_id);

create policy "Users can delete own weight logs"
on weight_logs for delete
using (auth.uid() = user_id);
```

---

### 3.6 daily_summaries 테이블 RLS

```sql
alter table daily_summaries enable row level security;

create policy "Users can read own daily summaries"
on daily_summaries for select
using (auth.uid() = user_id);

create policy "Users can insert own daily summaries"
on daily_summaries for insert
with check (auth.uid() = user_id);

create policy "Users can update own daily summaries"
on daily_summaries for update
using (auth.uid() = user_id);

create policy "Users can delete own daily summaries"
on daily_summaries for delete
using (auth.uid() = user_id);
```

---

### 3.7 llm_parse_logs 테이블 RLS

```sql
alter table llm_parse_logs enable row level security;

create policy "Users can read own parse logs"
on llm_parse_logs for select
using (auth.uid() = user_id);

create policy "Users can insert own parse logs"
on llm_parse_logs for insert
with check (auth.uid() = user_id);

create policy "Users can delete own parse logs"
on llm_parse_logs for delete
using (auth.uid() = user_id);
```

---

### 3.8 llm_feedbacks 테이블 RLS

```sql
alter table llm_feedbacks enable row level security;

create policy "Users can read own feedbacks"
on llm_feedbacks for select
using (auth.uid() = user_id);

create policy "Users can insert own feedbacks"
on llm_feedbacks for insert
with check (auth.uid() = user_id);

create policy "Users can delete own feedbacks"
on llm_feedbacks for delete
using (auth.uid() = user_id);
```

---

### 3.9 health_workout_sync_logs 테이블 RLS

```sql
alter table health_workout_sync_logs enable row level security;

create policy "Users can read own health sync logs"
on health_workout_sync_logs for select
using (auth.uid() = user_id);

create policy "Users can insert own health sync logs"
on health_workout_sync_logs for insert
with check (auth.uid() = user_id);

create policy "Users can delete own health sync logs"
on health_workout_sync_logs for delete
using (auth.uid() = user_id);
```

---

## 4. 검증

모든 SQL 실행 후 검증:

### 4.1 테이블 확인

Supabase Dashboard → Table Editor에서 9개 테이블이 생성되었는지 확인:
- ✅ profiles
- ✅ goals
- ✅ meal_logs
- ✅ exercise_logs
- ✅ weight_logs
- ✅ daily_summaries
- ✅ llm_parse_logs
- ✅ llm_feedbacks
- ✅ health_workout_sync_logs

---

### 4.2 RLS 정책 확인

각 테이블의 "RLS Policies" 탭에서 4개 정책(SELECT, INSERT, UPDATE, DELETE) 확인

---

### 4.3 Supabase Auth 설정

**Authentication → Providers → Email 활성화**
- Email 인증 활성화
- Confirm email: **Disabled** (MVP에서는 이메일 확인 생략)

---

## 5. 다음 단계

Phase 1 완료 후:
- **Phase 2**: 인증 & 라우팅 구현
  - Supabase client 설정
  - Auth store (Zustand)
  - 로그인/회원가입 화면
  - Auth guard

---

## 문제 해결

### 테이블 생성 실패 시
- SQL 에러 메시지 확인
- 이미 같은 이름의 테이블이 존재하는지 확인
- 필요시 `drop table [table_name] cascade;` 후 재실행

### RLS 정책 적용 안 될 시
- `alter table [table_name] enable row level security;`가 실행되었는지 확인
- Supabase Dashboard에서 Table → RLS Policies 탭 확인

---

## 참고

전체 스키마 문서: `7700.md` 파일의 "Database Schema" 섹션 참조
