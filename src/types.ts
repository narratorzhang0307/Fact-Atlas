export type InputKind = "text" | "url" | "image";
export type Verdict = "supported" | "refuted" | "mixed" | "insufficient";
export type SourceStance = "support" | "refute" | "context";

export interface HealthStatus {
  ok: boolean;
  liveReady: boolean;
  provider: string;
  baseUrl: string;
  models: string[];
}

export interface EvidenceSource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  publisherUrl?: string;
  publishedAt: string | null;
  snippet: string;
  origin: string;
  stance: SourceStance;
  reliability: number;
  reason: string;
}

export interface EvidenceAssessment {
  sourceIndex: number;
  stance: SourceStance;
  reliability: number;
  reason: string;
}

export interface ModelVerdict {
  role: string;
  model: string;
  requestId: string | null;
  durationMs: number | null;
  usage: { inputTokens: number; outputTokens: number };
  verdict: Verdict;
  confidence: number;
  summary: string;
  reasoning: string[];
  missingEvidence: string[];
  evidenceAssessments: EvidenceAssessment[];
}

export interface TraceStep {
  stage: string;
  provider: string;
  model: string | null;
  requestId: string | null;
  startedAt: string | null;
  durationMs: number | null;
  status: "complete" | "partial" | "preview";
}

export interface VerificationResult {
  id: string;
  createdAt: string;
  mode: "live" | "preview";
  inputKind: InputKind;
  claim: string;
  verdict: Verdict;
  truthScore: number;
  confidence: number;
  summary: string;
  scoring: {
    modelConsensus: number;
    evidenceBalance: number;
    sourceCoverage: number;
    modelAgreement: number;
    formula: string;
  };
  sources: EvidenceSource[];
  models: ModelVerdict[];
  missingEvidence: string[];
  trace: TraceStep[];
}

export interface ApiError {
  error?: {
    code?: string;
    message?: string;
    details?: string;
  };
}
