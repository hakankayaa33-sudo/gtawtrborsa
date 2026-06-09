<?php
/**
 * OAuth akışını başlatır:
 *  - CSRF için rastgele `state` üretir, kısa ömürlü çereze yazar.
 *  - Kullanıcıyı GTA World authorize endpoint'ine yönlendirir.
 *
 * İstemci sadece /auth/start.php'ye gider; client_id/redirect_uri burada,
 * sunucuda tutulur (tarayıcıya OAuth parametresi sızmaz).
 */
require __DIR__ . '/_lib.php';

$state = bin2hex(random_bytes(16));
gp_setcookie('gp_oauth_state', $state, time() + 600); // 10 dk

$authorizeUrl = gp_cfg('GTAW_AUTHORIZE_URL', 'https://ucp-tr.gta.world/oauth/authorize');
$params = array(
    'client_id'     => gp_cfg('GTAW_CLIENT_ID'),
    'redirect_uri'  => gp_cfg('GTAW_REDIRECT_URI'),
    'response_type' => 'code',
    'scope'         => gp_cfg('GTAW_SCOPE', ''),
    'state'         => $state,
);

header('Location: ' . $authorizeUrl . '?' . http_build_query($params));
exit;
