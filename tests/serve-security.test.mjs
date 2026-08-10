import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createServer,
  decodeRequestPath,
  isUnsafeRequestPath,
  resolvePublicFile,
} from "../scripts/serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicRoot = path.resolve(repoRoot, "examples", "contact-form");

function request(server, requestPath, method = "GET") {
  return new Promise((resolve, reject) => {
    const address = server.address();
    if (!address || typeof address === "string") {
      reject(new Error("server has no TCP address"));
      return;
    }
    const req = http.request(
      {
        host: "127.0.0.1",
        port: address.port,
        path: requestPath,
        method,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function withServer(fn) {
  const server = createServer(publicRoot);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await fn(server);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("decodeRequestPath: 正常パスと query を処理する", () => {
  assert.equal(decodeRequestPath("/examples/contact-form/?x=1"), "/examples/contact-form/");
  assert.equal(decodeRequestPath("/%2e%2e/package.json"), "/../package.json");
});

test("decodeRequestPath: malformed percent encoding は null", () => {
  assert.equal(decodeRequestPath("/%ZZ"), null);
  assert.equal(decodeRequestPath("/app%2"), null);
});

test("isUnsafeRequestPath: 親セグメントと dotfile を拒否する", () => {
  assert.equal(isUnsafeRequestPath("/../package.json"), true);
  assert.equal(isUnsafeRequestPath("/.git/config"), true);
  assert.equal(isUnsafeRequestPath("/.env"), true);
  assert.equal(isUnsafeRequestPath("/examples/contact-form/.hidden"), true);
  assert.equal(isUnsafeRequestPath("/app.js"), false);
  assert.equal(isUnsafeRequestPath("/examples/contact-form/"), false);
});

test("resolvePublicFile: allowlist は contact-form のみ", () => {
  const index = resolvePublicFile(publicRoot, "/");
  assert.equal(index, path.join(publicRoot, "index.html"));

  const legacy = resolvePublicFile(publicRoot, "/examples/contact-form/");
  assert.equal(legacy, path.join(publicRoot, "index.html"));

  const app = resolvePublicFile(publicRoot, "/examples/contact-form/app.js");
  assert.equal(app, path.join(publicRoot, "app.js"));

  assert.equal(resolvePublicFile(publicRoot, "/package.json"), path.join(publicRoot, "package.json"));
  // package.json is not inside the sample dir on disk; HTTP layer returns 404.
  assert.equal(fs.existsSync(path.join(publicRoot, "package.json")), false);

  assert.equal(resolvePublicFile(publicRoot, "/../package.json"), null);
  assert.equal(resolvePublicFile(publicRoot, "/.git/config"), null);
  assert.equal(resolvePublicFile(publicRoot, "/.git"), null);
});

test("静的サーバ: サンプル本体は 200", async () => {
  await withServer(async (server) => {
    const root = await request(server, "/");
    assert.equal(root.status, 200);
    assert.match(root.body, /contact-form|問い合わせ|WebMCP/i);

    const legacy = await request(server, "/examples/contact-form/");
    assert.equal(legacy.status, 200);
    assert.match(legacy.body, /<!doctype html>/i);

    const app = await request(server, "/examples/contact-form/app.js");
    assert.equal(app.status, 200);
    assert.match(app.body, /modelContext|draft_contact_form/);

    const css = await request(server, "/examples/contact-form/styles.css");
    assert.equal(css.status, 200);
  });
});

test("静的サーバ: リポジトリ root / .git / 親セグメントを拒否する", async () => {
  await withServer(async (server) => {
    const denied = [
      "/.git",
      "/.git/HEAD",
      "/.git/config",
      "/package.json",
      "/README.md",
      "/results/2026-08-10-node-automated.md",
      "/../package.json",
      "/%2e%2e/package.json",
      "/%2E%2E/package.json",
      "/examples/contact-form/../../package.json",
      "/examples/contact-form/%2e%2e/%2e%2e/package.json",
    ];

    for (const p of denied) {
      const res = await request(server, p);
      assert.notEqual(res.status, 200, `${p} must not be served`);
      assert.ok(
        res.status === 404 || res.status === 400,
        `${p} expected 404/400, got ${res.status}`,
      );
      assert.doesNotMatch(res.body, /"name"\s*:\s*"webmcp-jp"/);
      assert.doesNotMatch(res.body, /\[core\]/);
      assert.doesNotMatch(res.body, /gitdir:/);
    }
  });
});

test("静的サーバ: malformed encoding は 400 で生存継続", async () => {
  await withServer(async (server) => {
    const bad = await request(server, "/%ZZ");
    assert.equal(bad.status, 400);
    assert.match(bad.body, /Bad request/i);

    // Process / server must still answer a valid request after the bad one.
    const ok = await request(server, "/examples/contact-form/");
    assert.equal(ok.status, 200);
    assert.match(ok.body, /<!doctype html>/i);

    const bad2 = await request(server, "/app%2");
    assert.equal(bad2.status, 400);
    const ok2 = await request(server, "/");
    assert.equal(ok2.status, 200);
  });
});

test("静的サーバ: 未知ファイルは 404", async () => {
  await withServer(async (server) => {
    const missing = await request(server, "/examples/contact-form/no-such-file.js");
    assert.equal(missing.status, 404);
  });
});
