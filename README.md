# アオノリュウゼツランマップ

アオノリュウゼツランの現在の状態と観察履歴を共有する匿名投稿型の地図サイトです。
Cloudflare Workers 上で vinext (Next.js App Router互換) を動かし、データは D1、投稿写真は R2 に保存します。

## 構成

- App: Next.js 16 + React 19 + vinext
- Runtime: Cloudflare Workers
- Database: Cloudflare D1 (`DB` binding)
- Photo storage: Cloudflare R2 (`BUCKET` binding)
- Map: OpenFreeMap + MapLibre GL
- ORM / migrations: Drizzle

## Gitに入れないもの

`.gitignore` で以下を除外しています。

- `node_modules/`
- `.next/`, `dist/`, `out/`
- `.wrangler/`
- `.dev.vars*`（`.dev.vars.example` は除外しない）
- `.env*`（`.env.example` は除外しない）
- `*.tsbuildinfo`
- ログ、OS生成ファイル、旧Sites用一時ファイル

秘密値を `.env`、`.dev.vars`、ソースコードへ直接書いたままcommitしないでください。

## Cloudflare bindings / secrets

`wrangler.jsonc` には次のbindingを宣言しています。

- D1: `DB`
- R2: `BUCKET`

Cloudflareへ接続する前に、実リソースを作って `wrangler.jsonc` を更新しておく方法を推奨します。

秘密値はGitに入れず、Cloudflare WorkerのSecretsとして設定してください。

- `ADMIN_TOKEN`: `/admin` で使う管理キー
- `RATE_LIMIT_SALT`: 24文字以上の十分にランダムな値
- `MODERATION_WEBHOOK_URL`: 任意。Discord等へのモデレーション通知URL

ローカル開発では `.dev.vars.example` を `.dev.vars` にコピーし、実際の値へ置き換えます。

## 最初の公開までの推奨手順

### 1. GitHubへpush

```bash
git init
git add .
git commit -m "Initial Cloudflare-ready version"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

### 2. CloudflareへログインしてD1 / R2を作成

```bash
npx wrangler login
npx wrangler d1 create ryuzetsuran-map-db --binding DB --update-config
npx wrangler r2 bucket create ryuzetsuran-map-photos --binding BUCKET --update-config
```

上記で `wrangler.jsonc` にD1のIDやR2のbucket名が追記されたら、その変更もGitHubへpushします。

```bash
git add wrangler.jsonc
git commit -m "Bind Cloudflare storage"
git push
```

### 3. D1 migrationを適用

```bash
npm run db:migrate:remote
```

`drizzle/` 内のmigrationがD1へ適用されます。

### 4. GitHub repositoryをCloudflare Workersへ接続

Cloudflare Dashboard の **Workers & Pages → Create application → Import a repository** からGitHub repositoryを選びます。

- Worker名: `ryuzetsuran-map` (`wrangler.jsonc` の `name` と一致させる)
- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: repository直下

以降は `main` へのpushで自動build/deployされます。

### 5. SecretsをCloudflareに設定

初回Worker作成後、Cloudflare DashboardのWorker設定からSecretsとして次を登録します。

- `ADMIN_TOKEN`
- `RATE_LIMIT_SALT`
- 必要なら `MODERATION_WEBHOOK_URL`

`ADMIN_TOKEN` と `RATE_LIMIT_SALT` は別々の十分に長いランダム値にしてください。

## ローカル開発

```bash
npm ci
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

## よく使うコマンド

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm test
npm run db:generate
npm run db:migrate:local
npm run db:migrate:remote
npm run cf:typegen
```

## 運用設計

- アカウントは設けず、投稿時に一度だけ発行する管理キーで本人の取り下げを確認します。
- 無許可の私有地または安全上の申告では、位置をぼかさずピン全体を一時非公開にします。
- 掲載停止地点の座標は運営専用の再登録制限として保持し、半径75m以内の新規投稿は自動公開せず確認待ちにします。
- 修正・削除依頼と処理結果は再発防止のため保持します。連絡先メールと投稿者フィンガープリントは解決90日後に消去します。
- 投稿APIには送信元確認、ハニーポット、操作時間検査、利用者単位・サイト全体・地点単位の回数制限があります。
- 写真はブラウザ側でWebPへ再変換し、サーバー側でも構造を検査して位置情報などのメタデータを除去します。

## 公開情報ページ

公開版には次の静的ページがあります。

- `/about` — このサイトについて（目的・掲載方針・運営方針）
- `/rules` — 投稿・見学の利用ルール
- `/privacy` — 保存する情報・外部サービス・現在地等の扱い

トップページのヘッダーに「このサイトについて」への導線があります。
