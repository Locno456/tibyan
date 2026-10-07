-- Apply AFTER schema.sql. Public links expose only an explicitly published snapshot.
-- Do not grant SELECT on this table to anon. A secret 64-character token is required by the RPC.
create extension if not exists pgcrypto;
create table if not exists public.tibyan_shared_conversations (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  token_hash text not null unique,
  published boolean not null default false,
  snapshot jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id),
  constraint shared_session_id_length check (length(session_id) between 1 and 120),
  constraint shared_snapshot_size check (pg_column_size(snapshot) <= 500000)
);
alter table public.tibyan_shared_conversations enable row level security;
drop policy if exists "Owners manage shared snapshots" on public.tibyan_shared_conversations;
create policy "Owners manage shared snapshots" on public.tibyan_shared_conversations
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.tibyan_shared_conversations from anon;
grant select, insert, update, delete on public.tibyan_shared_conversations to authenticated;

create or replace function public.get_tibyan_shared_conversation(p_token text)
returns jsonb language plpgsql security definer set search_path = 'pg_catalog, extensions, public' as $$
declare result jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select snapshot into result from public.tibyan_shared_conversations
    where token_hash = encode(digest(p_token, 'sha256'), 'hex') and published = true;
  return result;
end;
$$;
revoke all on function public.get_tibyan_shared_conversation(text) from public;
grant execute on function public.get_tibyan_shared_conversation(text) to anon, authenticated;
-- A new token on each re-publication makes previous links invalid. Deletion revokes immediately.
