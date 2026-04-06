-- 007_comprehensive_profanity_filter.sql
-- Comprehensive profanity, abuse, and inappropriate content filter

begin;

-- =========================
-- Improved normalizer: also handles * and common censoring tricks
-- =========================
create or replace function public.fn_normalize_text(input text)
returns text
language sql
immutable
as $$
  select
    regexp_replace(
      regexp_replace(
        translate(
          lower(coalesce(input, '')),
          '0134578@!$*_',
          'oleastba!s  '
        ),
        '[^a-z]', '', 'g'
      ),
      '(.)\1{2,}', '\1\1', 'g'
    )
$$;

-- =========================
-- Comprehensive blocked content check
-- =========================
create or replace function public.fn_contains_blocked_content(input text)
returns boolean
language sql
immutable
as $$
  with checks as (
    select
      lower(coalesce($1, '')) as raw,
      public.fn_normalize_text($1) as normalized
  )
  select
    -- === RAW TEXT CHECKS (with word boundaries and spacing) ===
    c.raw ~ (
      -- Profanity (common swear words and variations)
      '\mfu+c+k\M|'
      || '\mf+u+k\M|'
      || '\mfck\M|'
      || '\mfuk\M|'
      || '\mwtf\M|'
      || '\mstfu\M|'
      || '\mshi+t\M|'
      || '\mshyt\M|'
      || '\mbi+tch\M|'
      || '\mbich\M|'
      || '\mass+hole\M|'
      || '\ma+ss+h[o0]le\M|'
      || '\mdamn\M|'
      || '\mhell\M|'
      || '\mcrap\M|'
      || '\mdick\M|'
      || '\mcock\M|'
      || '\mpussy\M|'
      || '\mtwat\M|'
      || '\mcunt\M|'
      || '\mwh[o0]re\M|'
      || '\mslut\M|'
      || '\mprick\M|'
      || '\mbastard\M|'
      || '\mdouche\M|'
      || '\mmofo\M|'
      || '\mmotherfuck\M|'
      || '\mgoddamn\M|'
      || '\mbullshi\M|'
      || '\mhorseshi\M|'
      || '\mfking\M|'
      || '\mfkn\M|'
      || '\mfucking\M|'
      || '\mfucker\M|'
      || '\mfucked\M|'
      -- Partial censoring attempts
      || 'f[\s\*\.\-_]*u[\s\*\.\-_]*c[\s\*\.\-_]*k|'
      || 's[\s\*\.\-_]*h[\s\*\.\-_]*i[\s\*\.\-_]*t|'
      || 'b[\s\*\.\-_]*i[\s\*\.\-_]*t[\s\*\.\-_]*c[\s\*\.\-_]*h'
    )
    or c.raw ~ (
      -- Sexual / explicit
      'porn|nude|nudes|\mse+x\M|hookup|blowjob|handjob|masturbat|orgasm|erotic|fetish|'
      || 'onlyfans|camgirl|camboy|stripper|escort|prostitut|'
      || 'horny|boobs|tits|dildo|vibrator|anal\b|'
      || 'boner|cum\b|cumming|jizz|deepthroat|gangbang|'
      || '\mkiss\M'
    )
    or c.raw ~ (
      -- Slurs and hate speech
      'nigger|nigga|faggot|\mfag\M|retard|tranny|'
      || 'chink|spic|wetback|gook|kike|'
      || 'dyke|homo\b|queer\b'
    )
    or c.raw ~ (
      -- Violence and threats
      'kill\s?(you|ur|yourself|myself|him|her|them)|kys\b|rape|'
      || 'shoot\s?(you|up)|bomb\s?threat|'
      || 'murder|suicide\s?(pact|method)|'
      || 'stab\s?(you|him|her)'
    )
    or c.raw ~ (
      -- Drug solicitation
      'sell(ing)?\s?(weed|molly|coke|meth|xanax|adderall|pills|acid|shrooms|heroin|fentanyl)|'
      || 'buy\s?(weed|molly|coke|meth|drugs)|'
      || 'got\s?(weed|molly|coke|plug)'
    )
    or c.raw ~ (
      -- Spam
      'buy\s?now|act\s?fast|limited\s?offer|click\s?here|free\s?money|'
      || 'dm\s?me\s?for|hit\s?me\s?up\s?for|hmu\s?for'
    )
    -- === NORMALIZED TEXT CHECKS (catches leetspeak, spacing, special chars) ===
    or c.normalized ~ (
      'fuck|shit|bitch|asshole|cunt|whore|slut|cock|pussy|dick|twat|prick|'
      || 'porn|nude|nudes|hookup|blowjob|handjob|masturbat|orgasm|erotic|fetish|'
      || 'onlyfans|camgirl|stripper|escort|prostitut|horny|boobs|tits|dildo|'
      || 'nigger|nigga|faggot|retard|tranny|chink|'
      || 'killyou|killyourself|kys|rape|'
      || 'sellweed|sellmolly|sellcoke|sellmeth|sellpills|kiss'
    )
  from checks c
$$;

commit;
