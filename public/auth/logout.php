<?php
/**
 * Oturumu kapatır: gp_session çerezini temizler.
 * GET ise uygulamaya yönlendirir, fetch (XHR) ise 204 döner.
 */
require __DIR__ . '/_lib.php';

gp_clear_session_cookie();

$isXhr = (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'fetch')
    || (isset($_SERVER['HTTP_SEC_FETCH_MODE']) && $_SERVER['HTTP_SEC_FETCH_MODE'] === 'cors');

if ($isXhr) {
    http_response_code(204);
    header('Cache-Control: no-store');
    exit;
}

$base = rtrim(gp_cfg('APP_BASE_URL', '/'), '/');
header('Location: ' . $base . '/');
exit;
