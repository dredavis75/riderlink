create table if not exists promoters (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  email      text not null,
  created_at timestamptz not null default now(),
  constraint promoters_email_unique unique(email)
);

create index if not exists promoters_name_idx on promoters(lower(name));

alter table promoters enable row level security;
create policy "public read promoters"  on promoters for select using (true);
create policy "public write promoters" on promoters for all    using (true);

insert into promoters (name, email)
select distinct buyer_name, buyer_email
from shows
where buyer_email <> ''
on conflict (email) do nothing;
