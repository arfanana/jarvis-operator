-- Jarvis CRM schema (Supabase / Postgres)
create extension if not exists "pgcrypto";

do $$ begin create type lead_status as enum ('new','contacted','replied','proposal','won','lost'); exception when duplicate_object then null; end $$;
do $$ begin create type activity_type as enum ('email','whatsapp','call','note','meeting'); exception when duplicate_object then null; end $$;
do $$ begin create type activity_status as enum ('pending','completed','overdue'); exception when duplicate_object then null; end $$;
do $$ begin create type proposal_status as enum ('draft','sent','aging','accepted','rejected'); exception when duplicate_object then null; end $$;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  city text not null default '',
  region text not null default '',
  email text,
  phone text,
  website text,
  rating numeric not null default 0,
  score int not null default 0,
  probability int not null default 0,
  status lead_status not null default 'new',
  deal_value numeric not null default 0,
  next_follow_up date,
  created_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  type activity_type not null,
  status activity_status not null default 'pending',
  subject text,
  body text,
  awaiting_reply boolean not null default false,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  title text not null,
  amount numeric not null default 0,
  status proposal_status not null default 'draft',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists daily_targets (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  messages_target int not null default 40,
  messages_sent_actual int not null default 0,
  replies_target int not null default 10,
  replies_actual int not null default 0,
  deals_target int not null default 2,
  deals_actual int not null default 0
);

alter table leads enable row level security;
alter table activities enable row level security;
alter table proposals enable row level security;
alter table daily_targets enable row level security;

drop policy if exists "auth_all_leads" on leads;
drop policy if exists "auth_all_activities" on activities;
drop policy if exists "auth_all_proposals" on proposals;
drop policy if exists "auth_all_targets" on daily_targets;

create policy "auth_all_leads" on leads for all to authenticated using (true) with check (true);
create policy "auth_all_activities" on activities for all to authenticated using (true) with check (true);
create policy "auth_all_proposals" on proposals for all to authenticated using (true) with check (true);
create policy "auth_all_targets" on daily_targets for all to authenticated using (true) with check (true);

create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_score on leads(score desc);
create index if not exists idx_leads_followup on leads(next_follow_up);
create index if not exists idx_activities_lead on activities(lead_id);
create index if not exists idx_activities_status on activities(status);
create index if not exists idx_proposals_lead on proposals(lead_id);
create index if not exists idx_proposals_status on proposals(status);

-- Seed
insert into leads (name, category, city, region, email, phone, website, rating, score, probability, status, deal_value, next_follow_up, created_at) values
 ('Al Noor Dental','Dental Clinic','Dubai','Deira','info@alnoordental.ae','+971501234567','https://alnoordental.ae',4.6,88,80,'replied',4500,'2026-09-22','2026-09-10T08:00:00Z'),
 ('FitZone Gym','Gym','Sharjah','Al Nahda','hello@fitzone.fit','+971551112223','https://fitzone.fit',4.2,76,65,'contacted',3200,'2026-09-22','2026-09-12T08:00:00Z'),
 ('Luxe Hair Studio','Salon','Dubai','Marina','book@luxehair.ae','+971523334445',null,4.8,91,85,'new',2800,'2026-09-23','2026-09-20T08:00:00Z'),
 ('Prime Auto Care','Auto Garage','Ajman','Industrial','service@primeauto.ae','+971561234321','https://primeauto.ae',3.9,58,40,'contacted',2400,'2026-09-18','2026-09-05T08:00:00Z'),
 ('Cedar Restaurant','Restaurant','Dubai','JLT','info@cedarfood.com','+971509876543','https://cedarfood.com',4.4,72,60,'proposal',6000,'2026-09-25','2026-09-02T08:00:00Z'),
 ('Bright Kids Nursery','Nursery','Abu Dhabi','Khalifa City','admissions@brightkids.ae','+971503334455','https://brightkids.ae',4.7,83,70,'new',5200,'2026-09-24','2026-09-19T08:00:00Z')
on conflict do nothing;

with l as (select id, name from leads)
insert into activities (lead_id, type, status, subject, body, awaiting_reply, due_at, created_at)
select id, v.t::activity_type, v.s::activity_status, v.subj, v.bdy, v.ar, v.due::timestamptz, v.ca::timestamptz
from l join (values
 ('Al Noor Dental','whatsapp','completed','Intro pitch','Sent WhatsApp intro',true,null,'2026-09-21T09:00:00Z'),
 ('Prime Auto Care','call','overdue','Follow-up call','Call back owner',false,'2026-09-18T09:00:00Z','2026-09-17T09:00:00Z'),
 ('FitZone Gym','email','completed','Audit teardown','Sent site audit',true,null,'2026-09-21T10:00:00Z'),
 ('Cedar Restaurant','meeting','pending','Proposal walkthrough','Demo booking page',false,'2026-09-22T14:00:00Z','2026-09-20T09:00:00Z')
) as v(name,t,s,subj,bdy,ar,due,ca) on v.name = l.name
on conflict do nothing;

with l as (select id, name from leads)
insert into proposals (lead_id, title, amount, status, sent_at)
select l.id, v.title, v.amount, v.st::proposal_status, v.sent::timestamptz
from l join (values
 ('Cedar Restaurant','Online ordering + website revamp',6000,'aging','2026-09-14T09:00:00Z'),
 ('Al Noor Dental','Booking funnel + WhatsApp automation',4500,'sent','2026-09-20T09:00:00Z')
) as v(name,title,amount,st,sent) on v.name = l.name
on conflict do nothing;

insert into daily_targets (date, messages_target, messages_sent_actual, replies_target, replies_actual, deals_target, deals_actual)
values ('2026-09-22',40,17,10,4,2,0)
on conflict (date) do update set messages_sent_actual = excluded.messages_sent_actual;
