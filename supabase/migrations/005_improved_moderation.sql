-- 005_improved_moderation.sql
-- Improved content filtering, user timeouts, and progressive bans

begin;

-- =========================
-- 1. Better content filter with more comprehensive blocklist
-- =========================
create or replace function public.fn_contains_blocked_content(input text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce($1,'')) ~ (
    -- Sexual/explicit
    'porn|nude|nudes|sex|hookup|blowjob|handjob|masturbat|orgasm|erotic|fetish|'
    || 'onlyfans|camgirl|camboy|stripper|escort|prostitut|'
    -- Slurs and hate speech
    || 'nigger|nigga|faggot|fag|retard|tranny|'
    -- Violence
    || 'kill\s?(you|ur|yourself)|kys\b|rape|'
    -- Drugs (solicitation)
    || 'sell(ing)?\s?(weed|molly|coke|meth|xanax|adderall|pills)|'
    -- Spam patterns
    || 'buy\s?now|act\s?fast|limited\s?offer|click\s?here|free\s?money'
  )
$$;

-- =========================
-- 2. Track user violations for progressive discipline
-- =========================
create table if not exists public.user_violations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  room_id uuid references public.rooms(id) on delete set null,
  violation_type text not null check (violation_type in ('content_blocked','pii_blocked','shadow_muted','reported')),
  details text,
  created_at timestamptz not null default now()
);

create index if not exists user_violations_user_idx on public.user_violations(user_id, created_at desc);

-- RLS: hidden from users
alter table public.user_violations enable row level security;
create policy "violations_no_select" on public.user_violations for select to authenticated using (false);

-- =========================
-- 3. Check if user is timed out (returns timeout end time or null)
-- =========================
create or replace function public.fn_get_user_timeout(p_user_id uuid)
returns timestamptz
language sql
stable
as $$
  select max(
    case
      -- 3 violations in 1 hour = 15 min timeout
      when v.cnt_1h >= 3 then v.latest + interval '15 minutes'
      -- 5 violations in 24 hours = 1 hour timeout
      when v.cnt_24h >= 5 then v.latest + interval '1 hour'
      -- 10 violations in 7 days = 24 hour timeout (soft ban)
      when v.cnt_7d >= 10 then v.latest + interval '24 hours'
      else null
    end
  )
  from (
    select
      count(*) filter (where created_at > now() - interval '1 hour') as cnt_1h,
      count(*) filter (where created_at > now() - interval '24 hours') as cnt_24h,
      count(*) filter (where created_at > now() - interval '7 days') as cnt_7d,
      max(created_at) as latest
    from public.user_violations
    where user_id = p_user_id
  ) v
$$;

-- =========================
-- 4. Updated send_message with violation tracking and timeout check
-- =========================
drop function if exists public.send_message(uuid, text, double precision, double precision, integer);

create function public.send_message(p_room_id uuid, p_text text, p_lat double precision, p_lng double precision, p_accuracy_m integer)
returns table (out_message_id uuid, out_created_at timestamptz, out_expires_at timestamptz)
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
  v_timeout timestamptz;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_text is null or char_length(p_text) = 0 then raise exception 'empty_message'; end if;
  if char_length(p_text) > 200 then raise exception 'message_too_long'; end if;

  -- Check user timeout
  v_timeout := public.fn_get_user_timeout(v_user);
  if v_timeout is not null and v_timeout > v_now then
    raise exception 'user_timed_out';
  end if;

  select * into v_room from public.rooms where rooms.id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;

  select * into v_member from public.room_members rm where rm.room_id = p_room_id and rm.user_id = v_user;
  if not found then raise exception 'not_a_member'; end if;

  if v_member.is_shadow_muted then
    insert into public.moderation_events(room_id, user_id, event_type, payload, expires_at)
    values (p_room_id, v_user, 'shadow_mute', jsonb_build_object('action','blocked_send'), v_now + interval '30 days');
    raise exception 'shadow_muted';
  end if;

  if v_room.room_type = 'event' then
    if not (v_now between v_room.starts_at and v_room.ends_at) then raise exception 'room_not_active'; end if;
  end if;

  v_pt := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_dist := st_distance(v_room.center, v_pt);

  if p_accuracy_m > 100 then raise exception 'low_accuracy'; end if;
  if v_dist > (v_room.radius_m + v_room.tolerance_m) then raise exception 'outside_geofence'; end if;

  -- Rate limit
  select max(m.created_at) into v_last_msg from public.messages m where m.room_id = p_room_id and m.user_id = v_user;
  if v_last_msg is not null and v_last_msg > (v_now - interval '5 seconds') then raise exception 'rate_limited'; end if;

  -- PII filter
  if public.fn_contains_pii(p_text) then
    insert into public.user_violations(user_id, room_id, violation_type, details)
    values (v_user, p_room_id, 'pii_blocked', left(p_text, 50));
    insert into public.moderation_events(room_id, user_id, event_type, payload, expires_at)
    values (p_room_id, v_user, 'auto_block', jsonb_build_object('reason','pii'), v_now + interval '30 days');
    raise exception 'pii_blocked';
  end if;

  -- Content filter
  if public.fn_contains_blocked_content(p_text) then
    insert into public.user_violations(user_id, room_id, violation_type, details)
    values (v_user, p_room_id, 'content_blocked', left(p_text, 50));
    insert into public.moderation_events(room_id, user_id, event_type, payload, expires_at)
    values (p_room_id, v_user, 'auto_block', jsonb_build_object('reason','blocked_keywords'), v_now + interval '30 days');
    raise exception 'content_blocked';
  end if;

  -- TTL
  if v_room.room_type = 'neighborhood' then
    v_expires := v_now + interval '60 minutes';
  else
    v_expires := least(v_now + interval '60 minutes', v_room.ends_at);
  end if;

  insert into public.messages(room_id, user_id, alias, text, created_at, expires_at, status)
  values (p_room_id, v_user, v_member.alias, p_text, v_now, v_expires, 'active')
  returning id into v_mid;

  return query select v_mid, v_now, v_expires;
end;
$$;

commit;
