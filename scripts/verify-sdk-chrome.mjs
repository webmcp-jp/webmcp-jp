#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const port = Number(process.env.CDP_PORT || 9242);
const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "webmcp-sdk-chrome-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  "--remote-allow-origins=*",
  "--disable-extensions",
  "--enable-features=WebMCP,ModelContext,DocumentModelContext",
  "--enable-blink-features=WebMCP,ModelContext,DocumentModelContext",
  "about:blank",
], { stdio: "ignore" });

async function waitForJson() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      if (response.ok) {
        const created = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
        if (created.ok) return created.json();
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Chrome CDP did not become ready");
}

try {
  const tab = await waitForJson();
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  };
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  const send = (method, params = {}) => {
    const requestId = ++id;
    socket.send(JSON.stringify({ id: requestId, method, params }));
    return new Promise((resolve) => pending.set(requestId, resolve));
  };
  const evaluate = async (expression) => {
    const message = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (message.result.exceptionDetails) {
      throw new Error(message.result.exceptionDetails.exception?.description || message.result.exceptionDetails.text);
    }
    return message.result.result.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  const consoleEvents = [];
  socket.addEventListener("message", ({ data }) => {
    const event = JSON.parse(data);
    if (event.method === "Runtime.exceptionThrown" || event.method === "Runtime.consoleAPICalled") {
      consoleEvents.push(event.params);
    }
  });
  const targetUrl = process.env.SDK_URL || "http://127.0.0.1:4182/examples/contact-form/";
  const navigation = await send("Page.navigate", { url: targetUrl });
  if (navigation.result.errorText && navigation.result.errorText !== "net::ERR_ABORTED") {
    throw new Error(navigation.result.errorText);
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const currentUrl = await evaluate("location.href");
  if (currentUrl !== targetUrl) throw new Error(`unexpected URL: ${currentUrl}`);
  const details = await evaluate(`(async () => ({
    registrationText: document.querySelector('#webmcp-registration')?.textContent,
    registrationTextByData: document.querySelector('[data-webmcp-registration]')?.textContent,
    toolNames: (await document.modelContext.getTools()).map((tool) => tool.name),
    hasExecute: typeof window.__webmcpJpContactForm?.executeDraftTool === 'function'
      || typeof window.__webmcpJp?.registration?.execute === 'function'
  }))()`);

  if (!details.hasExecute) {
    throw new Error(JSON.stringify({ details, consoleEvents }));
  }

  const flow = await evaluate(`(async () => {
    const execute = window.__webmcpJpContactForm?.executeDraftTool
      ?? window.__webmcpJp?.registration?.execute;
    const result = await execute({
      name: '架空 利用者', furigana: 'カクウ リヨウシャ', postalCode: '100-0001',
      address: '架空県架空市', message: 'SDK確認', consent: true
    });
    return {
      drafted: result.drafted,
      submitted: result.submitted,
      name: document.querySelector('#name, [name="name"]').value,
      isSubmitted: window.__webmcpJpContactForm?.isSubmitted?.() ?? false
    };
  })()`);
  const valid = (details.registrationText === "WebMCP登録済み: draft_contact_form"
      || details.registrationTextByData === "WebMCP登録済み")
    && details.toolNames.includes("draft_contact_form")
    && details.hasExecute
    && flow.drafted
    && flow.submitted === false
    && flow.name === "架空 利用者"
    && flow.isSubmitted === false;
  if (!valid) throw new Error(JSON.stringify({ details, flow }));
  console.log(JSON.stringify({ details, flow }, null, 2));
  socket.close();
} finally {
  chrome.kill("SIGTERM");
  await new Promise((resolve) => chrome.once("exit", resolve));
  await fs.rm(profile, { recursive: true, force: true });
}
