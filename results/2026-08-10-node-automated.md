# 自動テスト（Node.js）

- 実行日: 2026-08-10
- OS: macOS 26.5.1 (arm64, Darwin 25.5.0)
- Node.js: v22.23.1
- npm: 10.9.8
- ブラウザ / バージョン: なし（`node --test`）
- flag / Origin Trial: なし
- 実装種別: node-automated
- 対象 commit: 83da89dff835cacd415022080b7691f55c0fa916
- 判定: pass

## 手順

1. `cd` リポジトリ root
2. `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`（または Node 22.13+ が使える PATH）
3. `npm test`
4. `npm run lint`
5. `npm run check`

## 期待結果

- Tool登録、日本語入出力、送信前確認、通常UI、静的サーバ保安の系統が pass
- lint（`node --check`）が成功
- 静的サーバが `examples/contact-form/` のみを配信し、`/.git`・親パス・malformed encoding を拒否する

## 実結果

- `npm test`: 22 tests, 22 pass, 0 fail
- `npm run lint`: exit 0
- `npm run check`: exit 0
- 依存パッケージなし（`node_modules` 不要）で clean 実行可能

### 静的サーバ実測（`PORT=4195 npm start` 相当）

| リクエスト | 結果 |
|---|---|
| `/` | 200（sample index） |
| `/examples/contact-form/` | 200 |
| `/examples/contact-form/app.js` | 200 |
| `/.git/HEAD` | 404 |
| `/.git/config` | 404 |
| `/package.json` | 404 |
| `/../package.json` | 404 |
| `/%2e%2e/package.json` | 404 |
| `/%ZZ` | 400（process 継続） |
| `/%ZZ` 後の `/` | 200 |

## メモ

- フォーム入力値・秘密情報は保存していない
- サイト / SaaS / Stripe / GTM / D1 コードは含まない
- F1（repo root / `.git` 配信）と F2（malformed encoding で process 終了）を修正済み


## 追記

- 2026-08-10: `draft_contact_form` の `untrustedContentHint` を `true` に変更（preview に利用者入力を含むため）。`npm run check` は継続して pass。
