import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDraft,
  asTrimmedString,
  buildPreview,
  normalizeInput,
  submitForm,
  validateForm,
} from "../examples/contact-form/form-logic.js";

test("日本語入出力: 氏名・フリガナ・住所・問い合わせが欠落なく往復する", () => {
  const input = {
    name: " 山田　太郎 ",
    furigana: "ヤマダ　タロウ",
    postalCode: "100-0001",
    address: "東京都千代田区千代田1-1 サンプルビル3F",
    message: "資料請求したいです。\nよろしくお願いいたします。",
    consent: true,
  };

  const normalized = normalizeInput(input);
  assert.equal(normalized.name, "山田　太郎");
  assert.equal(normalized.furigana, "ヤマダ　タロウ");
  assert.equal(normalized.address.includes("千代田"), true);
  assert.equal(normalized.message.includes("資料請求"), true);
  assert.equal(normalized.consent, true);

  const preview = buildPreview(normalized);
  assert.deepEqual(preview, {
    name: "山田　太郎",
    furigana: "ヤマダ　タロウ",
    postalCode: "100-0001",
    address: "東京都千代田区千代田1-1 サンプルビル3F",
    message: "資料請求したいです。\nよろしくお願いいたします。",
    consent: true,
  });
});

test("日本語入出力: NFC正規化と郵便番号ハイフン正規化", () => {
  // 全角ハイフン風文字を含む入力
  const values = normalizeInput({
    name: "佐藤花子",
    furigana: "サトウハナコ",
    postalCode: "150‐0001",
    address: "東京都渋谷区",
    message: "質問です",
    consent: "true",
  });

  assert.equal(values.postalCode, "150-0001");
  assert.equal(asTrimmedString("  テスト  "), "テスト");
  assert.equal(validateForm(values).length, 0);
});

test("日本語入出力: 下書き適用で既存値を保持しつつ部分更新する", () => {
  const current = normalizeInput({
    name: "田中一郎",
    furigana: "タナカイチロウ",
    postalCode: "530-0001",
    address: "大阪府大阪市",
    message: "初期メッセージ",
    consent: false,
  });

  const { next, applied } = applyDraft(current, {
    message: "追加の問い合わせ内容です。",
    consent: true,
  });

  assert.equal(next.name, "田中一郎");
  assert.equal(next.message, "追加の問い合わせ内容です。");
  assert.equal(next.consent, true);
  assert.deepEqual(applied.sort(), ["consent", "message"]);
});

test("日本語入出力: バリデーションエラーも日本語で返す", () => {
  const errors = validateForm({
    name: "",
    furigana: "",
    postalCode: "abc",
    address: "",
    message: "",
    consent: false,
  });

  assert.ok(errors.some((e) => e.includes("氏名")));
  assert.ok(errors.some((e) => e.includes("フリガナ")));
  assert.ok(errors.some((e) => e.includes("郵便番号")));
  assert.ok(errors.some((e) => e.includes("同意")));
  assert.equal(submitForm({ name: "" }).ok, false);
});
