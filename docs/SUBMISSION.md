# Fact Atlas · 知识星球 hackathon submission kit / 黑客松提交材料

> AI³ Growth Hackathon 2026 · Track 3: Gonka — AI for Society  
> Official brief / 比赛说明：<https://hackathonweekly.feishu.cn/wiki/M0pewmd0ti3z8IkVmVYcEzTWnIe>

Official submission form / 官方提交表：<https://hackathonweekly.feishu.cn/share/base/form/shrcnaF4yF8HmLhA42AH7DWlrPc>

This file contains public copy that can be pasted into the submission form. Private team information is deliberately excluded from Git.

本文件包含可直接粘贴到提交表单的公开文案。姓名、手机、邮箱与授权确认等私人信息不写入公开 GitHub 仓库。

## Submission fields / 表单字段

| Field / 字段 | Submission / 内容 |
| --- | --- |
| Project name / 项目名称 | **Fact Atlas · 知识星球** |
| Track / 赛道 | **Track 3 · Gonka — AI for Society** |
| Repository / 代码仓库 | <https://github.com/narratorzhang0307/FactRelay> |
| Running demo / 在线演示 | <https://factrelay-ai3-2026.yediqizhang37.chatgpt.site> |
| Demo video / 演示视频 | <https://github.com/narratorzhang0307/FactRelay/releases/tag/ai3-2026-submission> |
| Direct MP4 / 视频直链 | <https://github.com/narratorzhang0307/FactRelay/releases/download/ai3-2026-submission/FactAtlas_Demo_2m30s_Bilingual.mp4> |
| Team members / 团队成员 | **PRIVATE — user supplies in the form / 由参赛者填写** |
| Phone / 手机 | **PRIVATE — user supplies in the form / 由参赛者填写** |
| Email / 邮箱 | **PRIVATE — user supplies in the form / 由参赛者填写** |
| Authorization consent / 授权确认 | **USER ACTION REQUIRED / 需参赛者本人确认** |

The official form has exactly ten required fields: project name, team member names, phone, email, track, public GitHub link, running demo, project/technical description, public/downloadable demo video, and authorization consent.

官方表单共有 10 个必填项：项目名、队伍成员姓名、手机号、邮箱、赛道、公开 GitHub、作品体验网址、作品介绍/技术说明、公开或可下载的视频链接、授权确认。

## One-line pitch / 一句话介绍

### Chinese

Fact Atlas 是一个基于 Gonka 的可验证个人知识地图：用户主动提交主张，或由全球主题 Agent 发现新闻；FactRelay 与 Evidence Council 负责双模型核验，只把有证据与回执的知识落位到私人星球。

### English

Fact Atlas is a verifiable personal knowledge map on Gonka. Users bring claims or discover them through global topic agents; FactRelay and Evidence Council perform traceable multi-model review before a human chooses what enters the private Atlas.

## Project introduction / 项目介绍

### Chinese

社交媒体与生成式 AI 让信息生成变得廉价，但也让“为什么应该相信这个结论”变得更难回答。大多数 AI 事实核查产品仍只返回一段自信的文字，用户看不到模型是否真正使用了相关来源，也看不到不同模型之间的分歧。

Fact Atlas 提供两条知识路径：Relay 让用户主动提交书籍、电影、聊天、新闻或社交媒体中的主张；Signals 让 AI、科技、金融、气候能源、科学、健康、城市文化与公共政策等主题 Agent 每日扫描全球公开新闻，用 Gonka 完成第一道重要性筛选。该分数不是真实度判断。

用户选中候选主张后，FactRelay 检索当前公开证据，通过 GonkaRouter 让 Kimi-K2.6 担任调查方，让 MiniMax-M2.7 以质疑方角色检查循环引用、时间错位、因果跳跃和遗漏背景。最终 Truth Score 由确定性代码计算，并与来源账本、双模型推理、分歧程度和原始 Gonka Request ID 一起展示。Evidence Council 将记录、调查、质疑和人工确认分成四个责任清晰的环节。最后，地点必须由用户确认，不能确定的内容保留在未落位轨道。

FactRelay 不把推理回执当成“真理证明”；回执只证明哪一次 Gonka 请求生成了该分析。这种边界是产品诚信的一部分。

### English

Social media and generative AI have made information cheap to produce, but they have made one question harder to answer: why should anyone trust the verdict? Most AI fact checkers still return one confident paragraph. Users cannot see whether the cited material directly addresses the claim, whether two models independently agreed, or which inference calls produced the analysis.

FactRelay turns text, a public URL, or a screenshot into a traceable investigation. It retrieves current public evidence, sends the evidence packet to Kimi-K2.6 as the investigator, and asks MiniMax-M2.7 to act as an adversarial skeptic looking for source laundering, chronology errors, causal leaps, and omitted context. A deterministic scorer then produces the Truth Score from normalized model verdicts and source assessments. The interface keeps the evidence ledger, disagreement, execution path, and untouched upstream Gonka Request IDs visible.

FactRelay never claims that a request receipt proves a statement true. A receipt proves which Gonka request produced the analysis; factual support still comes from inspectable evidence.

## Technical description / 技术说明

### Architecture

```text
React client
  → Relay: user-supplied text / URL / image
  → Signals: eight topic agents + public-news retrieval
  → Node input validation and SSRF guard
  → public page + Google/Bing News RSS retrieval (non-AI)
  → Kimi signal ranking through GonkaRouter (discovery only)
  → Kimi investigator through GonkaRouter
  → MiniMax skeptic through GonkaRouter
  → JSON normalization and source-index validation
  → deterministic Truth Score
  → Evidence Council + evidence ledger + provenance trace
  → human-confirmed place candidate from OpenStreetMap Nominatim
  → private browser-local Fact Atlas on a Mapbox dark globe
```

### Gonka compliance / Gonka 合规性

- All semantic inference is sent to `https://api.gonkarouter.io/v1/chat/completions`.
- Visual claim extraction and investigator analysis use `moonshotai/Kimi-K2.6`.
- Daily topic agents use Kimi through GonkaRouter to rank news importance and preserve a separate upstream receipt; importance is never presented as truth.
- Adversarial cross-checking uses `MiniMaxAI/MiniMax-M2.7`.
- The backend preserves the exact upstream `response.id` as `requestId`.
- Preview fixtures always use `requestId: null`; the project never fabricates realistic IDs.
- Retrieval uses public HTML and RSS, not another AI provider.
- The built-in Great Wall starter transparently adds live NASA, ESA, and Smithsonian pages to make the canonical demo resilient to news-search outages; generic claims still use the general live retrieval path.
- If a model returns malformed JSON, the same Gonka model receives one strict structured retry. The failed attempt remains visible as a partial trace step instead of being hidden.

### Truth Score / 评分公式

```text
combined signal = 55% model consensus + 45% source-weighted evidence
Truth Score      = 50 + 50 × combined signal
```

Each source is counted once, hallucinated source indexes are rejected, weak evidence pulls the score toward 50, and model disagreement lowers decision confidence.

### Safety / 安全

- Public HTTP(S) URLs only; loopback, private, link-local, and `.local` hosts are blocked.
- DNS results and redirect destinations are revalidated.
- Remote page content, source excerpts, and previous model drafts are treated as untrusted prompt data.
- Images are restricted to PNG/JPEG/WebP and approximately 5 MB.
- API keys remain server-side and are never exposed by the health route.
- The browser receives only a public Mapbox `pk.` token; Gonka credentials remain server-side.

## 2:30 video storyboard / 2 分 30 秒视频分镜

Format: Chinese narration with concise English subtitles. Record at 1920×1080, 30 fps, H.264 MP4. Keep the browser zoom at 100% and hide unrelated tabs or personal information.

形式：中文旁白 + 精简英文字幕。1920×1080、30 fps、H.264 MP4。浏览器缩放保持 100%，不录入无关标签和个人信息。

| Time | Screen / 画面 | Chinese narration / 中文旁白 | English subtitle |
| --- | --- | --- | --- |
| 00:00–00:15 | Mobile three-tab overview | “Fact Atlas 有两条知识路径：你主动探索，或让主题 Agent 替你每日发现。” | Two knowledge paths: explore actively, or let topic agents scout daily. |
| 00:15–00:35 | Signals agents and live daily brief | “八个主题 Agent 扫描全球公开新闻，用 Gonka 筛选值得关注的候选，并保留这次筛选的请求回执。” | Eight topic agents rank global public signals through Gonka and keep the ranking receipt. |
| 00:35–00:52 | Select one signal into Relay | “重要性不等于真实性。你选中一条后，它才进入 FactRelay 深度核验。” | Importance is not truth. A selected signal enters deeper FactRelay verification. |
| 00:52–01:16 | Verdict, evidence ledger, deterministic score | “FactRelay 检索证据，计算可复算的 Truth Score，并展示发布者、日期、链接、立场和可信度。” | FactRelay retrieves evidence and calculates a deterministic Truth Score. |
| 01:16–01:42 | Evidence Council | “Evidence Council 把程序分为证据记录、Kimi 调查、MiniMax 质疑和人工确认。分歧不会被隐藏。” | Clerk, investigator, skeptic, and human gate have distinct responsibilities. |
| 01:42–02:02 | Gonka receipts and trust boundary | “所有语义推理只通过 GonkaRouter。每次调用保留上游 Request ID，但回执不冒充事实证明。” | Every Gonka inference keeps its upstream request ID; receipts do not replace evidence. |
| 02:02–02:22 | Atlas placement and globe | “最后由用户确认地点并写入私人知识星球。无法确定地点时，内容留在未落位轨道，系统不伪造坐标。” | Human-confirmed facts enter the private Atlas; uncertain locations remain unplaced. |
| 02:22–02:30 | Product close | “Fact Atlas：构建你的知识世界，让每条事实都保留回执。” | Build a knowledge world. Every fact keeps receipts. |

## Recording checklist / 录制检查表

- [ ] Use one real live Gonka verification in the final video.
- [ ] Show actual non-null Gonka Request IDs long enough to read.
- [ ] Do not expose the API key, `.env.local`, browser passwords, email, or phone.
- [ ] Show at least one evidence source link and both model cards.
- [ ] Keep the total duration between 2 and 3 minutes.
- [ ] Add English subtitles and verify Chinese glyph rendering.
- [ ] Upload using a public/unlisted link that judges can open without requesting access.
- [ ] Test the video link in a signed-out/private browser window.

## Final submission checklist / 最终提交检查表

- [x] Public GitHub repository created.
- [x] README explains the product, Gonka integration, scoring, safety, and local run steps.
- [x] Source includes tests for evidence parsing, JSON normalization, and deterministic scoring.
- [x] UI supports text, URL, and image input.
- [x] Mobile-first UI includes Relay, Atlas, and live Signals tabs.
- [x] Eight topic agents rank current public news through Gonka and show the upstream ranking receipt.
- [x] Evidence Council separates clerk, investigator, skeptic, and human gate.
- [x] Atlas placement requires explicit user confirmation and never fabricates coordinates.
- [x] Atlas uses a real responsive Mapbox dark globe with bright verdict markers and explainable links.
- [x] Preview is clearly labeled and contains no fabricated request IDs.
- [x] Gonka API key configured on the deployment environment.
- [x] Multiple live runs verified with real Request IDs.
- [x] Public deployed demo URL added above.
- [x] Public 2:30 demo video with Chinese narration and burned-in English subtitles added above.
- [ ] Team members, phone, and email entered directly into the private form.
- [ ] Authorization consent reviewed and confirmed by the participant.
- [x] Public demo, release page, and direct MP4 tested without GitHub authentication.
- [ ] Submit before the organizer's deadline; the published date is **2026-07-16**, but an exact cutoff time is not stated in the brief, so do not wait until the end of the day.
