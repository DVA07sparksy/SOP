import type { CompletionRequest, CompletionResult, ModelProvider } from "../providerTypes";

// DeepSeek is used for structured extraction, JSON-mode tasks, and reasoning
// (architecture doc §12). Model choice per task lives only here — swap tiers
// by editing this map, never agent code.
const modelForTask: Partial<Record<CompletionRequest["task"], string>> = {
  extraction: "deepseek-chat",
  eligibility_reasoning: "deepseek-chat",
  assistant_chat: "deepseek-chat",
  admin_chat: "deepseek-chat",
  vision_document: "deepseek-chat",
};

export class DeepSeekProvider implements ModelProvider {
  name = "deepseek";

  constructor(private apiKey: string, private baseUrl: string) {}

  supports(task: CompletionRequest["task"]): boolean {
    return task in modelForTask;
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const model = modelForTask[req.task];
    if (!model) throw new Error(`DeepSeek provider does not support task: ${req.task}`);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.input },
        ],
        response_format: req.jsonSchema ? { type: "json_object" } : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }

    const data = (await response.json()) as any;
    const text = data.choices?.[0]?.message?.content ?? "";

    return {
      provider: this.name,
      model,
      text,
      json: req.jsonSchema ? safeJsonParse(text) : undefined,
      usage: data.usage
        ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
        : undefined,
    };
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
