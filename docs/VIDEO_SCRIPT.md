# FactRelay 2:30 demo video script / 演示视频字幕与分镜

> AI³ Growth Hackathon 2026 · Track 3: Gonka — AI for Society  
> Recording format / 录制形式：Chinese narration + English subtitles / 中文旁白 + 英文字幕

## Recording target / 录制目标

- Duration / 时长：**02:30** (acceptable submission range / 比赛要求范围：2–3 minutes)
- Canvas / 画面：**1920 × 1080**, 30 fps, H.264 MP4
- Browser / 浏览器：100% zoom, one clean tab, no personal data
- Voice / 声音：calm Chinese narration, approximately 1.0× speed
- Subtitles / 字幕：English, maximum two lines, white text with a dark translucent background
- Required proof / 必须出现：one real Gonka run, both model names, at least one public source, and non-null upstream Request IDs

## Scene script / 逐镜头脚本

### 01 · 00:00–00:12 · Open with the relay deck / 卡组开场

**Screen / 画面**  
Show the full FactRelay hero. Move the cursor to the compact arrows and flip Sources → Challenge → Proof once. Let the colored card layers remain visible.

**Chinese narration / 中文旁白**  
AI 事实核查不应该要求我们再相信另一个黑盒。FactRelay 把每次核查拆成一叠可以翻看的证据区块。

**English subtitle cues / 英文字幕**

- `00:00.000 → 00:05.800` AI fact checking should not replace one black box with another.
- `00:05.800 → 00:12.000` FactRelay turns each investigation into a navigable evidence chain.

### 02 · 00:12–00:27 · Submit any public claim / 提交主张

**Screen / 画面**  
Show the Text, Link, and Image tabs. Click each tab once, return to Text, then choose the Great Wall starter.

**Chinese narration / 中文旁白**  
用户可以提交原始文本、公开文章链接或社交媒体截图。实时运行会先提取准确主张，再检索当前公开资料。

**English subtitle cues / 英文字幕**

- `00:12.000 → 00:19.500` Submit text, a public link, or a social-media screenshot.
- `00:19.500 → 00:27.000` A live run extracts the claim, then retrieves current public evidence.

### 03 · 00:27–00:41 · Start one live case / 启动实时核查

**Screen / 画面**  
Use the claim “The Great Wall of China is visible from the Moon with the naked eye.” Click Run verification and briefly show the live progress state.

**Chinese narration / 中文旁白**  
这里核查一条常见说法：人类能从月球上肉眼看到长城。FactRelay 先收集证据，再依次调用两位 Gonka 模型。

**English subtitle cues / 英文字幕**

- `00:27.000 → 00:33.800` We test the familiar claim that the Great Wall is visible from the Moon.
- `00:33.800 → 00:41.000` FactRelay collects evidence before calling two Gonka models in sequence.

### 04 · 00:41–00:58 · Read the verdict, not just the number / 读取结论

**Screen / 画面**  
Land on Block 01. Hold on the Truth Score, verdict seal, confidence bar, and four score signals.

**Chinese narration / 中文旁白**  
结果是事实不符，并给出一项可复算的真实度评分。这个数字不是模型随口生成的，而是由可测试代码根据模型共识和来源加权证据确定计算。

**English subtitle cues / 英文字幕**

- `00:41.000 → 00:48.500` The verdict is Refuted, with a deterministic Truth Score.
- `00:48.500 → 00:58.000` The score is deterministic: model consensus plus source-weighted evidence.

### 05 · 00:58–01:16 · Inspect the evidence ledger / 检查证据账本

**Screen / 画面**  
Use the right arrow to open Block 02 Sources. Point to publisher, date, URL, stance, reliability, and source number. Open one public source in a clean background tab only if it is fast and reliable.

**Chinese narration / 中文旁白**  
每条证据都保留发布者、日期、原始链接、立场和可信度。模型只能引用这份编号清单，伪造或越界的来源编号会被拒绝。

**English subtitle cues / 英文字幕**

- `00:58.000 → 01:07.000` Every source keeps its publisher, date, URL, stance, and reliability.
- `01:07.000 → 01:16.000` Models may cite only this numbered ledger; invalid source indexes are rejected.

### 06 · 01:16–01:36 · Compare adversarial models / 比较双模型

**Screen / 画面**  
Flip to Block 03 Review. Pause on the lime Kimi investigator card and violet MiniMax skeptic card, then show their reasoning bullets and confidence values.

**Chinese narration / 中文旁白**  
Kimi-K2.6 担任调查方，先形成证据判断；MiniMax-M2.7 担任质疑方，专门寻找循环引用、时间错位、因果跳跃和遗漏背景。分歧不会被隐藏。

**English subtitle cues / 英文字幕**

- `01:16.000 → 01:25.500` Kimi-K2.6 investigates and forms the first evidence-based judgment.
- `01:25.500 → 01:36.000` MiniMax-M2.7 challenges it for source laundering, chronology errors, and missing context.

### 07 · 01:36–01:54 · Keep the real receipts / 保留真实回执

**Screen / 画面**  
Flip to Block 04 Proof. Zoom only enough for the real non-null Gonka Request IDs to be readable. Follow the execution order once.

**Chinese narration / 中文旁白**  
每次推理都保留 Gonka 上游 Request ID 和执行顺序。回执证明哪次请求生成了分析，但不冒充事实本身的证明；事实仍由可检查的证据支持。

**English subtitle cues / 英文字幕**

- `01:36.000 → 01:44.500` Every inference preserves its upstream Gonka Request ID and execution order.
- `01:44.500 → 01:54.000` A receipt proves which call produced the analysis—not whether the claim is true.

### 08 · 01:54–02:10 · Show the trust boundary / 展示可信边界

**Screen / 画面**  
Switch to the GitHub README architecture section or a prepared architecture graphic. Highlight Gonka-only inference, deterministic scoring, SSRF protection, and preview receipts being null.

**Chinese narration / 中文旁白**  
所有语义推理只通过 GonkaRouter。检索不依赖其他 AI；评分是确定性代码；链接会经过 SSRF 防护；预览数据绝不伪造真实回执。

**English subtitle cues / 英文字幕**

- `01:54.000 → 02:02.000` All semantic inference runs exclusively through GonkaRouter.
- `02:02.000 → 02:10.000` Tested scoring, SSRF guards, and null preview receipts make the boundary explicit.

### 09 · 02:10–02:24 · Return to the complete chain / 回到完整链路

**Screen / 画面**  
Return to the product. Click the four block index buttons in order: Verdict → Sources → Review → Proof. End on the full card stack.

**Chinese narration / 中文旁白**  
从结论、来源、审查到回执，每一张卡都是可翻看、可追溯的证据区块。用户看到的不只是答案，而是一条能够复核的链路。

**English subtitle cues / 英文字幕**

- `02:10.000 → 02:17.000` Verdict, Sources, Review, and Proof remain individually inspectable.
- `02:17.000 → 02:24.000` The user receives a reviewable chain—not just an answer.

### 10 · 02:24–02:30 · Close / 收尾

**Screen / 画面**  
Return to the hero. Hold on the FactRelay name, tagline, public demo URL, and GitHub URL.

**Chinese narration / 中文旁白**  
FactRelay：质疑主张，保留回执。

**English subtitle cue / 英文字幕**

- `02:24.000 → 02:30.000` FactRelay. Question the claim. Keep the receipts.

## Subtitle master / 英文字幕总表

The exact timecodes above are the subtitle master. During editing, keep each cue on screen for its full interval, use sentence case, and do not add trailing full stops to short product labels.

以上时间码即英文字幕母版。剪辑时每条字幕完整覆盖对应区间；英文使用 sentence case；短产品标签不额外添加句号。

## Pronunciation and on-screen terms / 发音与术语

- **FactRelay**: “Fact Relay” / 两个英文词自然连读
- **Gonka**: use the organizer/product pronunciation; keep “Gonka” visible on screen
- **Kimi-K2.6**: “Kimi K two point six”
- **MiniMax-M2.7**: “MiniMax M two point seven”
- **Truth Score**: retain the English UI term; Chinese narration may say “真实度评分”
- **Request ID**: retain the English UI term; Chinese narration may say“请求回执”

## Recording and privacy checklist / 录制与隐私检查

- Use a real live result; do not record only the preview fixture.
- Confirm both request IDs are non-null and readable.
- Never reveal the API key, `.env.local`, email, phone, browser password manager, or unrelated tabs.
- Do not open a source that triggers a login, paywall, cookie wall, or slow redirect during the take.
- Keep cursor motion deliberate; pause 1–2 seconds after each card transition.
- Confirm Chinese glyphs and English subtitles render correctly at 1080p.
- Export one clean MP4, then watch it once with sound and once muted.
- Test the final public/unlisted video link from a signed-out window.

## Final editor notes / 最终剪辑提示

Use cuts rather than decorative transitions. The product’s card motion already provides visual continuity. Add one quiet click sound at the first card flip only; keep background music at least 18 dB below narration or omit it. Do not speed up the live-result reveal so much that judges cannot read the score or Request IDs.

以直接切镜为主，不使用装饰性转场；产品卡片自身的翻页动作已经形成视觉连续性。仅在第一次翻卡时加入一个轻微点击音效；背景音乐至少比旁白低 18 dB，或不使用。不要把实时结果加速到评委无法读清评分与 Request ID。
