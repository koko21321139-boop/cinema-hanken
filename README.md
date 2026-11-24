# シネマ半券帳

夫婦で使う、映画館で観た映画の感想記録アプリ。★評価と感想から、上映中・公開予定の作品をおすすめ順に並べます。

- 画面：GitHub Pages（URLを開くだけ。スマホのホーム画面にも置ける）
- 記録の保存：Supabase（無料枠）。ふたりの合言葉でログイン
- 上映情報：GitHub Actions が毎週木曜 19:45 に TMDB から取得して `catalog.json` を更新

## 初回の設定（30分ほど）

### 1. Supabase（記録の保存先）
1. https://supabase.com でアカウントを作り、「New project」を作る（リージョンは Tokyo）。
2. 左メニュー「SQL Editor」→ `supabase/schema.sql` の中身を貼り付けて「Run」。
3. 「Authentication」→「Users」→「Add user」→「Create new user」
   - Email：`config.js` の `LOGIN_EMAIL` と同じもの（実在しなくてよい。例 `cinema@example.com`）
   - Password：**ふたりの合言葉**（8文字以上がおすすめ）
   - 「Auto Confirm User」にチェック
4. 「Authentication」→「Sign In / Providers」→「Allow new users to sign up」を**オフ**（他人が登録できないように）。
5. 「Project Settings」→「API」で **Project URL** と **anon public key** をコピー。

### 2. config.js を書き換える
`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`LOGIN_EMAIL`、`MEMBERS` の名前（夫・妻など）を入れる。
anon key は公開されても大丈夫な鍵です（合言葉でログインしないとデータは読めません）。

### 3. TMDB（上映情報）
1. https://www.themoviedb.org でアカウントを作り、「設定」→「API」で API を申請（個人・非商用）。
2. 「API読み取りアクセストークン」（長いほう）をコピー。
3. GitHub のこのリポジトリ →「Settings」→「Secrets and variables」→「Actions」→「New repository secret」
   - Name：`TMDB_TOKEN`　Value：コピーしたトークン
4. 「Actions」タブ →「作品リスト更新」→「Run workflow」で一度手動実行（以後は毎週自動）。

### 4. GitHub Pages で公開
「Settings」→「Pages」→ Source「Deploy from a branch」、Branch「main」/「/(root)」→ Save。
数分後に `https://<ユーザー名>.github.io/cinema-hanken/` で開けます。

### 5. 使い始める
- URL を開き、「夫／妻」を選んで合言葉を入力。端末ごとに一度だけでOK。
- iPhone：Safari の共有ボタン →「ホーム画面に追加」。Android：Chrome のメニュー →「ホーム画面に追加」。

## ファイル
| ファイル | 内容 |
| --- | --- |
| `index.html` / `app.js` | 画面と動作 |
| `config.js` | Supabase の接続先とふたりの名前 |
| `catalog.json` | 上映中・公開予定の作品（Actions が自動更新。初期値は手作業のリスト） |
| `scripts/update_catalog.py` | TMDB から作品を集めるスクリプト |
| `.github/workflows/update-catalog.yml` | 週1回の自動更新 |
| `supabase/schema.sql` | データベースの表 |

## おすすめの仕組み
★5〜4 は +2〜+1、★2〜1 は −1〜−2 として、その作品の監督・出演（×3）、シリーズ（×3）、題材キーワード（×1.5）、ジャンル（×1）、邦画/洋画（×0.4）に点を足し、まだ観ていない上映中・公開予定作品を採点します。「ふたりで」ではふたりとも点がプラスの作品に +1。

作品情報は TMDB API を利用しています。This product uses the TMDB API but is not endorsed or certified by TMDB.
