-- 004_cleanup_expired.sql
-- Functions to clean up expired messages and ended event rooms

begin;

-- Delete messages that have expired (past their TTL)
create or replace function public.cleanup_expired_messages()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.messages
  where expires_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Delete event rooms that ended more than 24 hours ago
-- Also cleans up their members (cascade)
create or replace function public.cleanup_ended_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.rooms
  where room_type = 'event'
    and ends_at is not null
    and ends_at < now() - interval '24 hours';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Convenience: run all cleanup in one call
create or replace function public.cleanup_all()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_messages integer;
  v_events integer;
  v_stale integer;
begin
  select public.cleanup_expired_messages() into v_messages;
  select public.cleanup_ended_events() into v_events;
  select public.sweep_stale_presence() into v_stale;

  return jsonb_build_object(
    'expired_messages_deleted', v_messages,
    'ended_events_deleted', v_events,
    'stale_members_swept', v_stale
  );
end;
$$;

commit;
