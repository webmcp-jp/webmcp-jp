import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sdkUrl = pathToFileURL(path.join(root, "src/index.js")).href;

function createFakeModelContext() {
  const tools = new Map();
  return {
    tools,
    async registerTool(tool, options = {}) {
      if (tools.has(tool.name)) throw new Error(`duplicate tool: ${tool.name}`);
      tools.set(tool.name, tool);
      options.signal?.addEventListener("abort", () => tools.delete(tool.name), { once: true });
    },
  };
}

test("SDK: package exports と型定義が公開される", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.exports["."].import, "./src/index.js");
  assert.equal(pkg.exports["."].types, "./src/index.d.ts");
  assert.equal(pkg.exports["./autoload"].import, "./src/autoload.js");
  assert.deepEqual(pkg.files.sort(), ["LICENSE", "README.md", "src"].sort());
});

test("SDK: document.modelContext 互換APIへ日本語下書きToolを登録し、解除できる", async () => {
  const { registerContactFormTool } = await import(sdkUrl);
  const modelContext = createFakeModelContext();
  let values = { name: "", message: "", consent: false };
  let submitCount = 0;

  const registration = await registerContactFormTool({
    modelContext,
    read: () => values,
    write: (next) => {
      values = next;
    },
    isSubmitted: () => submitCount > 0,
  });

  assert.equal(registration.status, "registered");
  const tool = modelContext.tools.get("draft_contact_form");
  const result = await tool.execute({ name: "山田 花子", message: "資料をお願いします。" });
  assert.equal(values.name, "山田 花子");
  assert.equal(result.preview.message, "資料をお願いします。");
  assert.equal(result.drafted, true);
  assert.equal(result.submitted, false);
  assert.equal(submitCount, 0, "SDKのTool経路は最終送信を呼ばない");

  registration.unregister();
  assert.equal(modelContext.tools.size, 0);
});

test("SDK: 未対応環境では通常UIを壊さず unsupported を返す", async () => {
  const { registerContactFormTool } = await import(sdkUrl);
  let writes = 0;
  const registration = await registerContactFormTool({
    modelContext: undefined,
    read: () => ({}),
    write: () => {
      writes += 1;
    },
  });
  assert.equal(registration.status, "unsupported");
  assert.equal(writes, 0);
  assert.equal(typeof registration.unregister, "function");
});

test("SDK: 人が送信済みなら再下書きを拒否する", async () => {
  const { registerContactFormTool } = await import(sdkUrl);
  const modelContext = createFakeModelContext();
  const registration = await registerContactFormTool({
    modelContext,
    read: () => ({ name: "送信済み" }),
    write: () => assert.fail("送信後に write してはならない"),
    isSubmitted: () => true,
  });
  await assert.rejects(
    () => registration.execute({ name: "上書き" }),
    /送信済み/,
  );
});

test("SDK: script 1行版は document.modelContext のみを参照する", () => {
  const autoload = fs.readFileSync(path.join(root, "src/autoload.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "examples/one-line-sdk/index.html"), "utf8");
  assert.match(html, /<script type="module" src="\/sdk\/autoload\.js"><\/script>/);
  assert.match(autoload, /import "\.\/index\.js"/);
  assert.match(autoload, /document\.modelContext/);
  assert.match(autoload, /globalThis\.WebMcpJp\.registerContactFormTool/);
  assert.doesNotMatch(autoload, /navigator\.modelContext/);
});

test("SDK: autoload は通常UI submit 後の再下書きを拒否する構造である", () => {
  const autoload = fs.readFileSync(path.join(root, "src/autoload.js"), "utf8");
  assert.match(autoload, /addEventListener\("submit"/);
  assert.match(autoload, /isSubmitted:\s*\(\) => submitted/);
  assert.match(autoload, /data-webmcp-contact/);
  assert.match(autoload, /WebMCP登録失敗。通常UIを利用できます。/);
});

test("SDK: React / Vue / vanilla の最小例が安全境界を明記する", () => {
  for (const relative of [
    "examples/vanilla-sdk/app.js",
    "examples/react-sdk/ContactForm.jsx",
    "examples/vue-sdk/ContactForm.vue",
  ]) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    assert.match(source, /registerContactFormTool/);
    assert.match(source, /human|人が|通常UI/i);
    assert.doesNotMatch(source, /navigator\.modelContext/);
  }
});
