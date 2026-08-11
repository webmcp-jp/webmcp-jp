import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  EMPTY_FORM,
  normalizeInput,
  submitForm,
  validateForm,
} from "../examples/contact-form/form-logic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleDir = path.resolve(__dirname, "../examples/contact-form");

test("通常UI: サンプルHTMLがフォーム要素を含み、WebMCPなしでも利用できる構造である", () => {
  const html = fs.readFileSync(path.join(sampleDir, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(sampleDir, "app.js"), "utf8");
  const css = fs.readFileSync(path.join(sampleDir, "styles.css"), "utf8");

  assert.match(html, /id="contact-form"/);
  assert.match(html, /id="name"/);
  assert.match(html, /id="furigana"/);
  assert.match(html, /id="postalCode"/);
  assert.match(html, /id="address"/);
  assert.match(html, /id="message"/);
  assert.match(html, /id="consent"/);
  assert.match(html, /id="submit-button"/);
  assert.match(html, /type="module" src="\.\/app\.js"/);

  assert.match(html, /通常UI/);

  // Feature-detect path must not require modelContext to render the form.
  assert.match(app, /registerContactFormTool/);
  assert.match(app, /modelContext/);
  assert.match(app, /unsupported/);
  assert.doesNotMatch(app, /navigator\.modelContext/);

  // Styles exist so the normal UI is usable without a framework.
  assert.ok(css.length > 100);
  assert.ok(fs.existsSync(path.join(sampleDir, "form-logic.js")));
});

test("通常UI: WebMCP APIがなくても検証と送信ゲートが動く", () => {
  // No document.modelContext in this Node environment.
  assert.equal(typeof globalThis.document, "undefined");

  const emptyErrors = validateForm(EMPTY_FORM);
  assert.ok(emptyErrors.length >= 5);

  const filled = normalizeInput({
    name: "通常 ユーザー",
    furigana: "ツウジョウ ユーザー",
    postalCode: "220-0001",
    address: "神奈川県横浜市",
    message: "WebMCPがなくても送れます。",
    consent: true,
  });

  assert.equal(validateForm(filled).length, 0);
  const result = submitForm(filled);
  assert.equal(result.ok, true);
  assert.ok(result.receipt.id);
});

test("通常UI: 不正入力でも通常UIの検証が壊れない", () => {
  const result = submitForm({
    name: 123,
    furigana: null,
    postalCode: {},
    address: undefined,
    message: ["配列"],
    consent: "no",
  });
  assert.equal(result.ok, false);
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.errors.length > 0);
});
