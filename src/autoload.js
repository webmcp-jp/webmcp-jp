import "./index.js";

function getForm() {
  return document.querySelector("form[data-webmcp-contact]");
}

function readForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function writeForm(form, values) {
  for (const [name, value] of Object.entries(values)) {
    const control = form.elements.namedItem(name);
    if (!control || !(control instanceof HTMLElement)) continue;
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      control.checked = value === true;
    } else if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      control.value = String(value ?? "");
    }
  }
  form.dispatchEvent(new Event("input", { bubbles: true }));
}

async function autoload() {
  const form = getForm();
  if (!(form instanceof HTMLFormElement)) return;
  let submitted = form.dataset.webmcpSubmitted === "true";
  form.addEventListener("submit", () => {
    submitted = true;
    form.dataset.webmcpSubmitted = "true";
  });

  try {
    const registration = await globalThis.WebMcpJp.registerContactFormTool({
      modelContext: document.modelContext,
      read: () => readForm(form),
      write: (values) => writeForm(form, values),
      isSubmitted: () => submitted,
      onStatusChange: ({ status }) => {
        const output = document.querySelector("[data-webmcp-registration]");
        if (output) {
          output.textContent = status === "registered"
            ? "WebMCP登録済み"
            : "WebMCP未対応。通常UIを利用できます。";
        }
      },
    });
    window.__webmcpJp = { registration };
    window.addEventListener("pagehide", registration.unregister, { once: true });
  } catch (error) {
    const output = document.querySelector("[data-webmcp-registration]");
    if (output) output.textContent = "WebMCP登録失敗。通常UIを利用できます。";
    window.__webmcpJp = { error };
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void autoload(), { once: true });
} else {
  void autoload();
}
