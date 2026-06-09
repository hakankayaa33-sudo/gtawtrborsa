# GTA World OAuth ile Giriş — Kurulum

Site statik export (`output: 'export'`) olarak cPanel'de host edildiğinden, OAuth'un
gizli-anahtar gerektiren adımları **PHP endpoint'lerinde** (sunucu tarafı) çalışır.
Tarayıcıya hiçbir secret veya access token verilmez.

## Mimari

```
[Tarayıcı]  --(/auth/start.php)-->  GTA World authorize
GTA World  --(redirect ?code&state)-->  /auth/callback.php
/auth/callback.php:
   code -> token (POST /oauth/token, client_secret)   [sunucu]
   GET /api/user (Bearer)                              [sunucu]
   Supabase app_users upsert + rol oku                 [service_role]
   imzalı HttpOnly çerez (gp_session) yaz
   -> uygulamaya redirect
[React]  --(/auth/me.php)-->  oturum bilgisi (rol)
         --(/auth/logout.php)--> çıkış
```

Roller `app_users.role` ile DB'den belirlenir: `admin` / `employee` / `customer`
(yeni giriş varsayılan `customer`).

## Adımlar

### 1) Supabase tablosu
`supabase/oauth_setup.sql` dosyasını Supabase SQL editöründe çalıştırın.

### 2) private-config.php (SECRET — public_html DIŞINA)
`private-config.example.php` dosyasını `private-config.php` olarak kopyalayıp doldurun
ve **public_html'in bir üst dizinine** yükleyin (örn. `/home/KULLANICI/private-config.php`).
Gerekli alanlar: `GTAW_CLIENT_ID`, `GTAW_CLIENT_SECRET`, `GTAW_REDIRECT_URI`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `APP_BASE_URL`.

> `GTAW_REDIRECT_URI`, GTA World UCP'de kayıtlı redirect_uri ile **birebir** aynı olmalı
> ve `https://siteniz.com/auth/callback.php` biçiminde olmalıdır.
> `SESSION_SECRET` için güçlü rastgele değer üretin: `openssl rand -hex 32`.

### 3) Build & yükleme
```
npm run build           # out/ üretir (out/auth/*.php dahil)
```
`out/` içeriğini cPanel `public_html`'e yükleyin. PHP dosyaları `public_html/auth/` altında
çalışır (`callback.php`, `start.php`, `me.php`, `logout.php`, `_lib.php`).

### 4) İlk yöneticiyi atama
1. Bir kez "GTA World ile Giriş" yapın (kayıt `customer` olarak oluşur).
2. Supabase'de kendinizi yönetici yapın:
   ```sql
   update public.app_users set role = 'admin' where gtaw_id = <SİZİN_GTAW_ID>;
   ```
3. Çalışan atamak için:
   ```sql
   update public.app_users set role = 'employee', courier_id = '<courier-slug>'
   where gtaw_id = <ÇALIŞAN_GTAW_ID>;
   ```

## Güvenlik notları
- `client_secret` ve Supabase `service_role` anahtarı yalnızca `private-config.php`'de,
  web kök dizini dışında.
- Oturum çerezi HttpOnly + Secure + SameSite=Lax ve HMAC imzalı.
- CSRF için `state` parametresi (start.php üretir, callback.php doğrular).
- Access token tarayıcıya hiç verilmez; yalnızca sunucuda kullanılır.
