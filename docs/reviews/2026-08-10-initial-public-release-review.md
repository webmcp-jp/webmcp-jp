# 初回公開版レビュー

- 実施日: 2026-08-10
- 対象 commit: `d440650158c74888413a95b612cbb73468a08e17`
- 対象 branch: `main`（`origin/main` と一致）
- Node.js: `v22.23.1`
- npm: `10.9.8`
- Chrome: `151.0.7922.109`
- 判定: **条件付き Go**

## 結論

初回公開版の中心要件は満たしています。OSS の役割はサイト / SaaS と明確に分離され、`document.modelContext` を使う日本語問い合わせフォーム、通常 UI、Tool 登録、日本語入出力、送信前確認、実行結果、Apache-2.0、参加・Security 文書、ブランド資産が揃っています。`npm run lint`、`npm test`、`npm run check` はすべて成功し、14 テストが pass しました。

ただし、`npm start` の静的サーバには公開前に直すべきセキュリティ / 堅牢性上の問題が2件あります。サーバは `127.0.0.1` bind のローカルデモ用であり直ちに本番流出するものではありませんが、README の標準実行経路で再現するため、修正・回帰テスト後を最終 Go とします。

## Findings

### F1 — High — 静的サーバがリポジトリ全体と `.git` を配信する

- 対象: `scripts/serve.mjs:14`, `scripts/serve.mjs:44-68`
- 再現:
  1. `PORT=4194 npm start`
  2. `GET /.git/config` → `200 OK`
  3. `GET /.git/HEAD` → `200 OK`
  4. `GET /../package.json` および `GET /%2e%2e/package.json` → `200 OK`
- 影響: サーバ root がリポジトリ root で、URL 正規化後に root 配下なら任意ファイルを返します。現在は localhost bind ですが、`HOST=0.0.0.0` 等で共有した場合、Git metadata、docs、results、将来追加される root 配下ファイルまで露出します。
- 推奨修正: 配信 allowlist を `examples/contact-form/` のみに限定し、`/.git`、dotfile、親セグメントを拒否する。`/` だけをサンプル index に redirect / map する。`.git`、`..`（literal / percent-encoded）、未知ファイルの回帰テストを追加する。

### F2 — Medium — malformed percent encoding 1リクエストでサーバが終了する

- 対象: `scripts/serve.mjs:29-30`, `scripts/serve.mjs:43-45`
- 再現:
  1. `PORT=4193 npm start`
  2. `GET /%ZZ`
  3. `decodeURIComponent()` の `URIError: URI malformed` が未捕捉で Node process が exit 1
- 影響: ローカルデモが不正 URL 1件で停止します。共有 bind 時は簡単な denial of service になります。
- 推奨修正: decode を `try/catch` し、400 を返して process を継続する。malformed encoding の後に正常 GET が 200 になる回帰テストを追加する。

### F3 — Low — Chrome ネイティブ結果の commit が現行 HEAD ではない

- 対象: `results/2026-08-10-chrome-native.md:9`, `results/2026-08-10-node-automated.md:9`
- 現状: 両結果は初期実装 commit `82d1b9d…` を対象とし、現行 HEAD はブランド / Organization 更新後の `d440650…` です。
- 評価: アプリ実装自体は対象 commit 以降に変更されておらず、今回 `npm run check` も現行 HEAD で pass しました。このため初回公開を止める差異ではありません。
- 推奨修正: サーバ修正後、現行 commit で Node 結果を更新し、可能なら Chrome ネイティブ確認も再記録する。

### F4 — Low — `untrustedContentHint` の判断根拠を文書化したい

- 対象: `examples/contact-form/form-logic.js:244-247`
- 現状: Tool 出力はユーザー入力由来のフォーム値を `preview` として返しますが、annotation は `untrustedContentHint: false` です。
- 評価: 提案仕様ではこの hint は「Tool 登録者の観点で output が untrusted data を含むか」を示します。フォーム値をそのまま agent-facing output に含めるため、`true` が安全側に見えます。ただし仕様は提案中であり、同一利用者の入力をどう分類するかは設計判断です。
- 推奨修正: `true` へ変更するか、`false` とする threat-model 上の根拠を `docs/04-webmcp-technical-baseline.md` に記録する。公開 blocker にはしません。

## 要件適合チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| OSS / サイト / SaaS の分離 | pass | README と `docs/00`, `01`, `06`, `08` が一貫。tracked code に CMS / GTM / Stripe / D1 実装なし |
| `document.modelContext` | pass | `examples/contact-form/app.js:149-175`。legacy `navigator.modelContext` なし |
| 日本語問い合わせフォーム | pass | 氏名、フリガナ、郵便番号、住所、問い合わせ、同意を通常 UI と schema に実装 |
| Tool は下書きのみ | pass | `executeDraftTool()` は `submitForm()` を呼ばず `submitted:false` を返す |
| 人の最終確認 / 二重送信防止 | pass | UI submit path のみ送信し、送信後の再送を拒否 |
| 非対応環境の通常 UI | pass | feature detection 後も通常フォームを維持 |
| 再現可能な自動テスト | pass | Node 標準 test runner、依存 package なし、14/14 pass |
| 環境付き結果 | pass（追補推奨） | Node / Chrome 記録あり。ただし対象 commit は現行 HEAD より前 |
| 日本語手順・短い英語説明 | pass | `README.md`, `README.en.md` |
| License / Contributing / Security | pass | Apache-2.0、参加手順、非公開報告方針あり |
| ブランド資産 | pass | SVG parse 成功、PNG dimensions は README 記載と整合、OG は 1200×630 |
| 秘密情報 | pass | tracked files の語句監査で credential 実値なし |
| 静的サーバの安全な公開範囲 | fail | F1 |
| 異常 URL への堅牢性 | fail | F2 |

## 実行した検証

- `npm run lint` → exit 0
- `npm test` → 14 tests / 14 pass / 0 fail
- `npm run check` → exit 0
- `git diff --check` → exit 0
- `git fsck --no-dangling --no-progress` → exit 0
- tracked files の CMS / GTM / Stripe / D1 / secret 類の語句監査 → 実装・credential 実値なし
- 文書内外部 URL の HEAD 確認 → public 一次資料は 200。private `webmcp-jp-site` は未認証 404、`webmcp.jp` は DNS 未解決
- ブランド: SVG を `xmllint --noout`、PNG を `file` / `sips` で確認
- `npm start` 実配信確認 → HTML / JS / CSS 200、未知 file 404、F1 / F2 を再現

## Go 条件

1. F1 と F2 を修正する。
2. 静的サーバの回帰テストを追加し、`npm run check` を pass させる。
3. 修正後 commit を対象に Node 検証結果を更新する。

上記完了後は **Go**。F3 と F4 は初回公開後の追補でも許容します。
