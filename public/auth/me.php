<?php
/**
 * Mevcut oturumu döndürür. React açılışta bunu çağırır.
 *  - Geçerli `gp_session` çerezi varsa kullanıcı JSON'u (200).
 *  - Yoksa/geçersizse 401.
 */
require __DIR__ . '/_lib.php';

$token = isset($_COOKIE['gp_session']) ? $_COOKIE['gp_session'] : '';
$payload = gp_verify($token);

if (!$payload) {
    gp_json(401, array('authenticated' => false));
}

gp_json(200, array(
    'authenticated' => true,
    'user' => array(
        'id'        => isset($payload['id']) ? $payload['id'] : null,
        'username'  => isset($payload['username']) ? $payload['username'] : '',
        'name'      => isset($payload['name']) ? $payload['name'] : '',
        'role'      => isset($payload['role']) ? $payload['role'] : 'customer',
        'courierId' => isset($payload['courierId']) ? $payload['courierId'] : null,
    ),
));
