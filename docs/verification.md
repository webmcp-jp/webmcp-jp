# 検証の書き方

`results/` に実行記録を残すときの共通ルールです。

## 必須項目

- 実行日（ISO 日付）
- OS
- Node.js バージョン（自動テスト時）
- ブラウザとバージョン（ブラウザ確認時）
- 有効にした flag / Origin Trial（ある場合）
- 実装種別: `native` / `unsupported-fallback` / `node-automated`
- 対象 commit（`git rev-parse HEAD`）
- 期待結果
- 実結果
- 判定: `pass` / `fail` / `blocked`

## 書いてはいけないもの

- 実在の氏名・住所・電話・メール
- Cookie、token、API key、設置キー
- 本番の問い合わせ内容

サンプル用の架空データは構いませんが、results には「架空データで確認」とだけ書き、本文値のコピーは最小限にしてください。

## 判定の目安

| 判定 | 意味 |
|---|---|
| pass | 期待結果どおり |
| fail | 再現でき、根拠のある不一致 |
| blocked | 環境不足・flag 不明などで今回は確認できない |

未確認を fail にしないでください。

## ファイル名

```
results/YYYY-MM-DD-<short-topic>.md
```

例: `results/2026-08-10-local-node-tests.md`
