-- AI 호출 횟수를 사용자·날짜·기능별로 센다. 다시 입력하거나 악의적으로 반복 호출해도
-- 하루 비용이 한도 안에 머물게 하려는 것이다. 날짜는 한국 시간 기준이다.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  feature text not null check (feature in ('parse_log', 'estimate_calories')),
  count integer not null default 0 check (count >= 0),
  primary key (user_id, usage_date, feature)
);

comment on table public.ai_usage is
  'AI 기능 일일 사용 횟수. consume_ai_quota 로만 늘린다. 사용자는 읽기만 할 수 있다.';

alter table public.ai_usage enable row level security;

-- 쓰기 정책은 두지 않는다. 사용자가 REST 로 횟수를 지우거나 줄이지 못하게 한다.
create policy "ai_usage_select_own" on public.ai_usage
  for select using (auth.uid() = user_id);

grant select on public.ai_usage to authenticated;

/**
 * 호출한 사용자의 오늘 사용 횟수를 1 늘리고 남은 횟수를 돌려준다.
 * 이미 한도에 닿았으면 늘리지 않고 -1 을 돌려준다.
 *
 * INSERT .. ON CONFLICT DO UPDATE .. WHERE 한 문장으로 검사와 증가를 함께 해서,
 * 동시에 여러 요청이 와도 한도를 넘겨 세지 않는다.
 * 사용자가 이 함수를 직접 불러도 자기 횟수만 줄어들 뿐 AI 는 호출되지 않는다.
 */
create or replace function public.consume_ai_quota(p_feature text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_count integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_limit is null or p_limit < 1 then
    return -1;
  end if;

  insert into public.ai_usage as u (user_id, usage_date, feature, count)
  values (v_user, v_today, p_feature, 1)
  on conflict (user_id, usage_date, feature)
  do update set count = u.count + 1
  where u.count < p_limit
  returning u.count into v_count;

  if v_count is null then
    return -1;
  end if;
  return p_limit - v_count;
end;
$$;

revoke all on function public.consume_ai_quota(text, integer) from public, anon;
grant execute on function public.consume_ai_quota(text, integer) to authenticated;
