-- Jarvis Operator — migration 03: workspaces + workspace scoping.
-- Run after supabase/schema.sql and supabase/schema-02.sql.

create extension if not exists "pgcrypto";

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My workspace',
  owner_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists idx_ws_members_user on workspace_members(user_id);

-- Workspace scoping for every business table.
do $$ declare t text; begin
  foreach t in array array['leads','lead_events','lead_notes','lead_tags','lead_tasks','outreach_messages','outreach_sequences','ai_generations','website_audits','demos','deployments','invoices','payments','email_deliveries']
  loop
    execute format('alter table %I add column if not exists workspace_id uuid references workspaces(id) on delete cascade', t);
    execute format('alter table %I add column if not exists owner_id uuid', t);
    execute format('alter table %I add column if not exists updated_at timestamptz not null default now()', t);
    execute format('create index if not exists idx_%I_ws on %I(workspace_id)', t, t);
  end loop;
end $$;

alter table workspace_settings add column if not exists workspace_id uuid references workspaces(id) on delete cascade;

alter table workspaces enable row level security;
alter table workspace_members enable row level security;

drop policy if exists "ws_member_read" on workspaces;
create policy "ws_member_read" on workspaces for select to authenticated
  using (exists (select 1 from workspace_members m where m.workspace_id = workspaces.id and m.user_id = auth.uid()));
drop policy if exists "ws_owner_write" on workspaces;
create policy "ws_owner_write" on workspaces for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "ws_self_read" on workspace_members;
create policy "ws_self_read" on workspace_members for select to authenticated using (user_id = auth.uid());
drop policy if exists "ws_owner_manage" on workspace_members;
create policy "ws_owner_manage" on workspace_members for all to authenticated
  using (exists (select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid()));

-- Workspace-isolated policies for business tables (member of the row's workspace).
do $$ declare t text; begin
  foreach t in array array['leads','lead_events','lead_notes','lead_tags','lead_tasks','outreach_messages','outreach_sequences','ai_generations','website_audits','demos','deployments','invoices','payments','email_deliveries']
  loop
    execute format('drop policy if exists "ws_isolation" on %I', t);
    execute format('create policy "ws_isolation" on %I for all to authenticated using (exists (select 1 from workspace_members m where m.workspace_id = %I.workspace_id and m.user_id = auth.uid())) with check (exists (select 1 from workspace_members m where m.workspace_id = %I.workspace_id and m.user_id = auth.uid()))', t, t, t);
  end loop;
end $$;
