# 決定事項と未決事項

最終更新: 2026-08-10

## 決定事項

- `webmcp-jp` はサンプル、テスト、検証結果、技術文書だけを扱う OSS とする
- サイト実装は `webmcp-jp-site` へ分離する
- 公開ドメインと案内名称は `webmcp.jp` とする
- 初版は日本語問い合わせフォーム一つに絞る
- Chrome のネイティブ実装を優先する
- MCP-B は初期依存にせず、必要なら後から任意で比較する
- SaaS、CMS、SEO、課金、認証制度、協会はサイト側で扱う
- 外部の Issue、コメント、PR は運営者の明示承認後に行う
- remote の改名、作成、push は運営者の明示承認後に行う
- 初版 LICENSE は Apache-2.0（推奨候補）を配置する
- GitHub Organization は `webmcp-jp`（Free）とする

## 現在の状態

- OSS: https://github.com/webmcp-jp/webmcp-jp （public）
- サイト: https://github.com/webmcp-jp/webmcp-jp-site （private）
- 旧個人アカウント配下から Organization へ移管済み
- 自動テストは Node 上で再実行可能
- Chrome ネイティブ WebMCP の実機確認は環境依存のため、結果テンプレとローカル実行記録を用意

## 未決事項

- 初回 Chrome 検証で記録するバージョンと flag（実機実行時に記入）
- MCP-B 比較を追加するかどうかと、その評価条件
- サイト側の公開日時とホスティング設定の最終確定
