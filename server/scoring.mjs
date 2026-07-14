import { clamp } from "./json.mjs";

const VERDICT_SIGNAL = {
  supported: 1,
  refuted: -1,
  mixed: 0,
  insufficient: 0,
};

const STANCE_SIGNAL = {
  support: 1,
  refute: -1,
  context: 0,
};

function roundPercent(value) {
  return Math.round(clamp(value, 0, 1) * 100);
}

export function calculateTruthScore(modelVerdicts, sourceCount) {
  if (!Array.isArray(modelVerdicts) || modelVerdicts.length < 2) {
    throw new Error("Truth Score requires at least two model verdicts.");
  }

  const modelSignals = modelVerdicts.map(
    (item) => VERDICT_SIGNAL[item.verdict] * clamp(item.confidence, 0, 100) / 100,
  );
  const modelConsensus = modelSignals.reduce((sum, value) => sum + value, 0) / modelSignals.length;

  const sourceSignals = new Map();
  for (const verdict of modelVerdicts) {
    for (const item of verdict.evidenceAssessments ?? []) {
      if (item.sourceIndex < 1 || item.sourceIndex > sourceCount) continue;
      const signal = STANCE_SIGNAL[item.stance] * clamp(item.reliability, 0, 100) / 100;
      const current = sourceSignals.get(item.sourceIndex) ?? [];
      current.push(signal);
      sourceSignals.set(item.sourceIndex, current);
    }
  }

  const perSource = [...sourceSignals.values()].map(
    (values) => values.reduce((sum, value) => sum + value, 0) / values.length,
  );
  const evidenceBalance = perSource.length
    ? perSource.reduce((sum, value) => sum + value, 0) / perSource.length
    : 0;

  const coverageTarget = Math.max(2, Math.min(sourceCount, 5));
  const sourceCoverage = sourceCount ? clamp(sourceSignals.size / coverageTarget, 0, 1) : 0;
  const disagreement = Math.abs(modelSignals[0] - modelSignals[1]) / 2;
  const modelAgreement = 1 - clamp(disagreement, 0, 1);
  const bothInsufficient = modelVerdicts.every((item) => item.verdict === "insufficient");
  const weakEvidence = sourceCount < 2 || sourceSignals.size < 2;

  const combinedSignal = 0.55 * modelConsensus + 0.45 * evidenceBalance;
  let truthScore = Math.round(50 + 50 * combinedSignal);
  if (bothInsufficient || weakEvidence) {
    truthScore = Math.round(50 + (truthScore - 50) * 0.35);
  }
  truthScore = Math.round(clamp(truthScore, 0, 100));

  const averageConfidence =
    modelVerdicts.reduce((sum, item) => sum + clamp(item.confidence, 0, 100), 0) /
    modelVerdicts.length;
  let confidence = Math.round(
    averageConfidence * (0.45 + 0.35 * modelAgreement + 0.2 * sourceCoverage),
  );
  if (bothInsufficient || weakEvidence) confidence = Math.min(confidence, 48);

  let verdict = "mixed";
  if (bothInsufficient || weakEvidence) verdict = "insufficient";
  else if (truthScore >= 68) verdict = "supported";
  else if (truthScore <= 32) verdict = "refuted";

  return {
    truthScore,
    confidence,
    verdict,
    breakdown: {
      modelConsensus: Math.round(50 + 50 * modelConsensus),
      evidenceBalance: Math.round(50 + 50 * evidenceBalance),
      sourceCoverage: roundPercent(sourceCoverage),
      modelAgreement: roundPercent(modelAgreement),
      formula: "55% model consensus + 45% source-weighted evidence; weak evidence is pulled toward 50. · 55% 模型共识 + 45% 来源加权证据；弱证据会将评分拉回 50。",
    },
  };
}
