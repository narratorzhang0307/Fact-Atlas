# FactRelay hackathon submission kit / 黑客松提交材料

> AI³ Growth Hackathon 2026 · Track 3: Gonka — AI for Society  
> Official brief / 比赛说明：<https://hackathonweekly.feishu.cn/wiki/M0pewmd0ti3z8IkVmVYcEzTWnIe>

Official submission form / 官方提交表：<https://hackathonweekly.feishu.cn/share/base/form/shrcnaF4yF8HmLhA42AH7DWlrPc>

This file contains public copy that can be pasted into the submission form. Private team information is deliberately excluded from Git.

本文件包含可直接粘贴到提交表单的公开文案。姓名、手机、邮箱与授权确认等私人信息不写入公开 GitHub 仓库。

## Submission fields / 表单字段

| Field / 字段 | Submission / 内容 |
| --- | --- |
| Project name / 项目名称 | **FactRelay** |
| Track / 赛道 | **Track 3 · Gonka — AI for Society** |
| Repository / 代码仓库 | <https://github.com/narratorzhang0307/FactRelay> |
| Running demo / 在线演示 | <https://factrelay-ai3-2026.yediqizhang37.chatgpt.site> |
| Demo video / 演示视频 | <https://github.com/narratorzhang0307/FactRelay/releases/tag/ai3-2026-submission> |
| Direct MP4 / 视频直链 | <https://github.com/narratorzhang0307/FactRelay/releases/download/ai3-2026-submission/FactRelay_Demo_2m30s_Bilingual.mp4> |
| Team members / 团队成员 | **PRIVATE — user supplies in the form / 由参赛者填写** |
| Phone / 手机 | **PRIVATE — user supplies in the form / 由参赛者填写** |
| Email / 邮箱 | **PRIVATE — user supplies in the form / 由参赛者填写** |
| Authorization consent / 授权确认 | **USER ACTION REQUIRED / 需参赛者本人确认** |

The official form has exactly ten required fields: project name, team member names, phone, email, track, public GitHub link, running demo, project/technical description, public/downloadable demo video, and authorization consent.

官方表单共有 10 个必填项：项目名、队伍成员姓名、手机号、邮箱、赛道、公开 GitHub、作品体验网址、作品介绍/技术说明、公开或可下载的视频链接、授权确认。

## One-line pitch / 一句话介绍

### Chinese

FactRelay 是一个基于 Gonka 的可追溯多模型事实核查工作台，将公开证据、对抗审查、Truth Score 与真实推理回执合并成一份可审计结论。

### English

FactRelay is a traceable multi-model fact-checking workbench on Gonka that turns public evidence, adversarial review, a deterministic Truth Score, and real inference receipts into one auditable verdict.

## Project introduction / 项目介绍

### Chinese

社交媒体与生成式 AI 让信息生成变得廉价，但也让“为什么应该相信这个结论”变得更难回答。大多数 AI 事实核查产品仍只返回一段自信的文字，用户看不到模型是否真正使用了相关来源，也看不到不同模型之间的分歧。

FactRelay 将一条文本、公开链接或截图转化为一次可追溯调查。系统首先检索当前公开证据，再通过 GonkaRouter 让 Kimi-K2.6 担任调查方，让 MiniMax-M2.7 以质疑方角色检查循环引用、时间错位、因果跳跃和遗漏背景。最终 Truth Score 由确定性代码计算，并与来源账本、双模型推理、分歧程度和原始 Gonka Request ID 一起展示。

FactRelay 不把推理回执当成“真理证明”；回执只证明哪一次 Gonka 请求生成了该分析。这种边界是产品诚信的一部分。

### English

Social media and generative AI have made information cheap to produce, but they have made one question harder to answer: why should anyone trust the verdict? Most AI fact checkers still return one confident paragraph. Users cannot see whether the cited material directly addresses the claim, whether two models independently agreed, or which inference calls produced the analysis.

FactRelay turns text, a public URL, or a screenshot into a traceable investigation. It retrieves current public evidence, sends the evidence packet to Kimi-K2.6 as the investigator, and asks MiniMax-M2.7 to act as an adversarial skeptic looking for source laundering, chronology errors, causal leaps, and omitted context. A deterministic scorer then produces the Truth Score from normalized model verdicts and source assessments. The interface keeps the evidence ledger, disagreement, execution path, and untouched upstream Gonka Request IDs visible.

FactRelay never claims that a request receipt proves a statement true. A receipt proves which Gonka request produced the analysis; factual support still comes from inspectable evidence.

## Technical description / 技术说明

### Architecture

```text
React client
  → Node input validation and SSRF guard
  → public page + Google/Bing News RSS retrieval (non-AI)
  → Kimi investigator through GonkaRouter
  → MiniMax skeptic through GonkaRouter
  → JSON normalization and source-index validation
  → deterministic Truth Score
  → evidence ledger + provenance trace
```

### Gonka compliance / Gonka 合规性

- All semantic inference is sent to `https://api.gonkarouter.io/v1/chat/completions`.
- Visual claim extraction and investigator analysis use `moonshotai/Kimi-K2.6`.
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

## 2:30 video storyboard / 2 分 30 秒视频分镜

Format: Chinese narration with concise English subtitles. Record at 1920×1080, 30 fps, H.264 MP4. Keep the browser zoom at 100% and hide unrelated tabs or personal information.

形式：中文旁白 + 精简英文字幕。1920×1080、30 fps、H.264 MP4。浏览器缩放保持 100%，不录入无关标签和个人信息。

| Time | Screen / 画面 | Chinese narration / 中文旁白 | English subtitle |
| --- | --- | --- | --- |
| 00:00–00:12 | FactRelay hero and title | “AI 事实核查不应该要求你相信另一个黑盒。FactRelay 保留证据、分歧和每一张推理回执。” | AI fact checking should not replace one black box with another. FactRelay keeps the evidence, disagreement, and receipts. |
| 00:12–00:28 | Text / URL / image tabs | “用户可以提交原始文本、公开文章链接或社交媒体截图。” | Submit text, a public URL, or a screenshot. |
| 00:28–00:43 | Run the Great Wall example | “这里我们核查‘肉眼可从月球看到长城’这条常见说法。” | We check the familiar claim that the Great Wall is visible from the Moon. |
| 00:43–01:03 | Truth Score and verdict seal | “本次实时运行给出 18 分和‘事实不符’，但这个数字不是让模型随口生成的。” | The score is deterministic, not a number invented by a model. |
| 01:03–01:25 | Evidence ledger | “每条来源都保留发布者、时间、链接、立场和可信度。模型只能引用这份编号清单。” | Every source keeps its publisher, date, URL, stance, and reliability. Models may cite only this numbered ledger. |
| 01:25–01:49 | Kimi and MiniMax cards | “Kimi 担任调查方，MiniMax 担任质疑方。它们不是重复回答同一个问题，而是承担不同责任。” | Kimi investigates. MiniMax challenges. Their responsibilities are deliberately different. |
| 01:49–02:09 | Request ID and provenance trace | “每次 Gonka 推理都展示上游 Request ID。预览模式不伪造回执；实时运行则可以按执行顺序追溯。” | Every Gonka inference exposes its upstream request ID. Preview mode never fabricates receipts. |
| 02:09–02:23 | Architecture or GitHub README | “最终评分由可测试代码计算，并对伪造来源编号、弱证据和模型分歧进行安全降级。” | Tested code calculates the score and degrades safely under weak evidence or disagreement. |
| 02:23–02:30 | Return to hero and GitHub URL | “FactRelay：质疑主张，保留回执。” | FactRelay. Question the claim. Keep the receipts. |

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
- [x] Preview is clearly labeled and contains no fabricated request IDs.
- [x] Gonka API key configured on the deployment environment.
- [x] Multiple live runs verified with real Request IDs.
- [x] Public deployed demo URL added above.
- [x] Public 2:30 demo video with Chinese narration and burned-in English subtitles added above.
- [ ] Team members, phone, and email entered directly into the private form.
- [ ] Authorization consent reviewed and confirmed by the participant.
- [x] Public demo, release page, and direct MP4 tested without GitHub authentication.
- [ ] Submit before the organizer's deadline; the published date is **2026-07-16**, but an exact cutoff time is not stated in the brief, so do not wait until the end of the day.
