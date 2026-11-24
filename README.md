# シネマ半券帳

夫婦で使う、映画館で観た映画の感想記録アプリ。★評価と感想から、上映中・公開予定の作品をおすすめ順に並べます。

- 画面：GitHub Pages（URLを開くだけ。スマホのホーム画面にも置ける）
- 記録の保存：Supabase（無料枠）。ログインなし。「ふたり専用リンク」で一度開いた端末だけが読み書きできる
- 上映情報：GitHub Actions が毎週木曜 19:45 に TMDB から取得して `catalog.json` を更新

## 初回の設定（30分ほど）

### 1. Supabase（記録の保存先）
1. https://supabase.com でアカウントを作り、「New project」を作る（リージョンは Tokyo）。
2. ふたり専用のキー（20文字以上のランダムな英数字）を決める。
3. 左メニュー「SQL Editor」→ `supabase/schema.sql` を貼り付け、`ここに専用キー` を2で決めたキーに書き換えて「Run」。
4. 「Project Settings」→「API」で **Project URL** と **anon public key** をコピー。

### 2. config.js を書き換える
`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`MEMBERS` の名前（夫・妻など）を入れる。
anon key は公開されても大丈夫な鍵です。専用キーがないとデータは読み書きできません。**専用キーは config.js にもGitHubにも書かないでください。**

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
- ふたり専用リンク `https://<ユーザー名>.github.io/cinema-hanken/?k=<専用キー>` をLINEなどで奥さまに送る。
- 各端末でそのリンクを一度開き、「夫／妻」を選ぶ。以後は `?k=` なしの普通のURLやホーム画面から開けます。
- リンクが他人に渡ると読み書きされてしまうので、そのときは schema.sql のキーを変えて再実行し、新しいリンクを送り直してください。
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
