-- 002_stale_presence_and_member_count.sql
-- 1. Replace get_nearby_rooms to include active member count
-- 2. Add a sweep function to mark stale members as not present

begin;

-- =========================
-- Updated get_nearby_rooms: now includes member_count
-- Must drop first because return type changed (added member_count column)
-- =========================
drop function if exists public.get_nearby_rooms(double precision, double precision, integer, integer);

create or replace function public.get_nearby_rooms(
  p_lat double precision,
  p_lng double precision,
  p_accuracy_m integer default 25,
  p_limit integer default 20
)
returns table (
  id uuid,
  room_type text,
  name text,
  radius_m integer,
  tolerance_m integer,
  starts_at timestamptz,
  ends_at timestamptz,
  distance_m double precision,
  is_active boolean,
  member_count bigint
)
language sql
stable
as $$
  with user_pt as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g
  )
  select
    r.id,
    r.room_type,
    r.name,
    r.radius_m,
    r.tolerance_m,
    r.starts_at,
    r.ends_at,
    st_distance(r.center, (select g from user_pt)) as distance_m,
    case
      when r.room_type = 'neighborhood' then true
      when r.room_type = 'event' then now() between r.starts_at and r.ends_at
      else false
    end as is_active,
    (
      select count(*)
      from public.room_members rm
      where rm.room_id = r.id
        and rm.is_present = true
        and rm.last_seen_at > now() - interval '60 seconds'
    ) as member_count
  from public.rooms r
  where
    st_distance(r.center, (select g from user_pt)) <= (r.radius_m + r.tolerance_m)
  order by distance_m asc
  limit greatest(1, least(p_limit, 50));
$$;

-- =========================
-- Sweep stale presence: marks members as not present if heartbeat > 60s ago
-- Can be called periodically or before reads
-- =========================
create or replace function public.sweep_stale_presence()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.room_members
  set is_present = false
  where is_present = true
    and last_seen_at < now() - interval '60 seconds';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

commit;
