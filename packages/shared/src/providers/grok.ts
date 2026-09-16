import type { CompletionRequest, CompletionResult, ModelProvider } from "../providerTypes";

// Grok is used for web-oriented discovery and cross-checking (architecture
// doc §12). It intentionally supports a narrower task set than DeepSeek here;
// extend SUPPORTED to route more tasks to it.
const SUPPORTED: CompletionRequest["task"][] = ["verification", "assistant_chat"];

export class GrokProvider implements ModelProvider {
  name = "grok";

  constructor(private apiKey: string, private baseUrl: string) {}

  supports(task: CompletionRequest["task"]): boolean {
    return SUPPORTED.includes(task);
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const model = "grok-4";
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
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
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }

    const data = (await response.json()) as any;
    const text = data.choices?.[0]?.message?.content ?? "";

    return { provider: this.name, model, text, json: req.jsonSchema ? safeJsonParse(text) : undefined };
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
