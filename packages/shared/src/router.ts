// Model Router (architecture doc §12/§13): the one gateway every agent calls.
// Provides per-task routing, timeout, bounded retries, provider fallback and
// usage/failure logging to the AiRun table. Agent code never sees providers,
// so DeepSeek/Grok/anything else can be swapped by config alone.

import { prisma } from "@sop/db";
import type { CompletionRequest, CompletionResult, ModelProvider } from "./providerTypes";

export * from "./providerTypes";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS_PER_PROVIDER = 2;
const RETRY_BASE_DELAY_MS = 500;

class RouterError extends Error {
  constructor(
    message: string,
    public readonly taskId: string,
    public readonly cause?: unknown
  ) {
    super(message);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class ModelRouter {
  constructor(private providers: ModelProvider[]) {}

  /**
   * Run a completion with retry + fallback across every provider that
   * supports the task, in registration order. Always records an AiRun row
   * (ok or error) for cost/failure tracking.
   */
  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const candidates = this.providers.filter((p) => p.supports(req.task));
    if (candidates.length === 0) {
      throw new RouterError(`No provider configured for task: ${req.task}`, req.task);
    }

    const failures: string[] = [];

    for (const provider of candidates) {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_PROVIDER; attempt++) {
        const startedAt = Date.now();
        try {
          const result = await withTimeout(provider.complete(req), DEFAULT_TIMEOUT_MS, `${provider.name}/${req.task}`);
          await this.logRun(req.task, provider.name, result.model, "ok", null, Date.now() - startedAt, result.usage);
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          failures.push(`${provider.name}#${attempt}: ${message}`);
          await this.logRun(req.task, provider.name, "-", "error", message, Date.now() - startedAt, undefined);
          if (attempt < MAX_ATTEMPTS_PER_PROVIDER) await sleep(RETRY_BASE_DELAY_MS * attempt);
        }
      }
    }

    throw new RouterError(`All providers failed for task ${req.task}: ${failures.join(" | ")}`, req.task);
  }

  /**
   * Cross-check: run the same request against the two highest-priority
   * providers so the Verification Engine can compare independent answers
   * (never trust a single model's word on something that will be published).
   */
  async crossCheck(req: CompletionRequest): Promise<CompletionResult[]> {
    const candidates = this.providers.filter((p) => p.supports(req.task)).slice(0, 2);
    const results = await Promise.allSettled(candidates.map((p) => p.complete(req)));
    return results
      .filter((r): r is PromiseFulfilledResult<CompletionResult> => r.status === "fulfilled")
      .map((r) => r.value);
  }

  private async logRun(
    task: TaskTypeIn,
    provider: string,
    model: string,
    status: "ok" | "error",
    error: string | null,
    latencyMs: number,
    usage?: { inputTokens: number; outputTokens: number }
  ): Promise<void> {
    try {
      await prisma.aiRun.create({
        data: {
          task,
          provider,
          model,
          status,
          error,
          latencyMs,
          inputTokens: usage?.inputTokens ?? null,
          outputTokens: usage?.outputTokens ?? null,
        },
      });
    } catch {
      // Logging must never break the pipeline (e.g. db briefly unavailable).
    }
  }
}

type TaskTypeIn = CompletionRequest["task"];

// Provider registry. Order = priority. Mock is always last so a missing key
// degrades gracefully instead of crashing the worker.
export function buildProviders(): ModelProvider[] {
  const providers: ModelProvider[] = [];
  // Registered first (highest priority) when keys are present.
  const { DeepSeekProvider } = require("./providers/deepseek") as typeof import("./providers/deepseek");
  const { GrokProvider } = require("./providers/grok") as typeof import("./providers/grok");
  const { MockProvider } = require("./providers/mock") as typeof import("./providers/mock");

  if (process.env.DEEPSEEK_API_KEY) {
    providers.push(
      new DeepSeekProvider(process.env.DEEPSEEK_API_KEY, process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com")
    );
  }
  if (process.env.GROK_API_KEY) {
    providers.push(new GrokProvider(process.env.GROK_API_KEY, process.env.GROK_BASE_URL ?? "https://api.x.ai"));
  }
  providers.push(new MockProvider());
  return providers;
}

export const modelRouter = new ModelRouter(buildProviders());
