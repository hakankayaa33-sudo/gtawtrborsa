<?php
/**
 * GTA World OAuth geri dönüş (callback) endpoint'i.
 *
 * Akış:
 *   1) `state` çerez doğrulaması (CSRF).
 *   2) `code` -> access_token  (POST /oauth/token, client_secret sunucuda).
 *   3) /api/user ile kullanıcı bilgisini çek.
 *   4) Supabase app_users'a upsert; rolü oku (yeni kayıt = customer, mevcut rol ezilmez).
 *   5) İmzalı HttpOnly oturum çerezi yaz, uygulamaya yönlendir.
 */
require __DIR__ . '/_lib.php';

/* 1) state doğrulama */
$state = isset($_GET['state']) ? $_GET['state'] : '';
$cookieState = isset($_COOKIE['gp_oauth_state']) ? $_COOKIE['gp_oauth_state'] : '';
gp_setcookie('gp_oauth_state', '', time() - 3600); // tek kullanımlık

if (!$state || !$cookieState || !hash_equals($cookieState, $state)) {
    gp_fail_redirect('state_mismatch');
}

if (isset($_GET['error'])) {
    gp_fail_redirect($_GET['error']);
}

$code = isset($_GET['code']) ? $_GET['code'] : '';
if (!$code) {
    gp_fail_redirect('missing_code');
}

/* 2) code -> token */
list($tokenStatus, $tokenBody) = gp_http('POST', gp_cfg('GTAW_TOKEN_URL', 'https://ucp-tr.gta.world/oauth/token'), array(
    'form' => array(
        'grant_type'    => 'authorization_code',
        'client_id'     => gp_cfg('GTAW_CLIENT_ID'),
        'client_secret' => gp_cfg('GTAW_CLIENT_SECRET'),
        'redirect_uri'  => gp_cfg('GTAW_REDIRECT_URI'),
        'code'          => $code,
    ),
));

if ($tokenStatus < 200 || $tokenStatus >= 300 || empty($tokenBody['access_token'])) {
    gp_fail_redirect('token_exchange_failed');
}
$accessToken = $tokenBody['access_token'];

/* 3) kullanıcı bilgisi */
list($userStatus, $userBody) = gp_http('GET', gp_cfg('GTAW_USERINFO_URL', 'https://ucp-tr.gta.world/api/user'), array(
    'headers' => array('Authorization: Bearer ' . $accessToken),
));

if ($userStatus < 200 || $userStatus >= 300 || empty($userBody['user'])) {
    gp_fail_redirect('userinfo_failed');
}

$u = $userBody['user'];
$gtawId = isset($u['id']) ? (int) $u['id'] : 0;
$username = isset($u['username']) ? $u['username'] : '';
$characters = isset($u['character']) && is_array($u['character']) ? $u['character'] : array();

if (!$gtawId) {
    gp_fail_redirect('invalid_user');
}

$mainCharacter = '';
if (!empty($characters[0])) {
    $c0 = $characters[0];
    $mainCharacter = trim((isset($c0['firstname']) ? $c0['firstname'] : '') . ' ' . (isset($c0['lastname']) ? $c0['lastname'] : ''));
}

/* 4) Supabase upsert + rol okuma */
list($selStatus, $existing) = gp_supabase('GET', 'app_users?gtaw_id=eq.' . $gtawId . '&select=gtaw_id,role,courier_id');

$role = 'customer';
$courierId = null;
$nowIso = gmdate('Y-m-d\TH:i:s\Z');

if ($selStatus >= 200 && $selStatus < 300 && !empty($existing) && is_array($existing)) {
    /* mevcut kullanıcı: rolü koru, yalnızca güncel alanları yamala */
    $role = isset($existing[0]['role']) ? $existing[0]['role'] : 'customer';
    $courierId = isset($existing[0]['courier_id']) ? $existing[0]['courier_id'] : null;
    gp_supabase('PATCH', 'app_users?gtaw_id=eq.' . $gtawId, array(
        'json' => array(
            'username'      => $username,
            'main_character' => $mainCharacter,
            'characters'    => $characters,
            'last_login_at' => $nowIso,
        ),
        'prefer' => 'return=minimal',
    ));
} else {
    /* yeni kullanıcı: rol DB varsayılanı (customer) ile eklenir */
    gp_supabase('POST', 'app_users', array(
        'json' => array(
            'gtaw_id'        => $gtawId,
            'username'       => $username,
            'main_character' => $mainCharacter,
            'characters'     => $characters,
            'last_login_at'  => $nowIso,
        ),
        'prefer' => 'return=minimal,resolution=merge-duplicates',
    ));
}

/* 5) oturum çerezi + yönlendirme */
gp_set_session_cookie(array(
    'id'        => $gtawId,
    'username'  => $username,
    'name'      => $mainCharacter !== '' ? $mainCharacter : $username,
    'role'      => $role,
    'courierId' => $courierId,
    'exp'       => time() + (int) gp_cfg('SESSION_TTL', 60 * 60 * 24 * 7),
));

$base = rtrim(gp_cfg('APP_BASE_URL', '/'), '/');
header('Location: ' . $base . '/?auth=success');
exit;
