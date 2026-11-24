-- Supabase の SQL Editor に貼り付けて「Run」してください。
-- 先に下の 'ここに専用キー' を、ふたりだけの長いランダムな文字列（20文字以上）に書き換えてください。
-- このキーは GitHub には置かず、Supabase の中と「ふたり専用リンク」の中だけに入ります。

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

-- 専用リンクのキー（アプリが x-family-key ヘッダーで送る）が一致するときだけ読み書きできる
create or replace function public.family_ok() returns boolean
language sql stable as $$
  select coalesce(current_setting('request.headers', true)::json ->> 'x-family-key', '') = 'ここに専用キー'
$$;

alter table public.reviews enable row level security;
alter table public.wants   enable row level security;

drop policy if exists "family" on public.reviews;
drop policy if exists "family" on public.wants;
create policy "family" on public.reviews for all to anon, authenticated using (public.family_ok()) with check (public.family_ok());
create policy "family" on public.wants   for all to anon, authenticated using (public.family_ok()) with check (public.family_ok());

-- アプリ（anon）から表を使えるようにする（「Grant API access…」をオフで作った場合も動くように）
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.reviews, public.wants to anon, authenticated;
grant execute on function public.family_ok() to anon, authenticated;
