-- Jarvis Operator — full production schema (migration 02).
-- Run supabase/schema.sql first, then this file.
-- All user-owned tables are workspace/user scoped via owner_id with RLS.

create extension if not exists "pgcrypto";

do $$ begin create type website_status as enum ('functional','unreachable','unknown','no_website','needs_improvement'); exception when duplicate_object then null; end $$;
do $$ begin create type outreach_channel as enum ('email','whatsapp','copy'); exception when duplicate_object then null; end $$;
do $$ begin create type outreach_status as enum ('draft','sent','opened','replied','failed','completed'); exception when duplicate_object then null; end $$;
do $$ begin create type invoice_status as enum ('draft','sent','partial','paid','overdue'); exception when duplicate_object then null; end $$;

alter table leads add column if not exists owner_id uuid;
alter table leads add column if not exists website_status website_status not null default 'unknown';
alter table leads add column if not exists place_id text;
alter table leads add column if not exists review_count int not null default 0;
alter table leads add column if not exists opportunity_score int not null default 0;
alter table leads add column if not exists updated_at timestamptz not null default now();
alter table activities add column if not exists owner_id uuid;
alter table proposals add column if not exists owner_id uuid;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text not null default 'Operator',
  created_at timestamptz not null default now()
);

create table if not exists lead_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  lead_id uuid references leads(id) on delete cascade,
  type text not null,
  message text not null default '',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  lead_id uuid not null references leads(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists lead_tags (
  lead_id uuid not null references leads(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  primary key (lead_id, tag)
);

create table if not exists lead_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  lead_id uuid references leads(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists outreach_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  lead_id uuid references leads(id) on delete cascade,
  channel outreach_channel not null,
  template text not null default '',
  subject text not null default '',
  body text not null default '',
  status outreach_status not null default 'draft',
  provider_id text,
  created_at timestamptz not null default now()
);

create table if not exists outreach_sequences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  name text not null default 'Default 4-touch',
  steps jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists ai_generations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  lead_id uuid references leads(id) on delete set null,
  op text not null,
  provider text not null default '',
  model text not null default '',
  prompt_version text not null default 'jarvis-ai-v1',
  output text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists website_audits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  lead_id uuid references leads(id) on delete set null,
  url text not null,
  final_url text,
  http_status int,
  scores jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists demos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  lead_id uuid references leads(id) on delete set null,
  template text not null default 'generic',
  content_html text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists deployments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  demo_id uuid references demos(id) on delete set null,
  site_id text not null,
  deployment_id text,
  url text,
  status text not null default 'deployed',
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  lead_id uuid references leads(id) on delete set null,
  number text not null,
  lines jsonb not null default '[]',
  discount numeric not null default 0,
  gst_enabled boolean not null default false,
  gst_rate numeric not null default 0,
  total numeric not null default 0,
  status invoice_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  invoice_id uuid references invoices(id) on delete cascade,
  amount numeric not null,
  method text not null default 'upi',
  created_at timestamptz not null default now()
);

create table if not exists email_deliveries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  lead_id uuid references leads(id) on delete set null,
  to_email text not null,
  subject text not null default '',
  status text not null default 'sent',
  provider_id text,
  created_at timestamptz not null default now()
);

create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  window_start timestamptz not null default now(),
  count int not null default 1
);

create table if not exists workspace_settings (
  owner_id uuid primary key default gen_random_uuid(),
  upi_vpa text,
  gstin text,
  business_name text not null default 'Jarvis Operator',
  email_from text,
  created_at timestamptz not null default now()
);

-- Ownership RLS: users can only touch their own rows (service role bypasses for server routes).
alter table lead_events enable row level security;
alter table lead_notes enable row level security;
alter table lead_tags enable row level security;
alter table lead_tasks enable row level security;
alter table outreach_messages enable row level security;
alter table outreach_sequences enable row level security;
alter table ai_generations enable row level security;
alter table website_audits enable row level security;
alter table demos enable row level security;
alter table deployments enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table email_deliveries enable row level security;
alter table workspace_settings enable row level security;

drop policy if exists "owner_isolation" on lead_events;
create policy "owner_isolation" on lead_events for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner_isolation" on lead_notes;
create policy "owner_isolation" on lead_notes for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner_isolation" on lead_tasks;
create policy "owner_isolation" on lead_tasks for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner_isolation" on outreach_messages;
create policy "owner_isolation" on outreach_messages for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner_isolation" on outreach_sequences;
create policy "owner_isolation" on outreach_sequences for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner_isolation" on ai_generations;
create policy "owner_isolation" on ai_generations for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner_isolation" on website_audits;
create policy "owner_isolation" on website_audits for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner_isolation" on demos;
create policy "owner_isolation" on demos for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner_isolation" on deployments;
create policy "owner_isolation" on deployments for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner_isolation" on invoices;
create policy "owner_isolation" on invoices for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner_isolation" on payments;
create policy "owner_isolation" on payments for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner_isolation" on email_deliveries;
create policy "owner_isolation" on email_deliveries for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index if not exists idx_lead_events_lead on lead_events(lead_id, created_at desc);
create index if not exists idx_lead_notes_lead on lead_notes(lead_id);
create index if not exists idx_lead_tasks_due on lead_tasks(due_at) where done = false;
create index if not exists idx_leads_owner on leads(owner_id);
create index if not exists idx_leads_phone on leads(phone);
create index if not exists idx_leads_website on leads(website);
create index if not exists idx_leads_place on leads(place_id);
create index if not exists idx_outreach_lead on outreach_messages(lead_id);
create index if not exists idx_audits_lead on website_audits(lead_id);
create index if not exists idx_invoices_lead on invoices(lead_id);
create index if not exists idx_invoices_status on invoices(status);
