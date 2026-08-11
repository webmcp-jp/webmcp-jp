export const CONTACT_FORM_FIELDS = Object.freeze([
  "name",
  "furigana",
  "postalCode",
  "address",
  "message",
  "consent",
]);

export const CONTACT_FORM_TOOL = Object.freeze({
  name: "draft_contact_form",
  title: "問い合わせ下書き",
  description:
    "日本語の問い合わせフォームへ下書きを入力する。画面への反映だけを行い、最終送信・外部送信・購入・削除は行わない。送信は人が通常UIで内容を確認して実行する。",
  inputSchema: Object.freeze({
    type: "object",
    properties: {
      name: { type: "string", description: "氏名", maxLength: 80 },
      furigana: { type: "string", description: "フリガナ", maxLength: 80 },
      postalCode: {
        type: "string",
        description: "郵便番号（123-4567 または 1234567）",
        maxLength: 8,
      },
      address: { type: "string", description: "住所", maxLength: 200 },
      message: { type: "string", description: "問い合わせ内容", maxLength: 2000 },
      consent: { type: "boolean", description: "個人情報取扱いへの同意状態" },
    },
    additionalProperties: false,
  }),
  annotations: Object.freeze({
    readOnlyHint: false,
    untrustedContentHint: true,
  }),
});

function normalizeValue(key, value) {
  if (key === "consent") return value === true || value === "true" || value === "on" || value === 1;
  if (typeof value !== "string") return "";
  const limits = { name: 80, furigana: 80, postalCode: 8, address: 200, message: 2000 };
  const normalized = value.normalize("NFC").trim();
  return (key === "postalCode" ? normalized.replace(/[‐‑‒–—―]/g, "-") : normalized).slice(
    0,
    limits[key],
  );
}

/**
 * document.modelContext に問い合わせ下書き Tool を登録する。
 * read/write は通常UIの状態だけを扱い、この関数は submit を受け取らない。
 */
export async function registerContactFormTool(options) {
  if (!options || typeof options.read !== "function" || typeof options.write !== "function") {
    throw new TypeError("read と write は必須です。");
  }

  const modelContext = options.modelContext;
  const unsupported = !modelContext || typeof modelContext.registerTool !== "function";
  if (unsupported) {
    options.onStatusChange?.({ status: "unsupported", name: CONTACT_FORM_TOOL.name });
    return { status: "unsupported", execute: null, unregister() {} };
  }

  const controller = new AbortController();
  const execute = async (input = {}) => {
    if (options.isSubmitted?.()) {
      throw new Error("送信済みのため下書きできません。新しい問い合わせを開いてください。");
    }

    const current = options.read() ?? {};
    const draft = input && typeof input === "object" ? input : {};
    const next = { ...current };
    const appliedFields = [];
    const skippedFields = [];

    for (const key of CONTACT_FORM_FIELDS) {
      if (!(key in draft)) {
        skippedFields.push(key);
        continue;
      }
      const value = normalizeValue(key, draft[key]);
      if (key !== "consent" && !value) {
        skippedFields.push(key);
        continue;
      }
      next[key] = value;
      appliedFields.push(key);
    }

    options.write(next);
    const result = {
      drafted: true,
      submitted: false,
      appliedFields,
      skippedFields,
      preview: Object.fromEntries(CONTACT_FORM_FIELDS.map((key) => [key, next[key] ?? (key === "consent" ? false : "")])),
      note: "最終送信は人が通常UIで内容を確認して実行します。このToolは送信しません。",
    };
    options.onDraft?.(result);
    return result;
  };

  const tool = {
    name: options.name ?? CONTACT_FORM_TOOL.name,
    title: options.title ?? CONTACT_FORM_TOOL.title,
    description: options.description ?? CONTACT_FORM_TOOL.description,
    inputSchema: options.inputSchema ?? CONTACT_FORM_TOOL.inputSchema,
    annotations: { ...CONTACT_FORM_TOOL.annotations, ...options.annotations },
    execute,
  };

  try {
    await modelContext.registerTool(tool, { signal: controller.signal });
  } catch (error) {
    controller.abort();
    options.onStatusChange?.({ status: "error", name: tool.name, error });
    throw error;
  }

  options.onStatusChange?.({ status: "registered", name: tool.name });
  return {
    status: "registered",
    name: tool.name,
    execute,
    unregister() {
      controller.abort();
      options.onStatusChange?.({ status: "unregistered", name: tool.name });
    },
  };
}

if (typeof globalThis === "object") {
  globalThis.WebMcpJp = Object.freeze({
    CONTACT_FORM_FIELDS,
    CONTACT_FORM_INPUT_SCHEMA: CONTACT_FORM_TOOL.inputSchema,
    CONTACT_FORM_TOOL,
    registerContactFormTool,
  });
}
