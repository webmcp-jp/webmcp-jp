# 貢献ガイド

webmcp-jp への貢献を歓迎します。このリポジトリは **サンプル・テスト・検証結果・技術文書** のみを扱います。

## 方針

- 通常UIを残す
- `document.modelContext` を使う（古い `navigator.modelContext` は新規に使わない）
- Tool の説明に実際の副作用だけを書く。下書きToolから送信しない
- 仕様・Chrome実装・polyfill の挙動を分けて書く
- 未確認の挙動を不具合と断定しない
- サイト、CMS、GTM、Stripe、SaaS、協会運営のコードを持ち込まない
- MCP-B を初期依存にしない

## 開発手順

```bash
# Node.js 22.13.0 以上
npm test
npm run lint
npm start
```

サンプル: `examples/contact-form/`  
テスト: `tests/`  
結果テンプレ: `results/TEMPLATE.md`

## Pull Request

1. 変更の目的と、通常UI / WebMCP のどちらに影響するかを書く
2. `npm test` と `npm run lint` を通す
3. 挙動を変えた場合は `results/` に検証メモを追加する（個人情報・Cookie・token は書かない）
4. 仕様主張には一次資料URLと確認日を付ける

## 外部プロジェクトへの投稿

関連プロジェクト（仕様・Chrome・WPT など）への Issue / コメント / PR は、次を揃えて運営者が確認してから行います。

1. 現在利用できる操作で再現する
2. 期待結果の根拠がある
3. 現行 main または公開版で再現する
4. ローカル設定・古いAPI・依存・base branch の原因を除外した
5. open / closed 両方の Issue と PR を確認した
6. 実利用への明確な影響がある
7. 最小の再現コードまたはテストがある

自動投稿はしません。

## ライセンス

寄稿は Apache License 2.0 の下で受け入れます。
