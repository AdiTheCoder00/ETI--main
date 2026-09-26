-- Enquiries from the contact form, and their status in the lead inbox.

create type public.lead_status as enum ('new', 'quoted', 'won', 'lost');

create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 254),
  job_type    text not null check (char_length(job_type) <= 60),
  where_when  text not null default '' check (char_length(where_when) <= 300),
  message     text not null default '' check (char_length(message) <= 5000),
  status      public.lead_status not null default 'new',
  -- where the lead came from: 'contact_form' now, later e.g. 'quote_estimator'
  source      text not null default 'contact_form',
  -- salted SHA-256 of the visitor's IP, for rate limiting; the raw IP is never stored
  ip_hash     text,
  user_agent  text
);

create index leads_created_at_idx on public.leads (created_at desc);
create index leads_status_created_at_idx on public.leads (status, created_at desc);
create index leads_ip_hash_created_at_idx on public.leads (ip_hash, created_at desc) where ip_hash is not null;

create function public.leads_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.leads_touch_updated_at();

-- No policies: the anon and authenticated roles can't read or write leads at all.
-- The app reaches this table only from the server with the service-role key, after
-- checking the signed-in user against ADMIN_EMAILS.
alter table public.leads enable row level security;
