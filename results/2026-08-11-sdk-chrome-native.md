# 1行導入SDK Chrome native検証

- 実行日: 2026-08-11
- OS: macOS 26.5.1 (Build 25F80)
- Node.js: v22.23.1
- ブラウザ: Google Chrome 151.0.7922.109
- flag: `--enable-features=WebMCP,ModelContext,DocumentModelContext`、`--enable-blink-features=WebMCP,ModelContext,DocumentModelContext`
- 実装種別: `native`
- 対象 commit: `24e776442762b160ea6d6ede17c63eac0307b0ce` + この記録を含む未コミットSDK差分
- 対象URL: `http://127.0.0.1:4182/examples/one-line-sdk/`
- 実行コマンド: `SDK_URL=http://127.0.0.1:4182/examples/one-line-sdk/ CDP_PORT=9243 node scripts/verify-sdk-chrome.mjs`

## 入力

架空データで問い合わせ下書きを実行した。実在の個人情報は使用していない。

## 期待結果

- 1行のmodule scriptから共通SDKとautoloadが読み込まれる
- `document.modelContext` に `draft_contact_form` が登録される
- Tool実行で通常フォームの氏名欄へ下書きが反映される
- Tool実行結果は `drafted: true` / `submitted: false`
- 人の通常UI操作なしでは送信済みにならない

## 実結果

- 登録表示: `WebMCP登録済み`
- 登録Tool: `draft_contact_form`
- SDK execute: 利用可能
- 下書き反映: 成功
- `drafted`: `true`
- `submitted`: `false`
- 通常UIの送信済み状態: `false`

## 判定

`pass`

Chromeの実験的なnative WebMCP実装で、1行script経路からTool登録と下書き反映を確認した。これは確認時点の観測であり、仕様やブラウザ実装は変更される可能性がある。
