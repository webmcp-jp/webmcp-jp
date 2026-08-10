# Chrome ネイティブ WebMCP 確認（ローカル）

- 実行日: 2026-08-10
- OS: macOS 26.5.1 (arm64)
- Node.js: v22.23.1（静的サーバ `scripts/serve.mjs`）
- ブラウザ / バージョン: Google Chrome 151.0.7922.109
- flag / Origin Trial: headless 起動時に `--enable-features=WebMCP,ModelContext,DocumentModelContext` と `--enable-blink-features=WebMCP,ModelContext,DocumentModelContext` を付与（未知 flag は no-op の可能性あり）
- 実装種別: native
- 対象 commit: 82d1b9dd4499b7db468184772723f1dcd38ec1d3（サンプルUI/Tool実装の確認時点）
- 判定: pass

## 手順

1. `PORT=4180 npm start` 相当で `scripts/serve.mjs` を起動
2. Chrome headless + CDP（`--remote-debugging-port` / `--remote-allow-origins=*`）で `http://127.0.0.1:4180/examples/contact-form/` を開く
3. `document.modelContext` と `registerTool` の有無、登録状態 UI、`getTools()` を確認
4. フォームへ日本語値を入力し、人が送信ボタンを押す経路を確認
5. 二重送信が拒否されることを確認

## 期待結果

- `document.modelContext` が存在する
- `draft_contact_form` が登録され UI が「WebMCP登録済み」になる
- `getTools()` に同名 Tool が1件見える
- 下書き相当の入力だけでは自動送信されない
- 人の送信後に二重送信できない

## 実結果

- `hasModelContext: true`, `hasRegisterTool: true`
- 登録 UI: `WebMCP登録済み: draft_contact_form` / `registrationState: registered`
- `getTools()`: `draft_contact_form`（title: 問い合わせ下書き）1件
- フィールド入力のみでは `form-status` は hidden のまま（自動送信なし）
- 人の `requestSubmit` 1回目: `送信しました（ローカル模擬）。受付ID: local-...` / submit disabled
- 2回目: `送信できませんでした。エラーを確認してください。`（二重送信防止）
- 空送信時: バリデーションエラー表示、送信されない

## メモ

- `getTools()` が返す RegisteredTool に `execute` は含まれない（仕様どおりエージェント側経路）。本記録では登録と通常UI送信境界を確認
- 入力値・Cookie・token は results に保存していない
- 同一環境で feature flag なしの headless 実行では `modelContext` が無い場合があり、その場合は通常UIフォールバックが使われる
- remote push / GitHub 公開は未実施


## 追記

- 2026-08-10: 静的サーバ hardening（`83da89d` 以降）は `scripts/serve.mjs` と server tests の変更であり、`examples/contact-form/` の Tool 登録・送信境界実装自体は未変更だった。
- 2026-08-10 追加: `untrustedContentHint` を `true` に変更。Chrome ネイティブでの再確認は次回の仕様ウォッチ時に実施する（判定は登録/送信境界の前回 pass を維持し、annotation 変更は文書と Node テストで担保）。
- 現行 HEAD（記録時）: ce4481b6c363ba538c008308729807003e3ce3d7
