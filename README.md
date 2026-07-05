# ユドナリウムSAKURA

さくらレンタルサーバー（スタンダードプラン）で動作するユドナリウムフォーク版。
PHP CGIのみでSkyWay認証トークンを発行し、Node.js / Docker不要で運用できます。

## 特徴

- 🌸 **さくらレンタルサーバー対応** — PHP CGIのみ（Node.js不要）
- 🎲 **フル機能TRPG卓** — ユドナリウムリコリスv1.54.0ベース
- 📡 **SkyWay 2023 P2P** — 高品質なリアルタイム通信
- 🖼️ **P2Pファイル同期** — 画像・音声は全てP2Pで同期（サーバー配信不要）
- 🔒 **セキュア** — SkyWay Secret Keyはサーバー側のみで保持

## 必要環境

- さくらレンタルサーバー スタンダードプラン以上
- PHP 8.1以上（さくらのデフォルトでOK）
- SSL（Let's Encrypt無料証明書を推奨）

## クイックスタート

### 1. ビルド

```bash
npm install
npm run build
```

### 2. デプロイ

詳しくは [docs/DEPLOY.md](docs/DEPLOY.md) を参照。

```bash
# ビルド成果物 + PHPファイルをさくらにアップロード
scp -r dist/udonarium-sakura/* user@sakura.server:~/www/
scp sakura/php/*.php user@sakura.server:~/www/v1/skyway2023/
scp sakura/htaccess user@sakura.server:~/www/.htaccess
```

### 3. SkyWay設定

1. [SkyWayコンソール](https://console.skyway.ntt.com/)でアプリケーション作成
2. サーバーの `~/www/v1/skyway2023/config.php` にApp IDとSecret Keyを設定

```php
return [
    'skyway_app_id' => 'your-app-id',
    'skyway_secret' => 'your-secret-key',
];
```

### 4. アクセス

```
https://your-domain.sakura.ne.jp/
```

## リポジトリ構成

```
udonarium-sakura/
├── src/                    # Angular ソースコード
├── sakura/
│   ├── php/
│   │   ├── token.php       # SkyWay トークン発行API
│   │   ├── status.php      # ステータス確認API
│   │   └── config.php      # SkyWay認証設定（要記入）
│   └── htaccess            # .htaccess テンプレート
├── docs/
│   └── DEPLOY.md           # デプロイ手順書
├── angular.json
├── package.json
└── unified-server.js       # ローカル開発用（さくらでは不使用）
```

## SkyWay設定の注意

SkyWayコンソールで以下を設定してください：

- **許可オリジン**: `https://your-domain.sakura.ne.jp`
- **TURN**: 有効推奨

## P2Pファイル同期について

画像・音声ファイルは全てWebRTC DataChannel経由でP2P同期されます。
サーバー側にファイルをアップロードする機能は省略しています。

- ✅ キャラクター画像、立ち絵、トークン画像 → P2P同期
- ✅ BGM、SE、効果音 → P2P同期
- ❌ サーバー側ミュージックライブラリ → 非対応（各ユーザーがローカルで読み込み）

## ローカル開発

```bash
# Node.js サーバーでローカルテスト（config.php不要）
node unified-server.js
# → http://localhost:8080
```

## ライセンス

MIT License
元ソフトウェア: [ユドナリウムリコリス](https://github.com/oron1208/udonarium-lycoris)
