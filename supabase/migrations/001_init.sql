-- 001_init.sql
-- Colibri Chat (v0) - Supabase/Postgres schema + RPC functions
-- Requires: postgis, pgcrypto

begin;

-- Extensions
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- =========================
-- Enums / constants (simple via CHECK in v0)
-- =========================

-- Rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_type text not null check (room_type in ('neighborhood','event')),
  name text not null,
  -- v0: radius geofence (polygon later)
  center geography(point, 4326) not null,
  radius_m integer not null default 30 check (radius_m >= 1 and radius_m <= 500),
  tolerance_m integer not null default 6 check (tolerance_m >= 0 and tolerance_m <= 100),
  -- event rooms only
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  check (
    (room_type = 'neighborhood' and starts_at is null and ends_at is null)
    or
    (room_type = 'event' and starts_at is not null and ends_at is not null and ends_at > starts_at)
  )
);

create index if not exists rooms_center_idx on public.rooms using gist (center);

-- Members (presence + moderation)
create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('owner','mod','member')),
  alias text not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_location geography(point, 4326) null,
  last_accuracy_m integer null,
  is_present boolean not null default true,
  is_shadow_muted boolean not null default false,
  primary key (room_id, user_id)
);

create index if not exists room_members_room_idx on public.room_members(room_id);
create index if not exists room_members_seen_idx on public.room_members(room_id, last_seen_at desc);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,
  alias text not null,
  text text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active','deleted','hidden')),
  -- hard constraints
  constraint messages_text_len check (char_length(text) <= 200)
);

create index if not exists messages_room_time_idx on public.messages(room_id, created_at desc);
create index if not exists messages_expires_idx on public.messages(expires_at);

-- Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  reporter_id uuid not null,
  reason text not null,
  created_at timestamptz not null default now(),
  -- one report per reporter per message
  unique (message_id, reporter_id)
);

create index if not exists reports_room_time_idx on public.reports(room_id, created_at desc);

-- Moderation events (separate retention)
create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid null references public.rooms(id) on delete set null,
  message_id uuid null references public.messages(id) on delete set null,
  user_id uuid null,
  event_type text not null check (event_type in ('auto_block','user_report','shadow_mute','room_lock')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists moderation_events_expires_idx on public.moderation_events(expires_at);

-- =========================
-- Helpers
-- =========================

-- Basic PII detection (v0): phone/email/handle-ish
create or replace function public.fn_contains_pii(input text)
returns boolean
language plpgsql
immutable
as $$
declare
  t text := lower(coalesce(input,''));
begin
  -- email
  if t ~* '([a-z0-9._%+\-]+)@([a-z0-9.\-]+\.[a-z]{2,})' then
    return true;
  end if;

  -- phone (very rough): 10+ digits with optional separators
  if t ~* '(\+?\d[\d\-\s\(\)]{8,}\d)' then
    return true;
  end if;

  -- social handle hints
  if t ~* '(@[a-z0-9_\.]{3,})' then
    return true;
  end if;

  if t like '%instagram%' or t like '%snap%' or t like '%whatsapp%' or t like '%telegram%' then
    return true;
  end if;

  return false;
end;
$$;

-- Basic explicit content keyword blocklist (v0 minimal; replace with better later)
create or replace function public.fn_contains_blocked_content(input text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce($1,'')) ~ '(porn|nude|sex|hookup|blowjob|nudes)'
$$;

-- Compute distance meters between two points
create or replace function public.fn_distance_m(a geography, b geography)
returns double precision
language sql
immutable
as $$
  select st_distance(a, b)
$$;

-- =========================
-- RPC: get nearby rooms
-- =========================
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
  is_active boolean
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
    end as is_active
  from public.rooms r
  where
    -- include if within radius+tolerance (discovery)
    st_distance(r.center, (select g from user_pt)) <= (r.radius_m + r.tolerance_m)
  order by distance_m asc
  limit greatest(1, least(p_limit, 50));
$$;

-- =========================
-- RPC: join room (server-side geo validation)
-- =========================
create or replace function public.join_room(
  p_room_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy_m integer
)
returns table (
  room_id uuid,
  user_id uuid,
  alias text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_pt geography(point, 4326);
  v_dist double precision;
  v_alias text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if p_accuracy_m is null or p_accuracy_m > 1000 then
    raise exception 'invalid_accuracy';
  end if;

  select * into v_room from public.rooms where id = p_room_id;
  if not found then
    raise exception 'room_not_found';
  end if;

  -- event active window gate
  if v_room.room_type = 'event' then
    if not (now() between v_room.starts_at and v_room.ends_at) then
      raise exception 'room_not_active';
    end if;
  end if;

  v_pt := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_dist := st_distance(v_room.center, v_pt);

  if v_dist > (v_room.radius_m + v_room.tolerance_m) then
    raise exception 'outside_geofence';
  end if;

  -- generate alias per room (deterministic-ish but non-identifying)
  v_alias := 'User-' || substring(encode(digest(v_user::text || p_room_id::text, 'sha256'), 'hex') from 1 for 6);

  insert into public.room_members(room_id, user_id, role, alias, last_seen_at, last_location, last_accuracy_m, is_present)
  values (p_room_id, v_user, 'member', v_alias, now(), v_pt, p_accuracy_m, true)
  on conflict (room_id, user_id)
  do update set
    last_seen_at = excluded.last_seen_at,
    last_location = excluded.last_location,
    last_accuracy_m = excluded.last_accuracy_m,
    is_present = true;

  return query
    select p_room_id, v_user, v_alias;
end;
$$;

-- =========================
-- RPC: heartbeat (presence + geofence check)
-- =========================
create or replace function public.heartbeat(
  p_room_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy_m integer
)
returns table (
  room_id uuid,
  user_id uuid,
  is_present boolean,
  distance_m double precision
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_pt geography(point, 4326);
  v_dist double precision;
  v_present boolean;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_room from public.rooms where id = p_room_id;
  if not found then
    raise exception 'room_not_found';
  end if;

  v_pt := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_dist := st_distance(v_room.center, v_pt);

  v_present := (v_dist <= (v_room.radius_m + v_room.tolerance_m)) and (p_accuracy_m <= 25);

  update public.room_members
  set
    last_seen_at = now(),
    last_location = v_pt,
    last_accuracy_m = p_accuracy_m,
    is_present = v_present
  where room_id = p_room_id and user_id = v_user;

  return query select p_room_id, v_user, v_present, v_dist;
end;
$$;

-- =========================
-- RPC: send message (geo + TTL + rate limit + filters)
-- =========================
create or replace function public.send_message(
  p_room_id uuid,
  p_text text,
  p_lat double precision,
  p_lng double precision,
  p_accuracy_m integer
)
returns table (
  message_id uuid,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_member public.room_members%rowtype;
  v_now timestamptz := now();
  v_pt geography(point, 4326);
  v_dist double precision;
  v_expires timestamptz;
  v_last_msg timestamptz;
  v_mid uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if p_text is null or char_length(p_text) = 0 then
    raise exception 'empty_message';
  end if;

  if char_length(p_text) > 200 then
    raise exception 'message_too_long';
  end if;

  -- fetch room + member
  select * into v_room from public.rooms where id = p_room_id;
  if not found then
    raise exception 'room_not_found';
  end if;

  select * into v_member from public.room_members where room_id = p_room_id and user_id = v_user;
  if not found then
    raise exception 'not_a_member';
  end if;

  if v_member.is_shadow_muted then
    -- silently accept but do not broadcast: insert moderation event and return fake id
    insert into public.moderation_events(room_id, user_id, event_type, payload, expires_at)
    values (p_room_id, v_user, 'shadow_mute', jsonb_build_object('action','blocked_send'), v_now + interval '30 days');
    raise exception 'shadow_muted';
  end if;

  -- event active gate
  if v_room.room_type = 'event' then
    if not (v_now between v_room.starts_at and v_room.ends_at) then
      raise exception 'room_not_active';
    end if;
  end if;

  -- geo + accuracy gate
  v_pt := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_dist := st_distance(v_room.center, v_pt);

  if p_accuracy_m > 25 then
    raise exception 'low_accuracy';
  end if;

  if v_dist > (v_room.radius_m + v_room.tolerance_m) then
    raise exception 'outside_geofence';
  end if;

  -- rate limit (1 msg / 5 sec per user per room)
  select max(created_at) into v_last_msg
  from public.messages
  where room_id = p_room_id and user_id = v_user;

  if v_last_msg is not null and v_last_msg > (v_now - interval '5 seconds') then
    raise exception 'rate_limited';
  end if;

  -- content filters (v0 minimal)
  if public.fn_contains_pii(p_text) then
    insert into public.moderation_events(room_id, user_id, event_type, payload, expires_at)
    values (p_room_id, v_user, 'auto_block', jsonb_build_object('reason','pii'), v_now + interval '30 days');
    raise exception 'pii_blocked';
  end if;

  if public.fn_contains_blocked_content(p_text) then
    insert into public.moderation_events(room_id, user_id, event_type, payload, expires_at)
    values (p_room_id, v_user, 'auto_block', jsonb_build_object('reason','blocked_keywords'), v_now + interval '30 days');
    raise exception 'content_blocked';
  end if;

  -- expiry
  if v_room.room_type = 'neighborhood' then
    v_expires := v_now + interval '60 minutes';
  else
    -- event
    v_expires := least(v_now + interval '60 minutes', v_room.ends_at);
  end if;

  insert into public.messages(room_id, user_id, alias, text, created_at, expires_at, status)
  values (p_room_id, v_user, v_member.alias, p_text, v_now, v_expires, 'active')
  returning id into v_mid;

  return query select v_mid, v_now, v_expires;
end;
$$;

-- =========================
-- RPC: report message (and shadow mute threshold)
-- =========================
create or replace function public.report_message(
  p_room_id uuid,
  p_message_id uuid,
  p_reason text
)
returns table (
  report_id uuid,
  shadow_muted boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_report_id uuid;
  v_target_user uuid;
  v_count int;
  v_shadow boolean := false;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  -- must be member to report
  if not exists (select 1 from public.room_members where room_id = p_room_id and user_id = v_user) then
    raise exception 'not_a_member';
  end if;

  -- find target user
  select user_id into v_target_user from public.messages where id = p_message_id and room_id = p_room_id;
  if v_target_user is null then
    raise exception 'message_not_found';
  end if;

  insert into public.reports(room_id, message_id, reporter_id, reason, created_at)
  values (p_room_id, p_message_id, v_user, coalesce(p_reason,'unspecified'), v_now)
  returning id into v_report_id;

  insert into public.moderation_events(room_id, message_id, user_id, event_type, payload, expires_at)
  values (p_room_id, p_message_id, v_target_user, 'user_report',
          jsonb_build_object('reporter', v_user, 'reason', coalesce(p_reason,'unspecified')),
          v_now + interval '30 days');

  -- shadow mute threshold: >=3 unique reporters in 10 minutes in same room
  select count(*) into v_count
  from public.reports r
  join public.messages m on m.id = r.message_id
  where m.room_id = p_room_id
    and m.user_id = v_target_user
    and r.created_at >= (v_now - interval '10 minutes');

  if v_count >= 3 then
    update public.room_members
    set is_shadow_muted = true
    where room_id = p_room_id and user_id = v_target_user;

    insert into public.moderation_events(room_id, user_id, event_type, payload, expires_at)
    values (p_room_id, v_target_user, 'shadow_mute',
            jsonb_build_object('reason','report_threshold','count',v_count),
            v_now + interval '30 days');

    v_shadow := true;
  end if;

  return query select v_report_id, v_shadow;
end;
$$;

commit;