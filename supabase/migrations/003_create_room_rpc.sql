-- 003_create_room_rpc.sql
-- RPC for creating rooms from the mobile client

begin;

create or replace function public.create_room(
  p_name text,
  p_room_type text,
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer default 30,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null
)
returns table (
  room_id uuid,
  name text,
  room_type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_room_id uuid;
  v_center geography(point, 4326);
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'empty_name';
  end if;

  if char_length(p_name) > 60 then
    raise exception 'name_too_long';
  end if;

  if p_room_type not in ('neighborhood', 'event') then
    raise exception 'invalid_room_type';
  end if;

  if p_room_type = 'event' then
    if p_starts_at is null or p_ends_at is null then
      raise exception 'missing_event_times';
    end if;
    if p_ends_at <= p_starts_at then
      raise exception 'invalid_event_times';
    end if;
  end if;

  v_center := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;

  insert into public.rooms(room_type, name, center, radius_m, starts_at, ends_at, created_by)
  values (p_room_type, trim(p_name), v_center, p_radius_m, p_starts_at, p_ends_at, v_user)
  returning id into v_room_id;

  return query select v_room_id, trim(p_name), p_room_type;
end;
$$;

commit;
