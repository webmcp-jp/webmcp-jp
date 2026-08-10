# 自動テスト（Node.js）

- 実行日: 2026-08-10
- OS: macOS 26.5.1 (arm64, Darwin 25.5.0)
- Node.js: v22.23.1
- ブラウザ / バージョン: なし（`node --test`）
- flag / Origin Trial: なし
- 実装種別: node-automated
- 対象 commit: （初回ローカル commit 前。記録時点の working tree）
- 判定: pass

## 手順

1. `cd /Volumes/D/Project/webmcp-jp-oss`
2. `export PATH="/opt/homebrew/Cellar/node@22/22.23.1/bin:$PATH"`
3. `npm test`
4. `npm run lint`

## 期待結果

- Tool登録、日本語入出力、送信前確認、通常UI の4系統が pass
- lint（`node --check`）が成功

## 実結果

- `npm test`: 14 tests, 14 pass, 0 fail
- `npm run lint`: exit 0
- 依存パッケージなし（`node_modules` 不要）で clean 実行可能

## メモ

- フォーム入力値・秘密情報は保存していない
- サイト / SaaS / Stripe / GTM / D1 コードは含まない
