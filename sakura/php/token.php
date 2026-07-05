<?php
/**
 * ユドナリウムSAKURA - SkyWay 2023 認証トークン発行エンドポイント
 *
 * エンドポイント: POST /v1/skyway2023/token
 * リクエストボディ: { "formatVersion": 1, "channelName": "...", "peerId": "..." }
 * レスポンス: { "token": "<SkyWay JWT>" }
 *
 * さくらレンタルサーバー（PHP CGI）で動作します。
 * Node.js / Python 不要。
 */

declare(strict_types=1);

// ── CORS & Headers ──────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('X-Content-Type-Options: nosniff');

// ── 設定読み込み ──────────────────────────────────────────────────
$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(503);
    echo json_encode(['error' => 'Server is not configured.']);
    exit;
}
$config = require $configPath;

$appId  = $config['skyway_app_id']  ?? '';
$secret = $config['skyway_secret']  ?? '';

if ($appId === '' || $secret === '') {
    http_response_code(503);
    echo json_encode(['error' => 'SkyWay credentials are not configured.']);
    exit;
}

// ── メソッドチェック ──────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ── リクエストボディ読み込み ──────────────────────────────────────
$rawBody = file_get_contents('php://input');
if (strlen($rawBody) > 65536) {
    http_response_code(413);
    echo json_encode(['error' => 'Payload too large']);
    exit;
}

$body = json_decode($rawBody, true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$channelName = (string)($body['channelName'] ?? '');
$peerId      = (string)($body['peerId'] ?? '');

// ── バリデーション ────────────────────────────────────────────────
if ($channelName === '' || $peerId === '') {
    http_response_code(400);
    echo json_encode(['error' => 'channelName and peerId are required']);
    exit;
}

if (str_contains($channelName, '*') || str_contains($peerId, '*')) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid argument']);
    exit;
}

// ── トークン生成 ──────────────────────────────────────────────────
$lobbySize = (int)($config['lobby_size'] ?? 4);
$ttl       = (int)($config['token_ttl'] ?? 86400);
$now       = time();
$lobbyName = "udonarium-lobby-*-of-{$lobbySize}";

$payload = [
    'jti' => generate_uuid_v4(),
    'iat' => $now,
    'exp' => $now + $ttl,
    'scope' => [
        'appId' => $appId,
        'rooms' => [
            [
                'name' => $channelName,
                'methods' => ['create', 'updateMetadata', 'close'],
                'member' => [
                    'name' => $peerId,
                    'methods' => ['publish', 'subscribe', 'updateMetadata'],
                ],
            ],
            [
                'name' => $lobbyName,
                'methods' => ['create', 'updateMetadata', 'close'],
                'member' => [
                    'name' => $peerId,
                    'methods' => ['publish', 'subscribe', 'updateMetadata'],
                ],
            ],
        ],
        'turn' => ['enabled' => true],
    ],
    'version' => 3,
];

$token = encode_jwt_hs256($payload, $secret);

echo json_encode(['token' => $token]);


// ── ヘルパー関数 ──────────────────────────────────────────────────

/**
 * HS256アルゴリズムでJWTをエンコードする
 */
function encode_jwt_hs256(array $payload, string $secret): string {
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];

    $headerEncoded  = base64url_encode(json_encode($header, JSON_UNESCAPED_SLASHES));
    $payloadEncoded = base64url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES));

    $signingInput = $headerEncoded . '.' . $payloadEncoded;
    $signature    = hash_hmac('sha256', $signingInput, $secret, true);
    $signatureEncoded = base64url_encode($signature);

    return $signingInput . '.' . $signatureEncoded;
}

/**
 * Base64URL エンコード（パディングなし）
 */
function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * RFC 4122 準拠のUUID v4を生成する
 */
function generate_uuid_v4(): string {
    $bytes = random_bytes(16);
    // バージョン4を設定
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    // バリアントを設定
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

    $hex = bin2hex($bytes);
    return sprintf(
        '%s-%s-%s-%s-%s',
        substr($hex, 0, 8),
        substr($hex, 8, 4),
        substr($hex, 12, 4),
        substr($hex, 16, 4),
        substr($hex, 20, 12)
    );
}

/**
 * str_contains の Polyfill（PHP 7.x対応）
 */
if (!function_exists('str_contains')) {
    function str_contains(string $haystack, string $needle): bool {
        return strpos($haystack, $needle) !== false;
    }
}
