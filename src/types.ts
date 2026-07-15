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

export interface RelayAgentSystem {
  mainAgent: { id: string; name: string; responsibility: string };
  subagents: Array<{ id: string; name: string; role: string }>;
  skills: Array<{ id: string; name: string; kind: string }>;
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
  agentSystem?: RelayAgentSystem;
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

export type SignalTopic = "ai" | "technology" | "finance" | "climate" | "science" | "health" | "culture" | "policy";

export interface DailySignal {
  id: string;
  sourceIndex: number;
  importance: number;
  headline: string;
  headlineZh: string;
  claim: string;
  claimZh: string;
  why: string;
  whyZh: string;
  locationHint: string;
  source: {
    title: string;
    url: string;
    publisher: string;
    publishedAt: string | null;
    origin: string;
    imageUrl: string | null;
  };
}

export interface DailySignalBrief {
  mode: "live";
  generatedAt: string;
  topic: SignalTopic;
  topicLabel: string;
  topicLabelZh: string;
  agent: string;
  calendar: {
    selectedDate: string;
    minDate: string;
    maxDate: string;
    timezone: string;
    historyDays: number;
    coverageStart: string;
    coverageEnd: string;
    coverageDays: number;
  };
  agentSystem: {
    mainAgent: { id: string; name: string; responsibility: string };
    topicAgent: { id: string; name: string; responsibility: string; skills: string[] };
    skills: Array<{ id: string; name: string; kind: string }>;
  };
  model: string;
  requestId: string | null;
  cacheHit: boolean;
  cacheLayer?: "snapshot" | "memory" | "runtime";
  snapshot?: {
    selectedDate: string;
    generatedAt: string;
    contentHash: string;
    signalCount: number;
  };
  brief: string;
  briefZh: string;
  signals: DailySignal[];
}
