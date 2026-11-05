-- Execute em Supabase > SQL Editor antes de habilitar a interface.
-- Um workspace privado por usuário; os dados financeiros ficam no Supabase.
create table if not exists public.finance_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{
    "products":[],"costs":[],"thresholds":{"low":15},"profitGoal":0,
    "sales":[],"adSpends":[],"monthCloses":[]
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.finance_workspaces enable row level security;
alter table public.finance_workspaces force row level security;
revoke all on public.finance_workspaces from anon;
grant select, insert, update, delete on public.finance_workspaces to authenticated;
drop policy if exists "owner_select" on public.finance_workspaces;
drop policy if exists "owner_insert" on public.finance_workspaces;
drop policy if exists "owner_update" on public.finance_workspaces;
drop policy if exists "owner_delete" on public.finance_workspaces;
create policy "owner_select" on public.finance_workspaces
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner_insert" on public.finance_workspaces
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner_update" on public.finance_workspaces
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "owner_delete" on public.finance_workspaces
  for delete to authenticated using ((select auth.uid()) = user_id);
create or replace function public.finance_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
 new.updated_at = now();
 return new;
end;
$$;
drop trigger if exists finance_updated_at on public.finance_workspaces;
create trigger finance_updated_at before update on public.finance_workspaces
for each row execute function public.finance_set_updated_at();
