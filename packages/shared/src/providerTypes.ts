// Provider contract (architecture doc §12/§13). Providers never import agent
// logic; agents never import provider SDKs. Adding a provider = implementing
// this interface + registering it in router.ts buildProviders().

export type TaskType =
  | "extraction" // structured extraction from raw text -> JSON
  | "eligibility_reasoning" // parse eligibility prose -> machine-readable rules
  | "verification" // cross-check another model's extraction
  | "assistant_chat" // conversational student assistant
  | "admin_chat" // admin analytics assistant
  | "vision_document" // poster/PDF understanding
  | "embedding"; // semantic embeddings (mock: hash-based, swap for real)

export interface CompletionRequest {
  task: TaskType;
  system: string;
  input: string;
  jsonSchema?: Record<string, unknown>; // when set, provider must return valid JSON matching this shape
  imageUrl?: string; // for vision_document
}

export interface CompletionResult {
  provider: string;
  model: string;
  text: string;
  json?: unknown;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ModelProvider {
  name: string;
  supports(task: TaskType): boolean;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}
