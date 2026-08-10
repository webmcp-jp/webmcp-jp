/**
 * Shared contact-form logic for the normal UI and the WebMCP tool.
 * Tool execution may only draft values. Final submit stays human-confirmed.
 */

export const FIELD_LIMITS = {
  name: 80,
  furigana: 80,
  postalCode: 8,
  address: 200,
  message: 2000,
};

export const EMPTY_FORM = Object.freeze({
  name: "",
  furigana: "",
  postalCode: "",
  address: "",
  message: "",
  consent: false,
});

/**
 * @typedef {Object} ContactFormValues
 * @property {string} name
 * @property {string} furigana
 * @property {string} postalCode
 * @property {string} address
 * @property {string} message
 * @property {boolean} consent
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
export function asTrimmedString(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").trim();
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function asBoolean(value) {
  return value === true || value === "true" || value === "on" || value === 1;
}

/**
 * Normalize free-form tool or UI input into form values.
 * Unknown keys are ignored. Values are not trusted.
 *
 * @param {Record<string, unknown> | null | undefined} input
 * @returns {ContactFormValues}
 */
export function normalizeInput(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    name: asTrimmedString(source.name).slice(0, FIELD_LIMITS.name),
    furigana: asTrimmedString(source.furigana).slice(0, FIELD_LIMITS.furigana),
    postalCode: asTrimmedString(source.postalCode)
      .replace(/[‐‑‒–—―]/g, "-")
      .slice(0, FIELD_LIMITS.postalCode),
    address: asTrimmedString(source.address).slice(0, FIELD_LIMITS.address),
    message: asTrimmedString(source.message).slice(0, FIELD_LIMITS.message),
    consent: asBoolean(source.consent),
  };
}

/**
 * @param {ContactFormValues} values
 * @returns {string[]}
 */
export function validateForm(values) {
  const errors = [];
  const form = normalizeInput(values);

  if (!form.name) errors.push("氏名を入力してください。");
  if (!form.furigana) errors.push("フリガナを入力してください。");
  if (!form.postalCode) {
    errors.push("郵便番号を入力してください。");
  } else if (!/^\d{3}-?\d{4}$/.test(form.postalCode)) {
    errors.push("郵便番号は123-4567の形式で入力してください。");
  }
  if (!form.address) errors.push("住所を入力してください。");
  if (!form.message) errors.push("問い合わせ内容を入力してください。");
  if (form.message.length > FIELD_LIMITS.message) {
    errors.push(`問い合わせ内容は${FIELD_LIMITS.message}文字以内にしてください。`);
  }
  if (!form.consent) {
    errors.push("個人情報の取扱いに同意してください。");
  }

  return errors;
}

/**
 * Apply draft values without submitting.
 * Empty optional draft fields leave the current value unchanged.
 *
 * @param {ContactFormValues} current
 * @param {Record<string, unknown>} draftInput
 * @returns {{ next: ContactFormValues, applied: string[], skipped: string[] }}
 */
export function applyDraft(current, draftInput) {
  const base = normalizeInput(current);
  const draft = draftInput && typeof draftInput === "object" ? draftInput : {};
  const applied = [];
  const skipped = [];
  const next = { ...base };

  /** @type {(keyof ContactFormValues)[]} */
  const keys = ["name", "furigana", "postalCode", "address", "message", "consent"];

  for (const key of keys) {
    if (!(key in draft)) {
      skipped.push(key);
      continue;
    }

    if (key === "consent") {
      next.consent = asBoolean(draft.consent);
      applied.push(key);
      continue;
    }

    const value = asTrimmedString(draft[key]);
    if (!value) {
      skipped.push(key);
      continue;
    }

    if (key === "postalCode") {
      next.postalCode = value
        .replace(/[‐‑‒–—―]/g, "-")
        .slice(0, FIELD_LIMITS.postalCode);
    } else {
      next[key] = value.slice(0, FIELD_LIMITS[key]);
    }
    applied.push(key);
  }

  return { next, applied, skipped };
}

/**
 * Build a safe preview object for tool output.
 * Does not include secrets. Suitable for agent-facing text.
 *
 * @param {ContactFormValues} values
 * @returns {Record<string, string | boolean>}
 */
export function buildPreview(values) {
  const form = normalizeInput(values);
  return {
    name: form.name,
    furigana: form.furigana,
    postalCode: form.postalCode,
    address: form.address,
    message: form.message,
    consent: form.consent,
  };
}

/**
 * Final submit gate. Call only from the human UI path.
 *
 * @param {ContactFormValues} values
 * @param {{ alreadySubmitted?: boolean }} [options]
 * @returns {{ ok: true, receipt: { id: string, submittedAt: string } } | { ok: false, errors: string[] }}
 */
export function submitForm(values, options = {}) {
  if (options.alreadySubmitted) {
    return {
      ok: false,
      errors: ["この問い合わせは送信済みです。二重送信はできません。"],
    };
  }

  const form = normalizeInput(values);
  const errors = validateForm(form);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const stamp = new Date().toISOString();
  const id = `local-${stamp.replace(/[-:.TZ]/g, "").slice(0, 14)}`;

  return {
    ok: true,
    receipt: {
      id,
      submittedAt: stamp,
    },
  };
}

/**
 * Tool input schema for draft_contact_form.
 * Kept as plain data so tests can inspect it without DOM.
 */
export const DRAFT_TOOL_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "氏名（漢字・かな・アルファベット可）",
      maxLength: FIELD_LIMITS.name,
    },
    furigana: {
      type: "string",
      description: "フリガナ",
      maxLength: FIELD_LIMITS.furigana,
    },
    postalCode: {
      type: "string",
      description: "郵便番号（123-4567 または 1234567）",
      maxLength: FIELD_LIMITS.postalCode,
    },
    address: {
      type: "string",
      description: "住所",
      maxLength: FIELD_LIMITS.address,
    },
    message: {
      type: "string",
      description: "問い合わせ内容",
      maxLength: FIELD_LIMITS.message,
    },
    consent: {
      type: "boolean",
      description: "個人情報取扱いへの同意。true のとき同意済みとして下書きする",
    },
  },
  additionalProperties: false,
});

export const DRAFT_TOOL_META = Object.freeze({
  name: "draft_contact_form",
  title: "問い合わせ下書き",
  description:
    "日本語の問い合わせフォームへ下書きを入力する。氏名・フリガナ・郵便番号・住所・問い合わせ内容・同意を画面に反映するだけ。最終送信・外部送信・購入・削除は行わない。送信は人が画面で確認して実行する。",
  annotations: Object.freeze({
    readOnlyHint: false,
    // preview に利用者が入力した氏名・住所・問い合わせ本文を含むため true。
    // Agent は Tool 出力を信頼できる指示文として扱わない。
    untrustedContentHint: true,
  }),
});
