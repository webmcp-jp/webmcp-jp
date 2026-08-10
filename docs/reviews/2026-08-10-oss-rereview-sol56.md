# webmcp-jp OSS 再レビュー

- 実施日: 2026-08-10
- 対象 commit: `c9e891924ccc23d499d8aae82ea795631019f44e`
- 対象 branch: `main`（`origin/main` と一致）
- Node.js: `v22.23.1`
- npm: `10.9.8`
- 判定: **合格**

## 結論

初回公開版レビューで公開条件とした F1 / F2 は、実装・回帰テスト・live serve probe のすべてでクローズを確認しました。`npm run check` は 22 tests / 22 pass、0 fail です。今回の対象範囲に新規 High / Medium / Low finding はありません。

残っていた Low の F3 は Node 自動検証結果が hardening commit を対象として更新されたため、公開条件として解消済みです。Chrome ネイティブ結果はアプリ実装を検証した旧 commit の記録のままですが、今回の変更は静的サーバとそのテスト・説明に限定されており、公開 blocker にはしません。F4 は提案仕様の annotation に関する設計根拠の追補事項であり、初回判断どおり blocker にはしません。

## 前回 finding のクローズ確認

### F1 — High — 静的サーバがリポジトリ全体と `.git` を配信する

- status: **closed**
- 実装根拠:
  - `scripts/serve.mjs:17-18` で配信 root を `examples/contact-form/` に固定。
  - `scripts/serve.mjs:51-61` で親セグメントと dotfile / dotdir を拒否。
  - `scripts/serve.mjs:72-106` で request path を sample 配下へ解決し、配信 root 外を拒否。
  - `scripts/serve.mjs:148-155` に最終 containment guard を保持。
- テスト根拠:
  - `tests/serve-security.test.mjs:116-144` が `.git`、repo root file、literal / percent-encoded 親パスを回帰確認。
- live probe:
  - `GET /.git/HEAD` → `404`
  - `GET /../package.json` → `404`
  - `GET /%2e%2e/package.json` → `404`
  - `GET /examples/contact-form/app.js` → `200`

### F2 — Medium — malformed percent encoding 1リクエストでサーバが終了する

- status: **closed**
- 実装根拠:
  - `scripts/serve.mjs:38-44` が `decodeURIComponent()` の失敗を捕捉。
  - `scripts/serve.mjs:124-129` が malformed URL に `400 Bad request` を返す。
- テスト根拠:
  - `tests/serve-security.test.mjs:146-162` が `/%ZZ` と `/app%2` の 400、および各不正リクエスト後の正常応答を確認。
- live probe:
  - `GET /%ZZ` → `400`
  - 直後の `GET /` → `200`
  - probe 後も server process は alive。

## 新規 findings

なし。

## 残 Low の扱い

### F3 — Chrome / Node 検証結果の対象 commit

- status: **公開 blocker 解消 / Chrome の再記録のみ追補可**
- `results/2026-08-10-node-automated.md` は server hardening commit `83da89d…` を対象に、22 tests と live probe を記録済み。
- `results/2026-08-10-chrome-native.md` は `82d1b9d…` のまま。ただし `82d1b9d…` 以降の今回差分は `scripts/serve.mjs`、server security tests、README、Node result、package script に限定され、`examples/contact-form/` のアプリ実装は変更されていない。
- Chrome ネイティブの再確認は仕様・ブラウザ実装ウォッチ時に追補してよく、初回 OSS 公開を止めない。

### F4 — `untrustedContentHint` の判断根拠

- status: **追補**
- `examples/contact-form/form-logic.js:244-247` は引き続き `untrustedContentHint: false`。
- Tool 入出力を信頼しない原則は `docs/04-webmcp-technical-baseline.md:36-42` に明記されているが、hint を `false` とする threat-model 固有の根拠は未記載。
- 提案仕様上の設計判断であり、今回の下書き専用 Tool の副作用境界、通常 UI、送信ゲートを破るものではないため blocker にしない。仕様ウォッチ時に `true` への変更または判断根拠を追補する。

## 実行した検証

- `git log -1 --format='%H %s'` → `c9e891924ccc23d499d8aae82ea795631019f44e Merge pull request #1 ...`
- `git rev-parse origin/main` → `c9e891924ccc23d499d8aae82ea795631019f44e`
- `npm run check` → exit 0
- `npm test` → 22 tests / 22 pass / 0 fail
- `git diff --check` → exit 0
- live serve probe（`PORT=4197`）:
  - `/.git/HEAD` 404
  - `/%ZZ` 400
  - `/%ZZ` 後の `/` 200
  - `/../package.json` 404
  - `/%2e%2e/package.json` 404
  - `/examples/contact-form/app.js` 200
- tracked scope の秘密情報らしい実値パターン検索 → 0件
- tracked symlink → 0件

## 修正タスク一覧

なし。
