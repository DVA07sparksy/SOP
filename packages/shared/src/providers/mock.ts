import type { CompletionRequest, CompletionResult, ModelProvider } from "../providerTypes";

// Default provider for local dev (no API keys configured). Returns
// deterministic, plausible output so the whole pipeline (queues, dedup, trust
// scoring, admin review) can be exercised end-to-end without any network
// calls. Also used as the last-resort fallback in live mode.
export class MockProvider implements ModelProvider {
  name = "mock";

  supports(): boolean {
    return true; // mock backs every task
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    switch (req.task) {
      case "extraction":
        return this.json(req, {
          title: extractGuess(req.input, /(?:competition|olympiad|challenge|cup)[^\n.]*/i) ?? "Untitled Competition",
          organizer: extractGuess(req.input, /(?:organized by|hosted by|organizer)[:\s]+([^\n.]+)/i),
          category: ["general"],
          eligibility: extractGuess(req.input, /eligibl[^:\n]*:?\s*([^\n]+)/i) ?? "See official rules.",
          deadline: null,
          countries: [],
          format: /in[ -]person|on[ -]site|venue/i.test(req.input) ? "OFFLINE" : "ONLINE",
          benefits: ["certificate"],
          applicationUrl: null,
          officialUrl: null,
          confidence: 0.5,
        });
      case "eligibility_reasoning":
        return this.json(req, { ageMin: null, ageMax: null, educationLevels: [], countries: [] });
      case "verification":
        return this.json(req, {
          agrees: true,
          confidence: 0.7,
          notes: "Mock verification: no contradictions found.",
        });
      case "assistant_chat":
      case "admin_chat":
        return {
          provider: this.name,
          model: "mock-assistant",
          text:
            "This is a mock AI response (no API keys configured). Set DEEPSEEK_API_KEY / GROK_API_KEY to get real answers.",
        };
      case "vision_document":
        return this.json(req, { title: "Untitled (from document)", eligibility: null, deadline: null });
      case "embedding":
        return { provider: this.name, model: "mock-embedding", text: "" };
      default:
        return { provider: this.name, model: "mock", text: "" };
    }
  }

  private json(req: CompletionRequest, obj: unknown): CompletionResult {
    return { provider: this.name, model: "mock", text: JSON.stringify(obj), json: obj };
  }
}

function extractGuess(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  if (!match) return null;
  return (match[1] ?? match[0]).trim().slice(0, 120) || null;
}
