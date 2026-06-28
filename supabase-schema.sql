-- RiderLink schema — paste this entire file into Supabase SQL Editor and click Run

create extension if not exists "pgcrypto";

-- Shows
create table if not exists shows (
  id          text primary key default gen_random_uuid()::text,
  artist      text not null,
  venue       text not null,
  city        text not null,
  date        date not null,
  buyer_name  text not null default '',
  buyer_email text not null default '',
  status      text not null default 'draft' check (status in ('draft','sent','active','confirmed')),
  created_at  timestamptz not null default now()
);

-- Rider items
create table if not exists rider_items (
  id          text primary key default gen_random_uuid()::text,
  show_id     text not null references shows(id) on delete cascade,
  category    text not null,
  name        text not null,
  quantity    text not null default '',
  notes       text not null default '',
  status      text not null default 'pending' check (status in ('pending','confirmed','unavailable','substituted')),
  buyer_note  text not null default '',
  sort_order  int  not null default 0
);

-- Messages
create table if not exists messages (
  id          text primary key default gen_random_uuid()::text,
  show_id     text not null references shows(id) on delete cascade,
  from_role   text not null check (from_role in ('manager','buyer')),
  sender      text not null,
  text        text not null,
  created_at  timestamptz not null default now()
);

-- Indexes for fast lookups
create index if not exists rider_items_show_id on rider_items(show_id);
create index if not exists messages_show_id    on messages(show_id);
create index if not exists shows_date          on shows(date);

-- Enable real-time on all three tables
alter publication supabase_realtime add table shows;
alter publication supabase_realtime add table rider_items;
alter publication supabase_realtime add table messages;

-- Row Level Security (open for now — lock down after auth is added)
alter table shows        enable row level security;
alter table rider_items  enable row level security;
alter table messages     enable row level security;

create policy "public read shows"       on shows        for select using (true);
create policy "public write shows"      on shows        for all    using (true);
create policy "public read items"       on rider_items  for select using (true);
create policy "public write items"      on rider_items  for all    using (true);
create policy "public read messages"    on messages     for select using (true);
create policy "public write messages"   on messages     for all    using (true);

-- Seed: SKRILLA Atlanta show
insert into shows (id, artist, venue, city, date, buyer_name, buyer_email, status)
values ('show-atl-001', 'SKRILLA', 'State Farm Arena', 'Atlanta, GA', '2026-08-15', 'Marcus Thompson', 'marcus@venue.com', 'active');

insert into rider_items (show_id, category, name, quantity, notes, status, buyer_note, sort_order) values
('show-atl-001', 'Food',       'Wings (Magic City)',     '50 pcs',    'Lemon pepper dry', 'confirmed',   '',                                              0),
('show-atl-001', 'Food',       'Deli Tray',              '1',         '',                 'confirmed',   '',                                              1),
('show-atl-001', 'Food',       'Fruit Tray',             '1',         '',                 'confirmed',   '',                                              2),
('show-atl-001', 'Beverages',  'Hennessy VSOP',          '2 bottles', '',                 'confirmed',   '',                                              3),
('show-atl-001', 'Beverages',  'Don Julio 1942',         '1 bottle',  '',                 'confirmed',   '',                                              4),
('show-atl-001', 'Beverages',  'Red Bull',               '24',        '',                 'pending',     '',                                              5),
('show-atl-001', 'Beverages',  'Smart Water',            '24 bottles','',                 'confirmed',   '',                                              6),
('show-atl-001', 'Production', 'Pioneer DJM S9',         '1',         '',                 'unavailable', 'We have a DJM 900NXS2 — will that work?',       7),
('show-atl-001', 'Production', 'CDJ 2000s',              '2',         '',                 'pending',     '',                                              8),
('show-atl-001', 'Production', '6'' Table with Skirting','1',         '',                 'confirmed',   '',                                              9),
('show-atl-001', 'Essentials', 'Black Face Towels',      '3 dozen',   '',                 'confirmed',   '',                                              10),
('show-atl-001', 'Essentials', 'Candle (Santal 26)',     '1',         '',                 'substituted', 'Have Santal 33 — closest we could find',        11),
('show-atl-001', 'Essentials', 'iPhone Charger',         '2',         '',                 'confirmed',   '',                                              12),
('show-atl-001', 'Essentials', 'Sharpies',               '6',         '',                 'confirmed',   '',                                              13);

insert into messages (show_id, from_role, sender, text) values
('show-atl-001', 'buyer',   'Marcus Thompson', 'We have access to Magic City for the wings — no problem. Confirming now.'),
('show-atl-001', 'manager', 'Dré Davis',       'Perfect. Make sure they''re lemon pepper dry. Also confirm the CDJ 2000s.');

-- Seed: G Herbo Chicago
insert into shows (id, artist, venue, city, date, buyer_name, buyer_email, status)
values ('show-chi-002', 'G Herbo', 'United Center', 'Chicago, IL', '2026-09-02', 'Jennifer Walsh', 'j.walsh@venue.com', 'sent');

insert into rider_items (show_id, category, name, quantity, status, sort_order) values
('show-chi-002', 'Food',       'Wings',             '50 pcs',    'pending', 0),
('show-chi-002', 'Food',       'Veggie Tray',        '1',         'pending', 1),
('show-chi-002', 'Beverages',  'Hennessy VSOP',      '2 bottles', 'pending', 2),
('show-chi-002', 'Beverages',  'Smart Water',        '24 bottles','pending', 3),
('show-chi-002', 'Production', 'CDJ 2000s',          '2',         'pending', 4),
('show-chi-002', 'Production', 'Pioneer DJM S9',     '1',         'pending', 5),
('show-chi-002', 'Essentials', 'Black Bath Towels',  '4',         'pending', 6);

-- Seed: Keyshia Cole NYC
insert into shows (id, artist, venue, city, date, buyer_name, buyer_email, status)
values ('show-nyc-003', 'Keyshia Cole', 'Barclays Center', 'New York, NY', '2026-09-20', 'David Chen', 'd.chen@venue.com', 'confirmed');

insert into rider_items (show_id, category, name, quantity, status, sort_order) values
('show-nyc-003', 'Food',      'Fruit Tray',       '2',         'confirmed', 0),
('show-nyc-003', 'Food',      'Deli Tray',         '1',         'confirmed', 1),
('show-nyc-003', 'Beverages', 'Simply Lemonade',   '6',         'confirmed', 2),
('show-nyc-003', 'Beverages', 'Smart Water',       '24 bottles','confirmed', 3),
('show-nyc-003', 'Essentials','Candle (Santal 26)','1',         'confirmed', 4);

insert into messages (show_id, from_role, sender, text) values
('show-nyc-003', 'buyer', 'David Chen', 'All items confirmed. Load-in at 2PM.');

-- Seed: Flo Milli LA
insert into shows (id, artist, venue, city, date, buyer_name, buyer_email, status)
values ('show-la-004', 'Flo Milli', 'Kia Forum', 'Los Angeles, CA', '2026-10-05', 'Rachel Kim', 'r.kim@venue.com', 'draft');

insert into rider_items (show_id, category, name, quantity, status, sort_order) values
('show-la-004', 'Food',       'Deli Tray', '1',  'pending', 0),
('show-la-004', 'Beverages',  'Red Bull',  '24', 'pending', 1),
('show-la-004', 'Essentials', 'Sharpies',  '6',  'pending', 2);
