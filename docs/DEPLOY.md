# ユドナリウムSAKURA — デプロイ手順書

## 前提条件

- さくらレンタルサーバー スタンダードプラン以上
- PHP 8.1+（さくラベルデフォルト）
- SSL証明書（Let's Encrypt無料 or 共有SSL）
- SkyWayアカウント（[無料登録](https://console.skyway.ntt.com/)）

---

## Step 1: SkyWay アプリケーション作成

1. [SkyWayコンソール](https://console.skyway.ntt.com/)にログイン
2. 「アプリケーションを作成」をクリック
3. 以下を設定:
   - アプリケーション名: `udonarium-sakura`（任意）
   - 許可オリジン: `https://your-domain.sakura.ne.jp`
   - TURN: 有効
4. **App ID** と **Secret Key** をメモ

## Step 2: ビルド

ローカルマシンで:

```bash
cd udonarium-sakura
npm install
npm run build
```

成果物は `dist/udonarium-sakura/` に出力されます。

## Step 3: ファイルアップロード

### 3.1 Webファイル

`dist/udonarium-sakura/` の中身をすべてサーバーの `~/www/` にアップロード:

```bash
# 例: scpの場合
scp -r dist/udonarium-sakura/* user@your-domain.sakura.ne.jp:~/www/
scp dist/udonarium-sakura/.htaccess user@your-domain.sakura.ne.jp:~/www/
```

またはWinSCP/FileZillaでドラッグ＆ドロップ。

### 3.2 PHP API ファイル

```bash
# ディレクトリ作成
ssh user@your-domain.sakura.ne.jp 'mkdir -p ~/www/v1/skyway2023'

# PHPファイル配置
scp sakura/php/token.php user@your-domain.sakura.ne.jp:~/www/v1/skyway2023/
scp sakura/php/status.php user@your-domain.sakura.ne.jp:~/www/v1/skyway2023/
scp sakura/php/config.php user@your-domain.sakura.ne.jp:~/www/v1/skyway2023/
```

### 3.3 .htaccess 配置

```bash
scp sakura/htaccess user@your-domain.sakura.ne.jp:~/www/.htaccess
```

### 最終的なサーバーディレクトリ構成:

```
~/www/
├── .htaccess                    # ルーティング設定
├── index.html                   # Angular エントリポイント
├── main.*.js                    # Angular メインバンドル
├── styles.*.css                 # スタイルシート
├── runtime.*.js
├── polyfills.*.js
├── favicon.ico
├── 3rdpartylicenses.txt
├── assets/
│   └── config.yaml              # アプリ設定
├── lib/                         # 遅延読み込みチャンク
└── v1/
    └── skyway2023/
        ├── token.php            # SkyWay トークンAPI
        ├── status.php           # ステータスAPI
        └── config.php           # SkyWay認証情報（★要設定）
```

## Step 4: SkyWay認証設定

サーバーにSSH接続し、`config.php` を編集:

```bash
ssh user@your-domain.sakura.ne.jp
nano ~/www/v1/skyway2023/config.php
```

```php
<?php
return [
    'skyway_app_id' => 'your-actual-app-id',     // ← SkyWay App ID
    'skyway_secret' => 'your-actual-secret-key',  // ← SkyWay Secret Key
    'lobby_size' => 4,
    'token_ttl' => 86400,
];
```

**⚠️ セキュリティ: `config.php` は必ずサーバー上で直接編集してください。Gitリポジトリには認証情報をコミットしないでください。**

## Step 5: 動作確認

1. `https://your-domain.sakura.ne.jp/` にアクセス
2. 「ユドナリウムSAKURA」が表示されることを確認
3. 部屋を作成して入室
4. 別ブラウザ/デバイスから同じ部屋にアクセスして同期を確認

### トークンAPIの確認

```bash
curl -X POST https://your-domain.sakura.ne.jp/v1/skyway2023/token \
  -H "Content-Type: application/json" \
  -d '{"channelName":"test","peerId":"test-peer"}'
```

成功レスポンス:
```json
{"token":"eyJhbGci..."}
```

## トラブルシューティング

### トークンエラー（503）

`config.php` のApp ID/Secret Keyが未設定。

### トークンエラー（405）

POSTメソッドでリクエストしていない、または `.htaccess` のルーティングが効いていない。
さくらサーバーのコンパネで `mod_rewrite` が有効か確認。

### 接続できない・ピアが見つからない

- SkyWayコンソールの「許可オリジン」が正しいか確認
- SSL（https）でアクセスしているか確認
- ブラウザの開発者ツールでコンソールエラーを確認

### 画像が同期されない

P2P同期には時間がかかる場合があります（数秒〜数十秒）。
大きなファイルは圧縮・リサイズを推奨。

## 更新時の手順

```bash
# ローカルでビルド
npm run build

# サーバーにアップロード（PHPファイルとconfig.phpは上書きしない）
scp -r dist/udonarium-sakura/* user@your-domain.sakura.ne.jp:~/www/
```
