-- GoPostal - GTA World OAuth: app_users tablosu
-- Supabase SQL editöründe çalıştırın.

create table if not exists public.app_users (
  gtaw_id        bigint primary key,
  username       text,
  main_character text,
  characters     jsonb default '[]'::jsonb,
  role           text not null default 'customer',  -- 'admin' | 'employee' | 'customer'
  courier_id     text references public.couriers(id) on delete set null,
  created_at     timestamptz not null default now(),
  last_login_at  timestamptz
);

-- role değerlerini sınırla
alter table public.app_users
  drop constraint if exists app_users_role_check;
alter table public.app_users
  add constraint app_users_role_check
  check (role in ('admin', 'employee', 'customer'));

create index if not exists app_users_role_idx on public.app_users (role);

-- RLS: tabloya yalnızca sunucu (service_role) erişir; istemci (anon) erişemez.
-- service_role anahtarı RLS'i baypas ettiğinden ek policy gerekmez.
alter table public.app_users enable row level security;

-- ============================================================
-- İLK KURULUM: kendinizi yönetici yapın.
-- Önce GTA World ile bir kez giriş yapın (kayıt customer olarak oluşur),
-- sonra gtaw_id'nizi bulup rolü güncelleyin:
--
--   select gtaw_id, username, main_character, role from public.app_users;
--   update public.app_users set role = 'admin' where gtaw_id = <SİZİN_GTAW_ID>;
--
-- Çalışan atamak için:
--   update public.app_users
--     set role = 'employee', courier_id = '<courier-slug>'
--     where gtaw_id = <ÇALIŞAN_GTAW_ID>;
-- ============================================================
