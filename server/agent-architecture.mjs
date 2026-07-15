export const SIGNAL_AGENT_SYSTEM = Object.freeze({
  mainAgent: Object.freeze({
    id: "signal-supervisor",
    name: "Signal Supervisor · 全球信号主理人",
    responsibility: "Route one topic and one date to the matching specialist, then preserve the handoff to FactRelay.",
  }),
  skills: Object.freeze([
    { id: "global-public-scan", name: "Global public scan · 全球公开检索", kind: "deterministic" },
    { id: "date-window", name: "Date window · 日期窗口", kind: "deterministic" },
    { id: "source-normalize", name: "Source normalization · 来源标准化", kind: "deterministic" },
    { id: "duplicate-collapse", name: "Duplicate collapse · 重复折叠", kind: "deterministic" },
    { id: "gonka-attention-funnel", name: "Gonka attention funnel · Gonka 注意力漏斗", kind: "inference" },
    { id: "relay-handoff", name: "FactRelay handoff · 核验交接", kind: "human-gated" },
  ]),
});

export const RELAY_AGENT_SYSTEM = Object.freeze({
  mainAgent: Object.freeze({
    id: "relay-supervisor",
    name: "FactRelay Supervisor · 事实核验主理人",
    responsibility: "Turn one public claim into a bounded evidence case, an adversarial review, and a replayable receipt.",
  }),
  subagents: Object.freeze([
    { id: "intake", name: "Claim Intake · 主张受理", role: "scope and normalize" },
    { id: "evidence-scout", name: "Evidence Scout · 证据侦察", role: "retrieve public evidence" },
    { id: "investigator", name: "Investigator · 调查方", role: "build the strongest evidence-grounded case" },
    { id: "skeptic", name: "Skeptic · 质疑方", role: "challenge the case and preserve disagreement" },
    { id: "judge", name: "Deterministic Judge · 确定性裁决", role: "score bounded model and source outputs" },
    { id: "receipt", name: "Receipt Keeper · 回执记录", role: "retain request IDs and timings" },
  ]),
  skills: Object.freeze([
    { id: "input-safety", name: "Input safety · 输入安全", kind: "deterministic" },
    { id: "evidence-retrieval", name: "Evidence retrieval · 证据检索", kind: "deterministic" },
    { id: "source-grounding", name: "Source grounding · 来源约束", kind: "guardrail" },
    { id: "adversarial-review", name: "Adversarial review · 对抗审查", kind: "inference" },
    { id: "truth-score", name: "Truth Score · 真实度评分", kind: "deterministic" },
    { id: "atlas-gate", name: "Atlas approval gate · 星球入库闸门", kind: "human-gated" },
  ]),
});

export function topicAgentDescriptor(topicId, topic) {
  return {
    id: `${topicId}-topic-agent`,
    name: topic.agent,
    responsibility: `Scout and rank ${topic.label} / ${topic.labelZh} signals for one selected date.`,
    skills: SIGNAL_AGENT_SYSTEM.skills.map((skill) => skill.id),
  };
}
