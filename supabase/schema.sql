-- Supabase の SQL Editor に貼り付けて「Run」してください。

create table if not exists public.reviews (
  id         text primary key,
  by         text not null,          -- config.js の MEMBERS の id（例: "a"）
  title      text not null,
  date       date,
  place      text default '',
  rating     int  check (rating between 1 and 5),
  genres     text[] default '{}',
  people     text[] default '{}',
  text       text default '',
  updated_at timestamptz default now()
);

create table if not exists public.wants (
  cid        text primary key,         -- catalog.json の作品 id
  title      text default '',
  by         text[] default '{}',      -- 観たい人の id
  added_at   timestamptz default now()
);

alter table public.reviews enable row level security;
alter table public.wants   enable row level security;

-- ログインした人（＝合言葉を知っているふたり）だけが読み書きできる
drop policy if exists "signed in" on public.reviews;
drop policy if exists "signed in" on public.wants;
create policy "signed in" on public.reviews for all to authenticated using (true) with check (true);
create policy "signed in" on public.wants   for all to authenticated using (true) with check (true);
