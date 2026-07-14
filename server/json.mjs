const VERDICTS = new Set(["supported", "refuted", "mixed", "insufficient"]);
const STANCES = new Set(["support", "refute", "context"]);

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function parseJsonObject(text) {
  const trimmed = String(text ?? "").trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("Model response did not contain a JSON object.");
    return JSON.parse(unfenced.slice(start, end + 1));
  }
}

function stringArray(value, limit = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string" && item.trim())
    .slice(0, limit)
    .map((item) => item.trim());
}

export function normalizeModelVerdict(raw, sourceCount) {
  const verdict = VERDICTS.has(raw?.verdict) ? raw.verdict : "insufficient";
  const assessments = Array.isArray(raw?.evidenceAssessments)
    ? raw.evidenceAssessments
        .filter((item) => {
          const index = Number(item?.sourceIndex);
          return Number.isInteger(index) && index >= 1 && index <= sourceCount;
        })
        .slice(0, sourceCount * 2)
        .map((item) => ({
          sourceIndex: Number(item.sourceIndex),
          stance: STANCES.has(item.stance) ? item.stance : "context",
          reliability: Math.round(clamp(item.reliability, 0, 100)),
          reason: typeof item.reason === "string" ? item.reason.trim().slice(0, 500) : "",
        }))
    : [];

  return {
    verdict,
    confidence: Math.round(clamp(raw?.confidence, 0, 100)),
    summary:
      typeof raw?.summary === "string" && raw.summary.trim()
        ? raw.summary.trim().slice(0, 1200)
        : "The available evidence is not sufficient for a confident conclusion.",
    reasoning: stringArray(raw?.reasoning, 6),
    missingEvidence: stringArray(raw?.missingEvidence, 5),
    evidenceAssessments: assessments,
  };
}
