import { registerContactFormTool } from "webmcp-jp";

const form = document.querySelector("form");
let submitted = false;

await registerContactFormTool({
  modelContext: document.modelContext,
  read: () => Object.fromEntries(new FormData(form)),
  write: (values) => {
    for (const [name, value] of Object.entries(values)) {
      const control = form.elements.namedItem(name);
      if (control?.type === "checkbox") control.checked = value === true;
      else if (control) control.value = String(value ?? "");
    }
  },
  isSubmitted: () => submitted,
});

// 最終送信はToolではなく、人が通常UIの送信ボタンを押したときだけ行う。
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (submitted) return;
  submitted = true;
  // 実サイトの送信処理は、この通常UI経路にだけ実装する。
});
