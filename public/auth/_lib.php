<?php
/**
 * GoPostal - GTA World OAuth ortak yardımcıları.
 *
 * Bu dosya public_html/auth/ içinde çalışır ama hiçbir gizli bilgi içermez.
 * Tüm secret'lar web kök dizini DIŞINDAKİ private-config.php'den yüklenir.
 */

if (!defined('GP_OAUTH_LIB')) {
    define('GP_OAUTH_LIB', 1);

    /**
     * private-config.php'yi bulup yükler ve config dizisini döndürür.
     * Aranan yerler (sırayla):
     *   1) GP_PRIVATE_CONFIG ortam değişkeni (tam yol)
     *   2) public_html'in bir üst dizini  (../../private-config.php)
     *   3) auth/ ile aynı dizin (yalnızca geliştirme; tavsiye edilmez)
     */
    function gp_config() {
        static $config = null;
        if ($config !== null) {
            return $config;
        }

        $candidates = array();
        $env = getenv('GP_PRIVATE_CONFIG');
        if ($env) {
            $candidates[] = $env;
        }
        $candidates[] = __DIR__ . '/../../private-config.php';
        $candidates[] = __DIR__ . '/../private-config.php';
        $candidates[] = __DIR__ . '/private-config.php';

        foreach ($candidates as $path) {
            if ($path && is_file($path)) {
                $config = require $path;
                break;
            }
        }

        if (!is_array($config)) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(array('error' => 'config_missing'));
            exit;
        }
        return $config;
    }

    function gp_cfg($key, $default = null) {
        $c = gp_config();
        return isset($c[$key]) ? $c[$key] : $default;
    }

    /* ---- base64url ---- */
    function gp_b64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    function gp_b64url_decode($data) {
        $pad = strlen($data) % 4;
        if ($pad) {
            $data .= str_repeat('=', 4 - $pad);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Oturum payload'ını HMAC ile imzalar -> "base64url(json).base64url(sig)".
     */
    function gp_sign($payload) {
        $secret = gp_cfg('SESSION_SECRET');
        $json = json_encode($payload);
        $body = gp_b64url_encode($json);
        $sig = hash_hmac('sha256', $body, $secret, true);
        return $body . '.' . gp_b64url_encode($sig);
    }

    /**
     * İmzalı token'ı doğrular. Geçerli ve süresi dolmamışsa payload dizisini,
     * aksi halde null döndürür.
     */
    function gp_verify($token) {
        if (!is_string($token) || strpos($token, '.') === false) {
            return null;
        }
        list($body, $sig) = explode('.', $token, 2);
        $secret = gp_cfg('SESSION_SECRET');
        $expected = hash_hmac('sha256', $body, $secret, true);
        $given = gp_b64url_decode($sig);
        if (!hash_equals($expected, $given)) {
            return null;
        }
        $payload = json_decode(gp_b64url_decode($body), true);
        if (!is_array($payload)) {
            return null;
        }
        if (isset($payload['exp']) && time() > (int) $payload['exp']) {
            return null;
        }
        return $payload;
    }

    /**
     * Oturum çerezini ayarlar (HttpOnly + Secure + SameSite=Lax).
     */
    function gp_set_session_cookie($payload) {
        $token = gp_sign($payload);
        $ttl = (int) gp_cfg('SESSION_TTL', 60 * 60 * 24 * 7); // varsayılan 7 gün
        gp_setcookie('gp_session', $token, time() + $ttl);
    }

    function gp_clear_session_cookie() {
        gp_setcookie('gp_session', '', time() - 3600);
    }

    /**
     * SameSite destekli setcookie sarmalayıcı (PHP 7.3+ ve öncesi uyumlu).
     */
    function gp_setcookie($name, $value, $expires) {
        $secure = true; // site HTTPS üzerinden sunuluyor
        $params = array(
            'expires'  => $expires,
            'path'     => '/',
            'secure'   => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        );
        if (PHP_VERSION_ID >= 70300) {
            setcookie($name, $value, $params);
        } else {
            setcookie($name, $value, $expires, '/; samesite=Lax', '', $secure, true);
        }
    }

    function gp_json($status, $data) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($data);
        exit;
    }

    /**
     * Genel cURL HTTP isteği.
     * @return array [status_code, decoded_json|raw_string|null]
     */
    function gp_http($method, $url, $opts = array()) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);

        $headers = isset($opts['headers']) ? $opts['headers'] : array();

        if (isset($opts['form'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($opts['form']));
            $headers[] = 'Content-Type: application/x-www-form-urlencoded';
        } elseif (isset($opts['json'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($opts['json']));
            $headers[] = 'Content-Type: application/json';
        }

        if ($headers) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }

        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            return array(0, array('curl_error' => $err));
        }
        $decoded = json_decode($raw, true);
        return array($code, $decoded === null ? $raw : $decoded);
    }

    /**
     * Supabase REST çağrısı (service_role anahtarı ile, yalnızca sunucu tarafı).
     * $path örn: "app_users?gtaw_id=eq.123"
     */
    function gp_supabase($method, $path, $opts = array()) {
        $base = rtrim(gp_cfg('SUPABASE_URL'), '/');
        $key = gp_cfg('SUPABASE_SERVICE_ROLE_KEY');
        $url = $base . '/rest/v1/' . $path;
        $headers = array(
            'apikey: ' . $key,
            'Authorization: Bearer ' . $key,
            'Accept: application/json',
        );
        if (isset($opts['prefer'])) {
            $headers[] = 'Prefer: ' . $opts['prefer'];
        }
        if (isset($opts['headers'])) {
            $headers = array_merge($headers, $opts['headers']);
        }
        $opts['headers'] = $headers;
        return gp_http($method, $url, $opts);
    }

    /**
     * Hata durumunda uygulamaya kullanıcı-dostu bir mesajla yönlendirir.
     */
    function gp_fail_redirect($reason) {
        $base = rtrim(gp_cfg('APP_BASE_URL', '/'), '/');
        header('Location: ' . $base . '/?auth_error=' . urlencode($reason));
        exit;
    }
}
