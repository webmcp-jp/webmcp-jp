import {
  buildPreview,
  normalizeInput,
  submitForm,
  validateForm,
} from "./form-logic.js";
import { registerContactFormTool } from "../../src/index.js";

/** @typedef {import('./form-logic.js').ContactFormValues} ContactFormValues */

const els = {
  form: document.getElementById("contact-form"),
  name: document.getElementById("name"),
  furigana: document.getElementById("furigana"),
  postalCode: document.getElementById("postalCode"),
  address: document.getElementById("address"),
  message: document.getElementById("message"),
  consent: document.getElementById("consent"),
  errors: document.getElementById("form-errors"),
  status: document.getElementById("form-status"),
  submit: document.getElementById("submit-button"),
  reset: document.getElementById("reset-button"),
  registration: document.getElementById("webmcp-registration"),
  toolLog: document.getElementById("tool-log"),
  preview: document.getElementById("draft-preview"),
};

/** @type {boolean} */
let submitted = false;
let registeredDraftExecute = null;

/**
 * @returns {ContactFormValues}
 */
function readForm() {
  return normalizeInput({
    name: els.name?.value,
    furigana: els.furigana?.value,
    postalCode: els.postalCode?.value,
    address: els.address?.value,
    message: els.message?.value,
    consent: els.consent?.checked,
  });
}

/**
 * @param {ContactFormValues} values
 */
function writeForm(values) {
  const form = normalizeInput(values);
  if (els.name) els.name.value = form.name;
  if (els.furigana) els.furigana.value = form.furigana;
  if (els.postalCode) els.postalCode.value = form.postalCode;
  if (els.address) els.address.value = form.address;
  if (els.message) els.message.value = form.message;
  if (els.consent) els.consent.checked = form.consent;
  updatePreview(form);
}

/**
 * @param {string[]} messages
 */
function showErrors(messages) {
  if (!els.errors) return;
  if (!messages.length) {
    els.errors.hidden = true;
    els.errors.textContent = "";
    return;
  }
  els.errors.hidden = false;
  els.errors.innerHTML = messages.map((m) => `<li>${escapeHtml(m)}</li>`).join("");
}

/**
 * @param {string} message
 * @param {"info" | "success" | "warn"} [kind]
 */
function showStatus(message, kind = "info") {
  if (!els.status) return;
  els.status.hidden = !message;
  els.status.dataset.kind = kind;
  els.status.textContent = message;
}

/**
 * @param {ContactFormValues} values
 */
function updatePreview(values) {
  if (!els.preview) return;
  const preview = buildPreview(values);
  els.preview.textContent = JSON.stringify(preview, null, 2);
}

/**
 * @param {string} text
 */
function appendToolLog(text) {
  if (!els.toolLog) return;
  const line = document.createElement("p");
  line.textContent = `${new Date().toLocaleTimeString("ja-JP")} ${text}`;
  els.toolLog.prepend(line);
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Draft-only tool execute. Never calls submitForm.
 * @param {Record<string, unknown>} input
 */
async function executeDraftTool(input) {
  if (!registeredDraftExecute) {
    throw new Error("WebMCP Tool は未登録です。対応環境で実行してください。");
  }
  return registeredDraftExecute(input);
}

async function registerWebMcpTool() {
  try {
    const registration = await registerContactFormTool({
      modelContext: document.modelContext,
      read: readForm,
      write: writeForm,
      isSubmitted: () => submitted,
      onDraft: (result) => {
        appendToolLog(
          `draft_contact_form を実行: 反映=${result.appliedFields.join(",") || "なし"} / 未反映=${result.skippedFields.join(",") || "なし"}`,
        );
        showStatus(
          "WebMCPツールが下書きを反映しました。内容と同意を確認し、送信ボタンを人が押してください。",
        );
      },
    });
    if (registration.status === "unsupported") {
      setRegistration("unsupported", "WebMCP未対応。通常UIで利用できます。");
      return;
    }
    registeredDraftExecute = registration.execute;
    window.addEventListener("pagehide", registration.unregister, { once: true });
    setRegistration("registered", "WebMCP登録済み: draft_contact_form");
    appendToolLog("draft_contact_form を document.modelContext に登録しました。");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setRegistration("error", `登録失敗: ${message}`);
    appendToolLog(`登録エラー: ${message}`);
  }
}

/**
 * @param {"checking" | "registered" | "unsupported" | "error"} state
 * @param {string} label
 */
function setRegistration(state, label) {
  if (!els.registration) return;
  els.registration.dataset.state = state;
  els.registration.textContent = label;
}

function onSubmit(event) {
  event.preventDefault();
  const values = readForm();
  const result = submitForm(values, { alreadySubmitted: submitted });

  if (!result.ok) {
    showErrors(result.errors);
    showStatus("送信できませんでした。エラーを確認してください。", "warn");
    return;
  }

  submitted = true;
  showErrors([]);
  showStatus(
    `送信しました（ローカル模擬）。受付ID: ${result.receipt.id}`,
    "success",
  );
  if (els.submit) els.submit.disabled = true;
  if (els.form) {
    for (const control of els.form.elements) {
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
        control.readOnly = control.type !== "checkbox";
        if (control.type === "checkbox") control.disabled = true;
      }
    }
  }
  appendToolLog("人が送信ボタンを押して最終送信しました（ローカル模擬）。");
}

function onReset(event) {
  event.preventDefault();
  submitted = false;
  writeForm({
    name: "",
    furigana: "",
    postalCode: "",
    address: "",
    message: "",
    consent: false,
  });
  showErrors([]);
  showStatus("フォームを初期化しました。", "info");
  if (els.submit) els.submit.disabled = false;
  if (els.form) {
    for (const control of els.form.elements) {
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
        control.readOnly = false;
        control.disabled = false;
      }
    }
  }
}

function bindUi() {
  els.form?.addEventListener("submit", onSubmit);
  els.reset?.addEventListener("click", onReset);

  for (const el of [els.name, els.furigana, els.postalCode, els.address, els.message, els.consent]) {
    el?.addEventListener("input", () => updatePreview(readForm()));
    el?.addEventListener("change", () => updatePreview(readForm()));
  }

  // Demo helper: expose a safe manual invoke for local tests without a browser agent.
  window.__webmcpJpContactForm = {
    readForm,
    writeForm,
    executeDraftTool,
    submitForm: () => submitForm(readForm(), { alreadySubmitted: submitted }),
    isSubmitted: () => submitted,
  };

  updatePreview(readForm());
  setRegistration("checking", "WebMCP対応を確認中…");
  void registerWebMcpTool();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindUi, { once: true });
} else {
  bindUi();
}
