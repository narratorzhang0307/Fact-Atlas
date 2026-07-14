export const DEFAULT_GONKA_BASE_URL = "https://api.gonkarouter.io/v1";
export const DEFAULT_KIMI_MODEL = "moonshotai/Kimi-K2.6";
export const DEFAULT_MINIMAX_MODEL = "MiniMaxAI/MiniMax-M2.7";

export class GonkaError extends Error {
  constructor(message, { status = 502, code = "GONKA_REQUEST_FAILED", details } = {}) {
    super(message);
    this.name = "GonkaError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function getMessageText(message) {
  if (typeof message?.content === "string") return message.content;
  if (!Array.isArray(message?.content)) return "";
  return message.content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

export async function callGonka({
  apiKey,
  baseUrl = DEFAULT_GONKA_BASE_URL,
  model,
  messages,
  purpose,
  maxTokens = 2200,
  temperature = 0.15,
  signal,
}) {
  if (!apiKey) {
    throw new GonkaError("GONKA_API_KEY is not configured.", {
      status: 503,
      code: "GONKA_API_KEY_MISSING",
    });
  }

  const startedAt = new Date().toISOString();
  const started = performance.now();
  let response;

  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal,
    });
  } catch (error) {
    throw new GonkaError("Could not reach GonkaRouter.", {
      details: error instanceof Error ? error.message : String(error),
    });
  }

  const durationMs = Math.round(performance.now() - started);
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }

  if (!response.ok) {
    const providerMessage = data?.error?.message || data?.message || raw.slice(0, 400);
    throw new GonkaError(`GonkaRouter returned ${response.status}.`, {
      status: response.status === 429 ? 429 : 502,
      code: response.status === 429 ? "GONKA_RATE_LIMITED" : "GONKA_REQUEST_FAILED",
      details: providerMessage,
    });
  }

  const text = getMessageText(data?.choices?.[0]?.message);
  if (!text) {
    throw new GonkaError("GonkaRouter returned an empty model response.", {
      details: "Missing choices[0].message.content",
    });
  }

  return {
    text,
    requestId: typeof data.id === "string" ? data.id : null,
    model: typeof data.model === "string" ? data.model : model,
    usage: {
      inputTokens: Number(data?.usage?.prompt_tokens ?? data?.usage?.input_tokens ?? 0),
      outputTokens: Number(data?.usage?.completion_tokens ?? data?.usage?.output_tokens ?? 0),
    },
    trace: {
      stage: purpose,
      provider: "GonkaRouter",
      model: typeof data.model === "string" ? data.model : model,
      requestId: typeof data.id === "string" ? data.id : null,
      startedAt,
      durationMs,
      status: "complete",
    },
  };
}
