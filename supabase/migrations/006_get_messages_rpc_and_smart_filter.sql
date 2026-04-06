-- 006_get_messages_rpc_and_smart_filter.sql
-- 1. RPC to load messages (bypasses RLS timing issues)
-- 2. Smarter content filter that normalizes text before checking

begin;

-- =========================
-- 1. RPC to get room messages (security definer = bypasses RLS)
-- =========================
create or replace function public.get_room_messages(
  p_room_id uuid,
  p_limit integer default 50
)
returns table (
  id uuid,
  room_id uuid,
  user_id uuid,
  alias text,
  text text,
  created_at timestamptz,
  expires_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  -- Verify user is a member
  if not exists (select 1 from public.room_members rm where rm.room_id = p_room_id and rm.user_id = v_user) then
    raise exception 'not_a_member';
  end if;

  return query
    select m.id, m.room_id, m.user_id, m.alias, m.text, m.created_at, m.expires_at, m.status
    from public.messages m
    where m.room_id = p_room_id
      and m.status = 'active'
      and m.expires_at > now()
    order by m.created_at desc
    limit greatest(1, least(p_limit, 100));
end;
$$;

-- =========================
-- 2. Normalize text for content filtering
-- Handles: leetspeak (h0okup, pr0n), spacing (s e x), special chars (s.e.x), repeats (sexxxx)
-- =========================
create or replace function public.fn_normalize_text(input text)
returns text
language sql
immutable
as $$
  select
    -- Step 4: collapse repeated chars (seeex → sex)
    regexp_replace(
      -- Step 3: remove non-alpha chars (dots, spaces, dashes between letters)
      regexp_replace(
        -- Step 2: leetspeak substitution
        translate(
          -- Step 1: lowercase
          lower(coalesce(input, '')),
          '0134578@!$',
          'oleastba!s'
        ),
        '[^a-z]', '', 'g'
      ),
      '(.)\1{2,}', '\1\1', 'g'
    )
$$;

-- =========================
-- 3. Updated content filter using normalization
-- =========================
create or replace function public.fn_contains_blocked_content(input text)
returns boolean
language sql
immutable
as $$
  select
    -- Check both raw lowercase and normalized version
    lower(coalesce($1,'')) ~ (
      'porn|nude|nudes|sex|hookup|blowjob|handjob|masturbat|orgasm|erotic|fetish|'
      || 'onlyfans|camgirl|camboy|stripper|escort|prostitut|'
      || 'nigger|nigga|faggot|fag\b|retard|tranny|'
      || 'kill\s?(you|ur|yourself)|kys\b|rape|'
      || 'sell(ing)?\s?(weed|molly|coke|meth|xanax|adderall|pills)|'
      || 'buy\s?now|act\s?fast|limited\s?offer|click\s?here|free\s?money'
    )
    or
    public.fn_normalize_text($1) ~ (
      'porn|nude|nudes|sex|hookup|blowjob|handjob|masturbat|orgasm|erotic|fetish|'
      || 'onlyfans|camgirl|camboy|stripper|escort|prostitut|'
      || 'nigger|nigga|faggot|retard|tranny|'
      || 'killyou|killyourself|kys|rape|'
      || 'sellweed|sellmolly|sellcoke|sellmeth|sellxanax|sellpills'
    )
$$;

commit;
