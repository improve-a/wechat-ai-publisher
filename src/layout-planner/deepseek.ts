import type { EditorialPlannerClient, EditorialPlannerRequest } from "./types";

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
  mode: EditorialPlannerRequest["mode"];
  endpoint: string;
  requestedModel: string;
  responseModel?: string;
  status: "success" | "http-error" | "timeout" | "response-error";
  httpStatus?: number;
  durationMs: number;
}

export interface DeepSeekEditorialPlannerClientOptions {
  apiKey: string;
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
  fetchImplementation?: typeof fetch;
  onCallRecord?: (record: DeepSeekCallRecord) => void;
}

/** @deprecated Use DeepSeekEditorialPlannerClientOptions. */
export type DeepSeekLayoutModelClientOptions = DeepSeekEditorialPlannerClientOptions;

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

const SYSTEM_PROMPT = `You are the Editorial Planner for a WeChat article pipeline.
Return exactly one JSON object and nothing else. Do not return markdown fences.
Plan editorial roles and asset use from ArticleAST, AssetUnderstandingMap, the user request and registered composition intents.
Never return article text, HTML, CSS, JSX, component IDs, or new semantic content. The deterministic Composition Compiler owns components and rendering.

The JSON object must have this shape:
{
  "schemaVersion": "1",
  "articleType": "registered-article-type",
  "theme": "registered-theme-id",
  "themeVariant": "registered-theme-variant",
  "hero": null,
  "sections": [{
    "id": "e-section-001", "role": "registered-section-role",
    "sourceBlockIds": ["a001"], "assetIds": [], "importance": 3,
    "compositionIntent": "registered-composition-intent", "sequence": 1
  }],
  "closing": null,
  "unusedAssets": [{"assetId": "img001", "reason": "specific editorial reason"}]
}

Hard rules:
- Consume every ArticleAST.blocks ID exactly once across hero, sections and closing. Never omit, duplicate, summarize, or reorder a source block.
- Group only contiguous sources. Use composition capabilities as intent; the compiler will enforce legal typed multi-source composition.
- Use each ArticleAST asset exactly once: either assign it to one unit or list it in unusedAssets with a concrete reason. Never silently lose an image.
- Base asset roles on AssetUnderstandingMap. Do not infer identity beyond supplied descriptions and subjects.
- A hero uses hero-visual and may combine the title, an opening paragraph and exactly one hero image. Title is metadata and must not appear in sourceBlockIds.
- Use only registered article types, section roles, themes, variants and composition intents.
- IDs must be unique and stable. sequence must preserve Article order.
- Do not create a card per Markdown block. Plan coherent editorial sections.
- For repair mode, correct every supplied diagnostic without weakening any rule.
- The response must be valid JSON.`;

const LAYOUT_GUIDANCE = `Editorial guidance:
- Use contentSignals as evidence, not as permission to change content.
- Let images lead when the understanding sidecar marks hero, portrait, evidence or closing roles.
- Use photo-pair for exactly two related images and photo-grid for three or four; do not fabricate relationships.
- Use profile-spotlight for a supplied portrait plus related person text, and achievement-spotlight for supplied result evidence.
- Keep ordinary body reading inside coherent sections. Emphasis is an editorial importance signal, not decoration.
- Preserve captions with their source image and preserve provenance. The compiler maps the accepted plan to Registry-safe Layout AST.`;

function buildUserPrompt(request: EditorialPlannerRequest): string {
  return JSON.stringify({
    task: request.mode === "initial" ? "Create a valid EditorialPlan JSON." : "Repair the EditorialPlan JSON.",
    mode: request.mode,
    ...(request.userRequest ? { userRequest: request.userRequest } : {}),
    ...(request.requestedTheme ? { requestedTheme: request.requestedTheme } : {}),
    article: request.article,
    assetUnderstanding: request.assetUnderstanding,
    capabilities: request.capabilities,
    ...(request.mode === "repair"
      ? {
          previousPlan: request.previousPlan,
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

export class DeepSeekEditorialPlannerClient implements EditorialPlannerClient {
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof fetch;
  private readonly onCallRecord?: (record: DeepSeekCallRecord) => void;
  private readonly records: DeepSeekCallRecord[] = [];

  constructor(options: DeepSeekEditorialPlannerClientOptions) {
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

  async generateEditorialPlan(request: EditorialPlannerRequest): Promise<unknown> {
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
            { role: "system", content: `${SYSTEM_PROMPT}\n\n${LAYOUT_GUIDANCE}` },
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

  /** @deprecated Use generateEditorialPlan; retained for callers migrating from the M3 seam. */
  async generateLayout(request: EditorialPlannerRequest): Promise<unknown> {
    return this.generateEditorialPlan(request);
  }
}

/** @deprecated Use DeepSeekEditorialPlannerClient. */
export { DeepSeekEditorialPlannerClient as DeepSeekLayoutModelClient };
