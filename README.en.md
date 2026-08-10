# README (English)

![webMCP.jp](docs/assets/logo-horizontal.png)

Unofficial OSS with Japanese WebMCP samples, tests, verification notes, and technical docs.

WebMCP is a proposed Web API. Specs and browser implementations can change. This project does not claim W3C Recommendation status, universal browser support, or that WebMCP replaces MCP.

## Repositories

| Name | Role | GitHub |
|---|---|---|
| `webmcp-jp` | This OSS | https://github.com/webmcp-jp/webmcp-jp |
| `webmcp-jp-site` | `webmcp.jp` site and ops | https://github.com/webmcp-jp/webmcp-jp-site |
| `webmcp.jp` | Public domain / brand | https://webmcp.jp |

Organization: [webmcp-jp](https://github.com/webmcp-jp)

## Quick start

```bash
# Node.js 22.13+
git clone https://github.com/webmcp-jp/webmcp-jp.git
cd webmcp-jp
npm test
npm start
# open http://127.0.0.1:4173/examples/contact-form/
```

## Sample

`examples/contact-form/` is a Japanese inquiry form that:

- keeps a normal HTML form UI
- registers `draft_contact_form` via `document.modelContext.registerTool`
- lets the tool draft only; final submit stays human-confirmed
- works without WebMCP

## Tests

| Area | What it checks |
|---|---|
| Tool registration | `document.modelContext`-compatible register/unregister |
| Japanese I/O | name, furigana, address, message round-trip |
| Submit boundary | tool path does not final-submit |
| Normal UI | form works without WebMCP |

## License

Apache License 2.0. See `LICENSE`.

## Not included

Site CMS, GTM, Stripe, SaaS, association/certification ops. Those belong in [`webmcp-jp-site`](https://github.com/webmcp-jp/webmcp-jp-site).

External Issues/PRs that post on behalf of the project need operator approval.
