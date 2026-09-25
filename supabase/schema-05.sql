-- Jarvis Operator — migration 05: columns used by the API that were missing on leads.
alter table leads add column if not exists source text not null default 'manual';
alter table leads add column if not exists address text;
alter table leads add column if not exists lat double precision;
alter table leads add column if not exists lng double precision;
