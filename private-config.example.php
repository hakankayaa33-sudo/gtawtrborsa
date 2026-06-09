<?php
/**
 * GoPostal - GTA World OAuth ÖZEL yapılandırması (ÖRNEK).
 *
 * KURULUM (cPanel):
 *   1) Bu dosyayı `private-config.php` adıyla kopyalayın.
 *   2) Değerleri doldurun.
 *   3) Dosyayı public_html'in BİR ÜST dizinine yükleyin
 *      (örn. /home/KULLANICI/private-config.php). Böylece tarayıcıdan erişilemez.
 *   public/auth/_lib.php bunu otomatik bulur (../../private-config.php).
 *
 * UYARI: Bu dosyayı ASLA public_html içine veya git'e gerçek değerlerle koymayın.
 */

return array(
    // --- GTA World OAuth (UCP'de kayıtlı uygulamadan) ---
    'GTAW_CLIENT_ID'     => 'YOUR_CLIENT_ID',
    'GTAW_CLIENT_SECRET' => 'YOUR_CLIENT_SECRET',
    // GTA World'de kayıtlı redirect_uri ile BİREBİR aynı olmalı:
    'GTAW_REDIRECT_URI'  => 'https://siteniz.com/auth/callback.php',
    'GTAW_SCOPE'         => '', // opsiyonel, boş bırakılabilir

    // Endpoint'ler (genelde değişmez):
    'GTAW_AUTHORIZE_URL' => 'https://ucp-tr.gta.world/oauth/authorize',
    'GTAW_TOKEN_URL'     => 'https://ucp-tr.gta.world/oauth/token',
    'GTAW_USERINFO_URL'  => 'https://ucp-tr.gta.world/api/user',

    // --- Supabase (service_role anahtarı — YALNIZCA sunucuda) ---
    'SUPABASE_URL'              => 'https://cppiiabotmdacjrhjcgv.supabase.co',
    'SUPABASE_SERVICE_ROLE_KEY' => 'YOUR_SUPABASE_SERVICE_ROLE_KEY',

    // --- Oturum ---
    // Güçlü rastgele bir değer üretin, örn: `openssl rand -hex 32`
    'SESSION_SECRET' => 'CHANGE_ME_TO_A_LONG_RANDOM_STRING',
    'SESSION_TTL'    => 60 * 60 * 24 * 7, // 7 gün (saniye)

    // Uygulamanın kök adresi (giriş sonrası yönlendirme):
    'APP_BASE_URL' => 'https://gopostal.online',
);
