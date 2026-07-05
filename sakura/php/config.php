<?php
/**
 * ユドナリウムSAKURA - SkyWay 認証設定
 *
 * SkyWayコンソール (https://console.skyway.ntt.com/) で取得した
 * App ID と Secret Key を設定してください。
 *
 * セキュリティ上の注意:
 *   - Secret Key は絶対に公開リポジトリにコミットしないでください
 *   - このファイルはデプロイ時にサーバーに配置します
 */

return [
    // SkyWay Application ID
    'skyway_app_id' => '',

    // SkyWay Secret Key
    'skyway_secret' => '',

    // ロビーチャンネルの分割数（同時接続者が多い場合は増やす）
    'lobby_size' => 4,

    // トークンの有効期限（秒）デフォルト24時間
    'token_ttl' => 86400,
];
