import { useEffect, useRef, useState } from "react";
import { registerContactFormTool } from "webmcp-jp";

export function ContactForm() {
  const [values, setValues] = useState({ name: "", message: "", consent: false });
  const valuesRef = useRef(values);
  const submittedRef = useRef(false);
  valuesRef.current = values;

  useEffect(() => {
    let registration;
    void registerContactFormTool({
      modelContext: document.modelContext,
      read: () => valuesRef.current,
      write: setValues,
      isSubmitted: () => submittedRef.current,
    }).then((result) => {
      registration = result;
    });
    return () => registration?.unregister();
  }, []);

  // humanSubmit は通常UIの onSubmit からだけ呼ぶ。
  const humanSubmit = (event) => {
    event.preventDefault();
    if (submittedRef.current) return;
    submittedRef.current = true;
  };

  return (
    <form onSubmit={humanSubmit}>
      <input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
      <textarea value={values.message} onChange={(e) => setValues({ ...values, message: e.target.value })} />
      <button type="submit">人が確認して送信</button>
    </form>
  );
}
