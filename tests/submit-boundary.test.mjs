import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDraft,
  normalizeInput,
  submitForm,
  validateForm,
} from "../examples/contact-form/form-logic.js";

/**
 * Simulate the sample's split: tool execute drafts only; human UI submits.
 */
function createSession() {
  let values = normalizeInput({});
  let submitted = false;
  let submitCount = 0;

  return {
    get values() {
      return values;
    },
    get submitted() {
      return submitted;
    },
    get submitCount() {
      return submitCount;
    },
    async toolExecute(input) {
      if (submitted) {
        throw new Error("送信済みのため下書きできません。");
      }
      const { next } = applyDraft(values, input);
      values = next;
      return {
        drafted: true,
        submitted: false,
        preview: values,
        remainingValidationErrors: validateForm(values),
      };
    },
    humanSubmit() {
      const result = submitForm(values, { alreadySubmitted: submitted });
      if (result.ok) {
        submitted = true;
        submitCount += 1;
      }
      return result;
    },
  };
}

test("送信前確認: Tool実行だけでは最終送信されない", async () => {
  const session = createSession();
  const draft = await session.toolExecute({
    name: "高橋美咲",
    furigana: "タカハシミサキ",
    postalCode: "460-0001",
    address: "愛知県名古屋市",
    message: "導入を検討しています。",
    consent: true,
  });

  assert.equal(draft.drafted, true);
  assert.equal(draft.submitted, false);
  assert.equal(session.submitted, false);
  assert.equal(session.submitCount, 0);
  assert.equal(validateForm(session.values).length, 0);
});

test("送信前確認: 人が確認して送信した後は二重送信できない", async () => {
  const session = createSession();
  await session.toolExecute({
    name: "伊藤健",
    furigana: "イトウケン",
    postalCode: "810-0001",
    address: "福岡県福岡市",
    message: "サポート窓口を教えてください。",
    consent: true,
  });

  const first = session.humanSubmit();
  assert.equal(first.ok, true);
  assert.equal(session.submitted, true);
  assert.equal(session.submitCount, 1);
  assert.ok(first.receipt.id.startsWith("local-"));

  const second = session.humanSubmit();
  assert.equal(second.ok, false);
  assert.match(second.errors[0], /二重送信/);
  assert.equal(session.submitCount, 1);
});

test("送信前確認: 同意なしの下書きは送信ゲートで止まる", async () => {
  const session = createSession();
  await session.toolExecute({
    name: "中村",
    furigana: "ナカムラ",
    postalCode: "980-0001",
    address: "宮城県仙台市",
    message: "同意前の下書き",
    consent: false,
  });

  assert.equal(session.submitted, false);
  const blocked = session.humanSubmit();
  assert.equal(blocked.ok, false);
  assert.ok(blocked.errors.some((e) => e.includes("同意")));
});

test("送信前確認: Toolの戻り値に submitted:false を明示する", async () => {
  const session = createSession();
  const result = await session.toolExecute({
    name: "小林",
    furigana: "コバヤシ",
    message: "確認のみ",
  });
  assert.equal(result.submitted, false);
  assert.equal(result.drafted, true);
});
