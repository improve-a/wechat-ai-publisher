import type { LayoutModelClient, LayoutModelRequest } from "./types";

export const DEEPSEEK_API_ENDPOINT = "https://api.deepseek.com";
export const DEEPSEEK_LIVE_MODEL = "deepseek-v4-flash";

export interface DeepSeekTokenUsage {
  promptTokens: number;
  promptCacheHitTokens: number;
  promptCacheMissTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface DeepSeekCallRecord extends DeepSeekTokenUsage {
  sequence: number;
  mode: LayoutModelRequest["mode"];
  endpoint: string;
  requestedModel: string;
  responseModel?: string;
  status: "success" | "http-error" | "timeout" | "response-error";
  httpStatus?: number;
  durationMs: number;
}

export interface DeepSeekLayoutModelClientOptions {
  apiKey: string;
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
  fetchImplementation?: typeof fetch;
  onCallRecord?: (record: DeepSeekCallRecord) => void;
}

interface DeepSeekChatResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const SYSTEM_PROMPT = `You are the Layout Planner for a WeChat article pipeline.
Return exactly one JSON object and nothing else. Do not return markdown fences.
You may only make layout decisions using the supplied themes, variants, components, provenance, and asset IDs.
Never return article text, HTML, CSS, JSX, or new semantic content.

The JSON object must have this shape:
{
  "schemaVersion": "1",
  "theme": "registered-theme-id",
  "themeVariant": "registered-theme-variant",
  "blocks": [
    {
      "id": "l001",
      "component": "registered-component-id",
      "componentVariant": "registered-component-variant",
      "provenance": { "kind": "article-title" }
    },
    {
      "id": "l002",
      "component": "registered-component-id",
      "componentVariant": "registered-component-variant",
      "provenance": {
        "kind": "article-blocks",
        "sourceBlockIds": ["a001"]
      }
    }
  ]
}

Hard rules:
- If ArticleAST.title exists, represent it at most once with article-title provenance and the article-title component.
- Consume every ArticleAST.blocks ID exactly once. Never omit, duplicate, summarize, or reorder a source block.
- Prefer one source block per Layout block. Only group blocks when the capability explicitly allows homogeneous-contiguous grouping.
- Use source types and grouping rules from capabilities.components. A registered component name alone is not enough.
- Keep all content Layout blocks in the original Article order. Decorative blocks may not contain semantic text.
- Use only registered variants. The metric ComponentVariant is valid only for the highlight component.
- assetIds may only reference IDs present in ArticleAST.assets.
- IDs must be unique and stable, using l001, l002, ... in Layout order.
- For repair mode, correct every supplied diagnostic without weakening any rule.
- The response must be valid JSON.`;

function buildUserPrompt(request: LayoutModelRequest): string {
  return JSON.stringify({
    task: request.mode === "initial" ? "Create a valid LayoutCandidate JSON." : "Repair the LayoutCandidate JSON.",
    mode: request.mode,
    ...(request.userRequest ? { userRequest: request.userRequest } : {}),
    ...(request.requestedTheme ? { requestedTheme: request.requestedTheme } : {}),
    article: request.article,
    capabilities: request.capabilities,
    ...(request.mode === "repair"
      ? {
          previousCandidate: request.previousCandidate,
          diagnostics: request.diagnostics,
        }
      : {}),
  });
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function usageFrom(response: DeepSeekChatResponse): DeepSeekTokenUsage {
  const promptTokens = numberOrZero(response.usage?.prompt_tokens);
  const cacheHit = numberOrZero(response.usage?.prompt_cache_hit_tokens);
  const reportedMiss = response.usage?.prompt_cache_miss_tokens;
  const cacheMiss =
    typeof reportedMiss === "number" && Number.isFinite(reportedMiss)
      ? reportedMiss
      : Math.max(0, promptTokens - cacheHit);
  const completionTokens = numberOrZero(response.usage?.completion_tokens);
  return {
    promptTokens,
    promptCacheHitTokens: cacheHit,
    promptCacheMissTokens: cacheMiss,
    completionTokens,
    totalTokens: numberOrZero(response.usage?.total_tokens) || promptTokens + completionTokens,
  };
}

export class DeepSeekLayoutModelClient implements LayoutModelClient {
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof fetch;
  private readonly onCallRecord?: (record: DeepSeekCallRecord) => void;
  private readonly records: DeepSeekCallRecord[] = [];

  constructor(options: DeepSeekLayoutModelClientOptions) {
    if (!options.apiKey.trim()) throw new Error("DeepSeek API key is missing");
    this.apiKey = options.apiKey;
    this.endpoint = (options.endpoint ?? DEEPSEEK_API_ENDPOINT).replace(/\/$/u, "");
    this.model = options.model ?? DEEPSEEK_LIVE_MODEL;
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.onCallRecord = options.onCallRecord;
  }

  getCallRecords(): readonly DeepSeekCallRecord[] {
    return this.records;
  }

  private record(record: DeepSeekCallRecord): void {
    this.records.push(record);
    this.onCallRecord?.(record);
  }

  async generateLayout(request: LayoutModelRequest): Promise<unknown> {
    const sequence = this.records.length + 1;
    const startedAt = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;

    try {
      response = await this.fetchImplementation(`${this.endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(request) },
          ],
          thinking: { type: "disabled" },
          response_format: { type: "json_object" },
          max_tokens: 8192,
          temperature: 0.2,
          stream: false,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      this.record({
        sequence,
        mode: request.mode,
        endpoint: this.endpoint,
        requestedModel: this.model,
        status: timedOut ? "timeout" : "response-error",
        durationMs: Math.round(performance.now() - startedAt),
        promptTokens: 0,
        promptCacheHitTokens: 0,
        promptCacheMissTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
      throw new Error(timedOut ? "DeepSeek API request timed out" : "DeepSeek API request failed");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      this.record({
        sequence,
        mode: request.mode,
        endpoint: this.endpoint,
        requestedModel: this.model,
        status: "http-error",
        httpStatus: response.status,
        durationMs: Math.round(performance.now() - startedAt),
        promptTokens: 0,
        promptCacheHitTokens: 0,
        promptCacheMissTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
      throw new Error(`DeepSeek API request failed with HTTP ${response.status}`);
    }

    let payload: DeepSeekChatResponse;
    try {
      payload = (await response.json()) as DeepSeekChatResponse;
    } catch {
      this.record({
        sequence,
        mode: request.mode,
        endpoint: this.endpoint,
        requestedModel: this.model,
        status: "response-error",
        httpStatus: response.status,
        durationMs: Math.round(performance.now() - startedAt),
        promptTokens: 0,
        promptCacheHitTokens: 0,
        promptCacheMissTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
      throw new Error("DeepSeek API returned invalid JSON");
    }

    const usage = usageFrom(payload);
    this.record({
      sequence,
      mode: request.mode,
      endpoint: this.endpoint,
      requestedModel: this.model,
      ...(payload.model ? { responseModel: payload.model } : {}),
      status: "success",
      httpStatus: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      ...usage,
    });
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("DeepSeek API returned empty content");
    }
    return content;
  }
}
