import { dedupeSources, fetchUrlEvidence, searchNewsEvidence } from "./evidence.mjs";
import {
  callGonka,
  DEFAULT_GONKA_BASE_URL,
  DEFAULT_KIMI_MODEL,
  DEFAULT_MINIMAX_MODEL,
  GonkaError,
} from "./gonka.mjs";
import { normalizeModelVerdict, parseJsonObject } from "./json.mjs";
import {
  articleClaimMessages,
  imageClaimMessages,
  investigatorMessages,
  skepticMessages,
} from "./prompts.mjs";
import { calculateTruthScore } from "./scoring.mjs";

const INPUT_KINDS = new Set(["text", "url", "image"]);
const STANCE_VALUE = { support: 1, refute: -1, context: 0 };

function configFromEnv(env) {
  return {
    apiKey: env.GONKA_API_KEY,
    baseUrl: env.GONKA_BASE_URL || DEFAULT_GONKA_BASE_URL,
    kimiModel: env.KIMI_MODEL || DEFAULT_KIMI_MODEL,
    minimaxModel: env.MINIMAX_MODEL || DEFAULT_MINIMAX_MODEL,
  };
}

function validateInput(input) {
  if (!INPUT_KINDS.has(input?.kind)) throw new GonkaError("Unsupported input type.", { status: 400, code: "INVALID_INPUT" });
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (input.kind !== "image" && content.length < 8) {
    throw new GonkaError("Enter a claim or URL with at least 8 characters.", { status: 400, code: "INVALID_INPUT" });
  }
  if (content.length > 8_000) throw new GonkaError("Input is too long.", { status: 400, code: "INVALID_INPUT" });
  if (input.kind === "image") {
    if (typeof input.imageDataUrl !== "string" || !/^data:image\/(png|jpe?g|webp);base64,/i.test(input.imageDataUrl)) {
      throw new GonkaError("Upload a PNG, JPEG, or WebP image.", { status: 400, code: "INVALID_IMAGE" });
    }
    if (input.imageDataUrl.length > 7_000_000) {
      throw new GonkaError("Image must be smaller than 5 MB.", { status: 400, code: "INVALID_IMAGE" });
    }
  }
  return { kind: input.kind, content, imageDataUrl: input.imageDataUrl };
}

function extractedClaim(text) {
  const raw = parseJsonObject(text);
  if (typeof raw?.claim !== "string" || raw.claim.trim().length < 8) {
    throw new GonkaError("The model could not extract a verifiable claim.", { status: 422, code: "CLAIM_EXTRACTION_FAILED" });
  }
  return raw.claim.trim().slice(0, 1000);
}

function mergeSourceAssessment(index, verdicts) {
  const items = verdicts.flatMap((verdict) =>
    verdict.evidenceAssessments.filter((item) => item.sourceIndex === index + 1),
  );
  if (!items.length) return { stance: "context", reliability: 0, reason: "Not directly assessed by either model. · 两个模型均未直接评估此来源。" };
  const weighted = items.reduce(
    (sum, item) => sum + STANCE_VALUE[item.stance] * item.reliability / 100,
    0,
  ) / items.length;
  const stance = weighted > 0.18 ? "support" : weighted < -0.18 ? "refute" : "context";
  const reliability = Math.round(items.reduce((sum, item) => sum + item.reliability, 0) / items.length);
  const reason = [...new Set(items.map((item) => item.reason).filter(Boolean))].join(" ").slice(0, 700);
  return { stance, reliability, reason };
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 8);
}

export async function verifyClaim(
  rawInput,
  env = typeof process === "undefined" ? {} : process.env,
  runtime = {},
) {
  const input = validateInput(rawInput);
  const config = configFromEnv(env);
  if (!config.apiKey) {
    throw new GonkaError("Live verification needs a GonkaRouter API key.", {
      status: 503,
      code: "GONKA_API_KEY_MISSING",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  const trace = [];
  let submittedSource = null;
  let claim = input.content;

  try {
    if (input.kind === "url") {
      submittedSource = await fetchUrlEvidence(input.content, {
        signal: controller.signal,
        resolveHost: runtime.resolveHost,
      });
      const extraction = await callGonka({
        ...config,
        model: config.kimiModel,
        messages: articleClaimMessages(submittedSource),
        purpose: "claim-extraction",
        maxTokens: 900,
        signal: controller.signal,
      });
      trace.push(extraction.trace);
      claim = extractedClaim(extraction.text);
    } else if (input.kind === "image") {
      const extraction = await callGonka({
        ...config,
        model: config.kimiModel,
        messages: imageClaimMessages(input.imageDataUrl, input.content),
        purpose: "vision-claim-extraction",
        maxTokens: 900,
        signal: controller.signal,
      });
      trace.push(extraction.trace);
      claim = extractedClaim(extraction.text);
    }

    const retrievalStarted = performance.now();
    let newsSources = [];
    let retrievalStatus = "complete";
    try {
      newsSources = await searchNewsEvidence(claim, { limit: 6, signal: controller.signal });
    } catch {
      retrievalStatus = "partial";
    }
    const sources = dedupeSources([...(submittedSource ? [submittedSource] : []), ...newsSources]);
    trace.push({
      stage: "evidence-retrieval",
      provider: "Google News RSS + submitted page",
      model: null,
      requestId: null,
      startedAt: new Date(Date.now() - (performance.now() - retrievalStarted)).toISOString(),
      durationMs: Math.round(performance.now() - retrievalStarted),
      status: retrievalStatus,
    });

    const investigatorCall = await callGonka({
      ...config,
      model: config.kimiModel,
      messages: investigatorMessages(claim, sources),
      purpose: "investigator-analysis",
      signal: controller.signal,
    });
    trace.push(investigatorCall.trace);
    const investigator = normalizeModelVerdict(parseJsonObject(investigatorCall.text), sources.length);

    const skepticCall = await callGonka({
      ...config,
      model: config.minimaxModel,
      messages: skepticMessages(claim, sources, investigator),
      purpose: "skeptic-cross-check",
      signal: controller.signal,
    });
    trace.push(skepticCall.trace);
    const skeptic = normalizeModelVerdict(parseJsonObject(skepticCall.text), sources.length);

    const scored = calculateTruthScore([investigator, skeptic], sources.length);
    const assessedSources = sources.map((source, index) => ({
      ...source,
      articleText: undefined,
      ...mergeSourceAssessment(index, [investigator, skeptic]),
    }));

    return {
      id: `fr_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      mode: "live",
      claim,
      inputKind: input.kind,
      verdict: scored.verdict,
      truthScore: scored.truthScore,
      confidence: scored.confidence,
      summary: skeptic.summary,
      scoring: scored.breakdown,
      sources: assessedSources,
      models: [
        {
          role: "Investigator",
          model: investigatorCall.model,
          requestId: investigatorCall.requestId,
          durationMs: investigatorCall.trace.durationMs,
          usage: investigatorCall.usage,
          ...investigator,
        },
        {
          role: "Skeptic",
          model: skepticCall.model,
          requestId: skepticCall.requestId,
          durationMs: skepticCall.trace.durationMs,
          usage: skepticCall.usage,
          ...skeptic,
        },
      ],
      missingEvidence: uniqueStrings([...investigator.missingEvidence, ...skeptic.missingEvidence]),
      trace,
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new GonkaError("Verification timed out after 120 seconds.", { status: 504, code: "VERIFICATION_TIMEOUT" });
    }
    if (error instanceof GonkaError) throw error;
    throw new GonkaError("Verification could not be completed.", {
      status: 422,
      code: "VERIFICATION_FAILED",
      details: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeout);
  }
}
