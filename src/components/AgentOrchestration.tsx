import { ArrowRight, Bot, CheckCircle2, Fingerprint, Search, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import type { RelayAgentSystem } from "../types";

const FALLBACK_SYSTEM: RelayAgentSystem = {
  mainAgent: {
    id: "relay-supervisor",
    name: "FactRelay Supervisor · 事实核验主理人",
    responsibility: "Route a bounded evidence case through retrieval, debate, scoring, and approval.",
  },
  subagents: [
    { id: "intake", name: "Claim Intake · 主张受理", role: "scope and normalize" },
    { id: "evidence-scout", name: "Evidence Scout · 证据侦察", role: "retrieve public evidence" },
    { id: "investigator", name: "Investigator · 调查方", role: "build an evidence-grounded case" },
    { id: "skeptic", name: "Skeptic · 质疑方", role: "challenge the case" },
    { id: "judge", name: "Deterministic Judge · 确定性裁决", role: "calculate the Truth Score" },
    { id: "receipt", name: "Receipt Keeper · 回执记录", role: "retain replayable provenance" },
  ],
  skills: [
    { id: "input-safety", name: "Input safety · 输入安全", kind: "deterministic" },
    { id: "evidence-retrieval", name: "Evidence retrieval · 证据检索", kind: "deterministic" },
    { id: "source-grounding", name: "Source grounding · 来源约束", kind: "guardrail" },
    { id: "adversarial-review", name: "Adversarial review · 对抗审查", kind: "inference" },
    { id: "truth-score", name: "Truth Score · 真实度评分", kind: "deterministic" },
    { id: "atlas-gate", name: "Atlas approval gate · 星球入库闸门", kind: "human-gated" },
  ],
};

const STAGES = [
  { agentId: "intake", skillId: "input-safety", Icon: ShieldCheck, number: "01" },
  { agentId: "evidence-scout", skillId: "evidence-retrieval", Icon: Search, number: "02" },
  { agentId: "investigator", skillId: "adversarial-review", Icon: Sparkles, number: "03" },
  { agentId: "skeptic", skillId: "source-grounding", Icon: Bot, number: "04" },
  { agentId: "judge", skillId: "truth-score", Icon: CheckCircle2, number: "05" },
  { agentId: "receipt", skillId: "atlas-gate", Icon: UserCheck, number: "06" },
] as const;

export function AgentOrchestration({ system }: { system?: RelayAgentSystem }) {
  const architecture = system ?? FALLBACK_SYSTEM;
  const subagentById = new Map(architecture.subagents.map((agent) => [agent.id, agent]));
  const skillById = new Map(architecture.skills.map((skill) => [skill.id, skill]));

  return (
    <section className="relay-agent-system" aria-label="FactRelay agent orchestration · FactRelay Agent 编排">
      <header>
        <span className="agent-system-icon"><Fingerprint size={17} /></span>
        <div>
          <small>MAIN AGENT · 主 AGENT</small>
          <strong>{architecture.mainAgent.name}</strong>
        </div>
        <span className="agent-system-badge"><Bot size={13} /> 6 subagents · 6 个子 Agent</span>
      </header>
      <div className="relay-agent-rail">
        {STAGES.map(({ agentId, skillId, Icon, number }, index) => {
          const agent = subagentById.get(agentId);
          const skill = skillById.get(skillId);
          return (
            <div className={`relay-agent-step agent-step-${number}`} key={agentId}>
              <div className="agent-step-card">
                <span className="agent-step-number">{number}</span>
                <Icon size={17} />
                <strong>{agent?.name ?? agentId}</strong>
                <small>{agent?.role}</small>
                <em>{skill?.name ?? skillId}</em>
              </div>
              {index < STAGES.length - 1 ? <ArrowRight className="agent-step-arrow" size={17} aria-hidden="true" /> : null}
            </div>
          );
        })}
      </div>
      <footer>
        <span><i /> Gonka inference · Gonka 推理</span>
        <span><i /> deterministic skills · 确定性 Skills</span>
        <span><i /> human approval before Atlas · 人工确认后入库</span>
      </footer>
    </section>
  );
}
