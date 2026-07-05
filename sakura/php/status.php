<?php
/**
 * ユドナリウムSAKURA - ステータス確認エンドポイント
 * GET /v1/status → { "ok": true }
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
echo json_encode(['ok' => true]);
