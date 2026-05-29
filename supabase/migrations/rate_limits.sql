-- Durable, cross-instance rate limiting backed by Postgres.
-- The app's in-memory limiter resets on every serverless cold start; this table
-- + function survives across instances and restarts. Service-role only (RLS
-- denies anon/authenticated; the API routes use the service role).
--
-- Safe to run any time: the rate-limit code fails OPEN until this exists, so
-- deploying the code before this migration never blocks traffic.

create table if not exists public.rate_limits (
  bucket   text primary key,
  count    int not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;
-- No policies for anon/authenticated => all access denied. service_role bypasses RLS.
grant all on public.rate_limits to service_role;

-- Atomic "hit": increments the bucket within its window and returns whether the
-- request is allowed (count <= limit). Resets the window once it has elapsed.
create or replace function public.rate_limit_hit(
  p_bucket text,
  p_limit int,
  p_window_ms bigint
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now   timestamptz := now();
  v_count int;
begin
  insert into public.rate_limits as r (bucket, count, reset_at)
    values (p_bucket, 1, v_now + make_interval(secs => p_window_ms / 1000.0))
  on conflict (bucket) do update
    set count    = case when r.reset_at < v_now then 1 else r.count + 1 end,
        reset_at = case when r.reset_at < v_now
                        then v_now + make_interval(secs => p_window_ms / 1000.0)
                        else r.reset_at end
  returning r.count into v_count;

  return v_count <= p_limit;
end;
$$;

grant execute on function public.rate_limit_hit(text, int, bigint) to service_role;
