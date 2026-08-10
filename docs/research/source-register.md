# 一次資料一覧

最終更新: 2026-08-10

技術的な主張は、公開前に次の一次資料と実機で確認します。確認日、対象 version または commit、実行環境を検証記録へ残します。

## 仕様と議論

- [WebMCP Draft Community Group Report](https://webmachinelearning.github.io/webmcp/)
- [WebMCP GitHub](https://github.com/webmachinelearning/webmcp)
- [Web Machine Learning Community Group](https://webmachinelearning.github.io/community/)
- [W3C TAG design review](https://github.com/w3ctag/design-reviews/issues/1238)

## Chrome

- [Overview](https://developer.chrome.com/docs/ai/webmcp/)
- [Imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [Declarative API](https://developer.chrome.com/docs/ai/webmcp/declarative-api)
- [Secure tools](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [Evals](https://developer.chrome.com/docs/ai/webmcp/evals)
- [DevTools](https://developer.chrome.com/docs/devtools/application/webmcp)
- [Chrome Status](https://chromestatus.com/feature/5117755740913664)

## テストと実装

- [Web Platform Tests](https://github.com/web-platform-tests/wpt)
- [WPT results](https://wpt.fyi/results/webmcp)
- [GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools)
- [GoogleChromeLabs/use-webmcp-tool](https://github.com/GoogleChromeLabs/use-webmcp-tool)
- [MCP-B](https://github.com/WebMCP-org/npm-packages)
- [AgentBoard](https://github.com/igrigorik/AgentBoard)

MCP-B と AgentBoard は仕様の根拠ではありません。対象実装または相互運用の確認先として扱います。

## 他ブラウザのレビュー

- [Mozilla standards-position](https://github.com/mozilla/standards-positions/issues/1412)
- [WebKit standards-position](https://github.com/WebKit/standards-positions/issues/670)

## 更新ルール

- Chrome 文書だけで WebMCP 全体の状態を断定しない
- 仕様とブラウザ実装を分ける
- MCP-B の挙動をネイティブ実装の挙動として書かない
- 古い API 例をコピーしない
- URL、確認日、version または commit を記録する
