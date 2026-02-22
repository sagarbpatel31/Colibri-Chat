-- rls.sql - Row Level Security policies for Colibri Chat v0

begin;

-- Enable RLS
alter table public.rooms enable row level security;

alter table public.room_members enable row level security;

alter table public.messages enable row level security;

alter table public.reports enable row level security;

alter table public.moderation_events enable row level security;

-- ROOMS
-- Public discovery via RPC; direct select is allowed but could be restricted.
-- v0: allow authenticated users to read rooms (RPC already filters)
create policy "rooms_read_authenticated" on public.rooms for
select to authenticated using (true);

-- v0: only authenticated users can create rooms (optional; you can lock this down later)
create policy "rooms_insert_authenticated" on public.rooms for
insert
    to authenticated
with
    check (true);

-- ROOM MEMBERS
-- Users can read members only for rooms they belong to
create policy "members_read_in_room" on public.room_members for
select to authenticated using (
        exists (
            select 1
            from public.room_members rm
            where
                rm.room_id = room_members.room_id
                and rm.user_id = auth.uid ()
        )
    );

-- Users can update their own member row (heartbeat/presence)
create policy "members_update_self" on public.room_members for
update to authenticated using (user_id = auth.uid ())
with
    check (user_id = auth.uid ());

-- Messages
-- Only members can read messages in that room, and only non-expired + active-ish messages
create policy "messages_read_in_room" on public.messages for
select to authenticated using (
        status = 'active'
        and expires_at > now()
        and exists (
            select 1
            from public.room_members rm
            where
                rm.room_id = messages.room_id
                and rm.user_id = auth.uid ()
        )
    );

-- No direct insert into messages from client; force send via RPC
create policy "messages_no_direct_insert" on public.messages for
insert
    to authenticated
with
    check (false);

-- Reports
-- Only members can create reports (done via RPC, but allow insert anyway)
create policy "reports_insert_in_room" on public.reports for
insert
    to authenticated
with
    check (
        exists (
            select 1
            from public.room_members rm
            where
                rm.room_id = reports.room_id
                and rm.user_id = auth.uid ()
        )
    );

-- Users can read their own reports (optional)
create policy "reports_read_own" on public.reports for
select to authenticated using (reporter_id = auth.uid ());

-- Moderation events
-- v0: keep moderation_events hidden from normal users
create policy "moderation_events_no_select" on public.moderation_events for
select to authenticated using (false);

commit;