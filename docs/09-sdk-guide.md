# WebMCP問い合わせ下書きSDK 組み込みガイド

最終確認: 2026-08-11

このSDKは提案中の `document.modelContext` Imperative APIへ `draft_contact_form` を登録します。npm registryには未公開です。現時点ではリポジトリをローカルパッケージとして利用してください。

## 1行script

通常フォームに `data-webmcp-contact` を付け、ページ末尾へ次を追加します。

```html
<script type="module" src="/sdk/autoload.js"></script>
```

`/sdk/autoload.js` は同一ディレクトリの `index.js` を読み込みます。autoloadは `name`、`furigana`、`postalCode`、`address`、`message`、`consent` という `name` 属性のフォーム部品を読み書きします。ページ内に通常の送信ボタンと送信処理を必ず残してください。`examples/one-line-sdk/index.html` がビルドツールなしの最小例です。

`/sdk/autoload.js` はこのリポジトリの開発サーバ用URLです。本番で使う場合は、npmパッケージ内の `src/` を同一originから配信するか、bundlerで `webmcp-jp/autoload` をブラウザ向けに出力してください。外部CDN配信はこのリポジトリでは提供しません。

## 1 import

```js
import { registerContactFormTool } from "webmcp-jp";

const registration = await registerContactFormTool({
  modelContext: document.modelContext,
  read: () => currentFormValues,
  write: (next) => updateNormalUi(next),
  isSubmitted: () => submitted,
});
```

コンポーネント破棄時は `registration.unregister()` を呼びます。React / Vue / vanilla JS の最小例は `examples/` の各 `*-sdk` ディレクトリにあります。これらは組み込み断片であり、ReactやVue自体をこのパッケージの依存には含めません。

## API

### `registerContactFormTool(options)`

必須:

- `modelContext`: `document.modelContext`。未対応環境では `undefined` でもよい
- `read()`: 通常UIの現在値を返す
- `write(next)`: 下書きを通常UIへ反映する

任意:

- `isSubmitted()`: 人が送信済みなら `true`。送信後の再下書きを拒否する
- `onDraft(result)`: 下書き反映後の表示更新
- `onStatusChange(event)`: `registered` / `unsupported` / `error` / `unregistered` の表示更新
- Toolの `name`、`title`、`description`、`inputSchema`、`annotations` の上書き

戻り値:

- `status`: `registered` または `unsupported`
- `execute`: 登録した下書き処理。未対応環境では `null`
- `unregister()`: `AbortSignal` で登録を解除

下書き結果は必ず `drafted: true`、`submitted: false` を返します。入力はNFC正規化、前後空白除去、長さ制限を行います。未知キーは反映しません。

## 安全境界

- SDKは最終送信callbackを受け取りません。Tool経路は通常UIへの下書き反映までです
- 最終送信、認証、認可、業務ルール、二重送信防止は通常UIのイベント経路に実装します
- `isSubmitted()` を渡し、人の送信後にToolが状態を書き換えないようにします
- WebMCP未対応時は `unsupported` を返すだけで、通常UIを非表示・無効化しません
- Tool入出力は信頼しません。表示時はエスケープし、ログへ個人情報・Cookie・tokenを残しません
- 標準メタデータは `readOnlyHint: false`、`untrustedContentHint: true` です
- `navigator.modelContext` は使いません

## パッケージ構成

- `webmcp-jp`: `src/index.js` と `src/index.d.ts`
- `webmcp-jp/autoload`: `src/autoload.js`
- Apache-2.0
- Node.js 22.13.0以上（テスト・パッケージ検証）

`npm pack --dry-run` で公開対象が `src/`、`README.md`、`LICENSE` に限定されることを確認できます。npm registryへのpublishはこの作業に含めません。
