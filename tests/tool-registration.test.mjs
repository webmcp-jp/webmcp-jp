import assert from "node:assert/strict";
import test from "node:test";
import {
  DRAFT_TOOL_INPUT_SCHEMA,
  DRAFT_TOOL_META,
  applyDraft,
  buildPreview,
  normalizeInput,
  submitForm,
} from "../examples/contact-form/form-logic.js";

/**
 * Minimal in-memory ModelContext stand-in for environments without the experimental API.
 * Mirrors the shape used by the sample: registerTool({ name, description, inputSchema, execute }, { signal }).
 */
function createFakeModelContext() {
  /** @type {Map<string, any>} */
  const tools = new Map();

  return {
    tools,
    async registerTool(tool, options = {}) {
      if (!tool || typeof tool.name !== "string" || !tool.name) {
        throw new Error("name is required");
      }
      if (typeof tool.description !== "string" || !tool.description) {
        throw new Error("description is required");
      }
      if (typeof tool.execute !== "function") {
        throw new Error("execute is required");
      }
      if (tools.has(tool.name)) {
        throw new Error(`tool already registered: ${tool.name}`);
      }

      tools.set(tool.name, tool);

      if (options.signal) {
        const onAbort = () => {
          tools.delete(tool.name);
          options.signal.removeEventListener("abort", onAbort);
        };
        if (options.signal.aborted) onAbort();
        else options.signal.addEventListener("abort", onAbort);
      }
    },
    async getTools() {
      return [...tools.values()].map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      }));
    },
  };
}

test("Tool登録: draft_contact_form のメタデータと schema が定義されている", () => {
  assert.equal(DRAFT_TOOL_META.name, "draft_contact_form");
  assert.match(DRAFT_TOOL_META.description, /最終送信/);
  assert.match(DRAFT_TOOL_META.description, /行わない/);
  assert.equal(DRAFT_TOOL_META.annotations.readOnlyHint, false);
  assert.equal(DRAFT_TOOL_INPUT_SCHEMA.type, "object");
  assert.equal(DRAFT_TOOL_INPUT_SCHEMA.additionalProperties, false);
  assert.ok(DRAFT_TOOL_INPUT_SCHEMA.properties.name);
  assert.ok(DRAFT_TOOL_INPUT_SCHEMA.properties.furigana);
  assert.ok(DRAFT_TOOL_INPUT_SCHEMA.properties.postalCode);
  assert.ok(DRAFT_TOOL_INPUT_SCHEMA.properties.address);
  assert.ok(DRAFT_TOOL_INPUT_SCHEMA.properties.message);
  assert.ok(DRAFT_TOOL_INPUT_SCHEMA.properties.consent);
});

test("Tool登録: document.modelContext 互換の registerTool で登録・解除できる", async () => {
  const modelContext = createFakeModelContext();
  const controller = new AbortController();

  /** @type {Record<string, unknown>} */
  let state = normalizeInput({});

  await modelContext.registerTool(
    {
      name: DRAFT_TOOL_META.name,
      title: DRAFT_TOOL_META.title,
      description: DRAFT_TOOL_META.description,
      inputSchema: DRAFT_TOOL_INPUT_SCHEMA,
      annotations: DRAFT_TOOL_META.annotations,
      execute: async (input) => {
        const { next, applied } = applyDraft(state, input);
        state = next;
        return {
          drafted: true,
          submitted: false,
          appliedFields: applied,
          preview: buildPreview(next),
        };
      },
    },
    { signal: controller.signal },
  );

  const tools = await modelContext.getTools();
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, "draft_contact_form");
  assert.ok(tools[0].description.includes("下書き"));

  const tool = modelContext.tools.get("draft_contact_form");
  const result = await tool.execute({
    name: "鈴木次郎",
    furigana: "スズキジロウ",
    postalCode: "060-0001",
    address: "北海道札幌市",
    message: "デモ希望",
    consent: true,
  });

  assert.equal(result.drafted, true);
  assert.equal(result.submitted, false);
  assert.equal(result.preview.name, "鈴木次郎");
  assert.equal(state.name, "鈴木次郎");

  // Tool path must not call submitForm
  assert.equal(submitForm(state).ok, true); // values are valid, but tool itself didn't submit
  assert.equal(result.submitted, false);

  controller.abort();
  const afterAbort = await modelContext.getTools();
  assert.equal(afterAbort.length, 0);
});

test("Tool登録: 同名ツールの二重登録は失敗する", async () => {
  const modelContext = createFakeModelContext();
  const tool = {
    name: "draft_contact_form",
    description: "test",
    execute: async () => ({}),
  };

  await modelContext.registerTool(tool);
  await assert.rejects(() => modelContext.registerTool(tool), /already registered/);
});
