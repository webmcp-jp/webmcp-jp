export type ContactFormValues = {
  name?: string;
  furigana?: string;
  postalCode?: string;
  address?: string;
  message?: string;
  consent?: boolean;
  [key: string]: unknown;
};

export type DraftResult = {
  drafted: true;
  submitted: false;
  appliedFields: string[];
  skippedFields: string[];
  preview: Required<Pick<ContactFormValues, "name" | "furigana" | "postalCode" | "address" | "message" | "consent">>;
  note: string;
};

export type RegistrationStatus = "registered" | "unsupported" | "error" | "unregistered";

export interface ModelContextLike {
  registerTool(tool: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<void> | void;
}

export interface RegisterContactFormToolOptions {
  modelContext?: ModelContextLike;
  read(): ContactFormValues;
  write(values: ContactFormValues): void;
  isSubmitted?(): boolean;
  onDraft?(result: DraftResult): void;
  onStatusChange?(event: { status: RegistrationStatus; name: string; error?: unknown }): void;
  name?: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

export const CONTACT_FORM_FIELDS: readonly string[];
export const CONTACT_FORM_TOOL: Readonly<Record<string, unknown>>;
export function registerContactFormTool(options: RegisterContactFormToolOptions): Promise<{
  status: "registered" | "unsupported";
  name?: string;
  execute: ((input?: Record<string, unknown>) => Promise<DraftResult>) | null;
  unregister(): void;
}>;
