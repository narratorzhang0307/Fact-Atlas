#!/usr/bin/env python3
"""Build clean 16:9 storyboard frames aligned one-to-one with the subtitle master."""

from __future__ import annotations

import csv
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from build_demo_video import (
    BLACK,
    CYAN,
    FONT_BOLD,
    FONT_CN,
    FONT_REGULAR,
    HEIGHT,
    LIME,
    PAPER,
    PINK,
    VIOLET,
    WIDTH,
    YELLOW,
    architecture_frame,
    close_frame,
    font,
)
from build_subtitle_master import SUBTITLES


ROOT = Path(__file__).resolve().parents[1]
DELIVERY = ROOT / "FactAtlas_黑客松交付包"
SHOTS = ROOT / "FactRelay_黑客松交付包" / "03_截图"
OUT = DELIVERY / "05_逐句配图"
PRIMARY = OUT / "01_逐句画面_19张"
BONUS = OUT / "02_备用转场_4张"
GONKA = OUT / "03_Gonka核心架构_4张"


PLAN = [
    ("01_知识黑盒问题", None, "product", None, "三 Tab 产品开场与问题"),
    ("02_两条知识路径", None, "paths", None, "Relay 主动探索与 Signals 每日发现"),
    ("03_Relay三种输入", "04_实时核查进行中.png", "focus", (0.00, 0.00, 0.34, 0.62), "文本、链接、图片输入"),
    ("04_八个Signals_Agent", None, "signals", None, "八个全球主题 Agent"),
    ("05_重要性不是真实度", None, "signal_receipt", None, "Gonka 重要性排序与独立回执"),
    ("06_Signals汇入Relay", None, "handoff", None, "候选主张进入深度核验"),
    ("07_来源账本", "06_真实结果_02_来源.png", "focus", (0.20, 0.04, 0.99, 0.94), "来源、日期、立场与可信度"),
    ("08_确定性TruthScore", "05_真实结果_01_结论.png", "focus", (0.21, 0.03, 0.99, 0.91), "结论、Truth Score 与信心"),
    ("09_来源编号与分歧", "06_真实结果_02_来源.png", "focus", (0.31, 0.33, 0.99, 0.99), "越界来源被拒绝，分歧保留"),
    ("10_EvidenceCouncil四方", None, "council", None, "记录、调查、质疑与人工门"),
    ("11_Kimi调查方", "07_真实结果_03_双模型审查.png", "focus", (0.32, 0.26, 0.67, 0.99), "Kimi 调查方证据判断"),
    ("12_MiniMax质疑方", "07_真实结果_03_双模型审查.png", "focus", (0.60, 0.26, 0.94, 0.99), "MiniMax 对抗式质疑"),
    ("13_Gonka真实请求回执", "08_真实结果_04_Gonka回执.png", "focus", (0.20, 0.10, 0.99, 0.90), "Gonka Request ID 与执行顺序"),
    ("14_Gonka唯一推理边界", None, "architecture", None, "Gonka-only 推理架构与回执边界"),
    ("15_用户确认地点", None, "human_gate", None, "Nominatim 候选与人工确认"),
    ("16_Mapbox深色知识地球", None, "atlas_map", None, "深色底图、亮色节点与可解释连线"),
    ("17_未落位轨道", None, "unplaced", None, "无可靠地点时不伪造坐标"),
    ("18_私人知识谱系", None, "privacy", None, "浏览器本地完整证据快照"),
    ("19_FactAtlas品牌收尾", None, "close", None, "项目名、在线 Demo 与 GitHub"),
]


def full(source: Path) -> Image.Image:
    return Image.open(source).convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def focus(source: Path, box: tuple[float, float, float, float], accent: str) -> Image.Image:
    image = Image.open(source).convert("RGB")
    blurred = image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(20))
    shade = Image.new("RGBA", (WIDTH, HEIGHT), (7, 8, 6, 125))
    background = Image.alpha_composite(blurred.convert("RGBA"), shade).convert("RGB")
    width, height = image.size
    crop = image.crop((int(width * box[0]), int(height * box[1]), int(width * box[2]), int(height * box[3])))
    crop.thumbnail((1720, 940), Image.Resampling.LANCZOS)
    x = (WIDTH - crop.width) // 2
    y = (HEIGHT - crop.height) // 2
    draw = ImageDraw.Draw(background)
    draw.rounded_rectangle((x - 16, y - 16, x + crop.width + 16, y + crop.height + 16), radius=28, fill=accent)
    draw.rounded_rectangle((x - 6, y - 6, x + crop.width + 6, y + crop.height + 6), radius=22, fill="#171815")
    background.paste(crop, (x, y))
    return background


def base_frame(kicker: str, title: str, chinese: str, dark: bool = False) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    background = BLACK if dark else PAPER
    image = Image.new("RGB", (WIDTH, HEIGHT), background)
    draw = ImageDraw.Draw(image)
    draw.text((76, 54), kicker, font=font(FONT_BOLD, 27), fill=LIME if dark else VIOLET)
    draw.text((76, 112), title, font=font(FONT_BOLD, 58), fill=PAPER if dark else BLACK)
    draw.text((78, 191), chinese, font=font(FONT_CN, 34), fill="#d5d7d1" if dark else "#555750")
    return image, draw


def ui_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, accent: str, label: str, title: str, body: str) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle((x1 + 12, y1 + 12, x2 + 12, y2 + 12), radius=31, fill=accent)
    draw.rounded_rectangle(box, radius=31, fill=fill, outline=BLACK, width=4)
    draw.text((x1 + 28, y1 + 28), label, font=font(FONT_BOLD, 20), fill=VIOLET)
    draw.text((x1 + 28, y1 + 86), title, font=font(FONT_BOLD, 29), fill=BLACK)
    draw.multiline_text((x1 + 28, y1 + 150), body, font=font(FONT_CN, 21), fill="#3f413c", spacing=11)


def product_frame() -> Image.Image:
    image, draw = base_frame("FACT ATLAS · THREE-TAB KNOWLEDGE SYSTEM", "Knowledge should remember why.", "个人知识库不应该把未经验证的说法静默地变成事实。", True)
    draw.rounded_rectangle((140, 300, 1780, 930), radius=54, fill="#f8f7f2", outline="#11120f", width=5)
    draw.rounded_rectangle((164, 324, 1756, 820), radius=42, fill="#11120f")
    draw.text((220, 382), "Build a knowledge world.", font=font(FONT_BOLD, 76), fill=PAPER)
    draw.text((220, 482), "Every fact keeps receipts.", font=font(FONT_BOLD, 76), fill=LIME)
    draw.text((224, 612), "构建你的知识世界，让每条事实都保留回执。", font=font(FONT_CN, 38), fill="#d5d7d1")
    tabs = [("RELAY", "探索", LIME), ("ATLAS", "星图", VIOLET), ("SIGNALS", "发现", CYAN)]
    for index, (name, chinese, accent) in enumerate(tabs):
        x1 = 220 + index * 500
        draw.rounded_rectangle((x1, 744, x1 + 390, 862), radius=30, fill=accent, outline=BLACK, width=3)
        draw.text((x1 + 28, 772), name, font=font(FONT_BOLD, 25), fill=BLACK)
        draw.text((x1 + 28, 815), chinese, font=font(FONT_CN, 22), fill=BLACK)
    return image


def paths_frame() -> Image.Image:
    image, draw = base_frame("TWO PATHS · ONE PRIVATE ATLAS", "Explore actively. Discover daily.", "主动带来一条主张，或让主题 Agent 替你每日发现；两条路径最终汇入同一张知识星图。")
    ui_card(draw, (90, 340, 650, 790), LIME, BLACK, "01 · RELAY", "Active exploration", "书籍 · 新闻 · 截图\n文本 · 公开链接\n\n你主动提出待核验主张")
    ui_card(draw, (1270, 340, 1830, 790), CYAN, VIOLET, "03 · SIGNALS", "Daily discovery", "AI · 科技 · 金融\n气候 · 科学 · 健康\n\nAgent 扫描全球公开信号")
    ui_card(draw, (700, 420, 1220, 850), PAPER, VIOLET, "02 · ATLAS", "Verified knowledge planet", "双模型核验\n确定性 Truth Score\n用户确认落位\n\n完整证据快照")
    for x1, x2 in ((650, 700), (1270, 1220)):
        draw.line((x1, 610, x2, 610), fill=BLACK, width=7)
        tip = x2 if x2 > x1 else x2
        direction = 1 if x2 > x1 else -1
        draw.polygon([(tip, 610), (tip - direction * 22, 594), (tip - direction * 22, 626)], fill=BLACK)
    return image


def signals_frame() -> Image.Image:
    image, draw = base_frame("SIGNALS · EIGHT GLOBAL SCOUTS", "A daily brief, not an infinite feed.", "八个主题 Agent 扫描公开新闻，把广阔信息流压缩成可核验的候选主张。", True)
    topics = [("AI", "人工智能"), ("TECH", "科技"), ("FINANCE", "金融"), ("CLIMATE", "气候能源"), ("SCIENCE", "科学"), ("HEALTH", "健康生物"), ("CITIES", "城市文化"), ("POLICY", "公共政策")]
    colors = [LIME, CYAN, YELLOW, PINK, VIOLET, LIME, CYAN, YELLOW]
    for index, ((name, chinese), accent) in enumerate(zip(topics, colors)):
        row, col = divmod(index, 4)
        x1, y1 = 78 + col * 454, 315 + row * 300
        draw.rounded_rectangle((x1 + 10, y1 + 10, x1 + 410, y1 + 245), radius=29, fill=accent)
        draw.rounded_rectangle((x1, y1, x1 + 400, y1 + 235), radius=29, fill=PAPER, outline=BLACK, width=4)
        draw.rounded_rectangle((x1 + 22, y1 + 22, x1 + 86, y1 + 64), radius=20, fill=accent, outline=BLACK, width=2)
        draw.text((x1 + 42, y1 + 31), f"{index + 1:02d}", font=font(FONT_BOLD, 16), fill=BLACK)
        draw.text((x1 + 22, y1 + 92), name, font=font(FONT_BOLD, 29), fill=BLACK)
        draw.text((x1 + 22, y1 + 139), chinese, font=font(FONT_CN, 24), fill="#464842")
        draw.text((x1 + 22, y1 + 192), "DAILY · PUBLIC NEWS", font=font(FONT_BOLD, 14), fill=VIOLET)
    return image


def signal_receipt_frame() -> Image.Image:
    image, draw = base_frame("SIGNALS · GONKA RANKING RECEIPT", "Importance is a queue—not a verdict.", "第一道 Gonka 筛选只判断值得关注的程度；它保留回执，但绝不冒充 Truth Score。")
    ui_card(draw, (90, 345, 600, 820), PAPER, YELLOW, "01 · PUBLIC RSS", "Current signals", "5 条公开新闻\n标题 · 出版者 · 日期\n原始链接可打开")
    ui_card(draw, (705, 345, 1215, 820), LIME, VIOLET, "02 · GONKA KIMI", "Rank importance", "为什么值得关注\n双语可核查主张\nRequest ID 原样保留")
    ui_card(draw, (1320, 345, 1830, 820), PINK, BLACK, "03 · HUMAN QUEUE", "Choose what to verify", "92 · 84 · 78\nIMPORTANCE ONLY\n\n重要性 ≠ 真实度")
    for x1, x2 in ((600, 705), (1215, 1320)):
        draw.line((x1 + 18, 585, x2 - 20, 585), fill=BLACK, width=7)
        draw.polygon([(x2 - 22, 569), (x2 - 22, 601), (x2, 585)], fill=BLACK)
    draw.rounded_rectangle((220, 880, 1700, 960), radius=24, fill=BLACK)
    draw.text((270, 903), "GONKA REQUEST ID PRESENT", font=font(FONT_BOLD, 23), fill=LIME)
    draw.text((720, 900), "回执证明排序来自哪次请求，不证明新闻为真", font=font(FONT_CN, 22), fill=PAPER)
    return image


def handoff_frame() -> Image.Image:
    image, draw = base_frame("USER-CONTROLLED HANDOFF", "A signal becomes a claim only when you choose it.", "候选新闻不会自动写入知识星球；用户选中后，它才进入深度核验。", True)
    steps = [("01", "SIGNALS", "每日候选", CYAN), ("02", "DEEP VERIFY", "用户选择", LIME), ("03", "FACTRELAY", "取证与交叉验证", YELLOW), ("04", "COUNCIL", "对抗审理", VIOLET), ("05", "ATLAS", "人工确认落位", PINK)]
    for index, (number, title, chinese, accent) in enumerate(steps):
        x1 = 70 + index * 360
        ui_card(draw, (x1, 370, x1 + 300, 760), PAPER, accent, number, title, chinese + "\n\n每一步都可检查")
        if index < len(steps) - 1:
            draw.line((x1 + 310, 570, x1 + 345, 570), fill=LIME, width=7)
            draw.polygon([(x1 + 342, 555), (x1 + 342, 585), (x1 + 360, 570)], fill=LIME)
    return image


def council_frame() -> Image.Image:
    image, draw = base_frame("EVIDENCE COUNCIL · FOUR DISTINCT ROLES", "Agreement is measured. Dissent is preserved.", "不是让几个模型重复回答，而是让记录、调查、质疑和人工确认各自承担责任。")
    roles = [("01", "CLERK", "整理证据账本", YELLOW), ("02", "KIMI", "调查方", LIME), ("03", "MINIMAX", "质疑方", VIOLET), ("04", "HUMAN GATE", "用户最终确认", PINK)]
    for index, (number, title, chinese, accent) in enumerate(roles):
        x1 = 78 + index * 452
        ui_card(draw, (x1, 345, x1 + 400, 800), PAPER, accent, number, title, chinese + "\n\n输入、输出与边界\n都在界面中可见")
    return image


def human_gate_frame() -> Image.Image:
    image, draw = base_frame("HUMAN-CONFIRMED PLACEMENT", "A geocoder proposes. The user decides.", "地理编码只返回候选地点，系统不会替用户选择“正确坐标”。")
    ui_card(draw, (90, 340, 760, 835), PINK, BLACK, "VERIFIED CASE", "Truth Score 09 / 100", "The Great Wall is visible\nfrom the Moon.\n\nREFUTED · 事实不符")
    draw.line((790, 585, 920, 585), fill=BLACK, width=8)
    draw.polygon([(910, 568), (910, 602), (936, 585)], fill=BLACK)
    draw.rounded_rectangle((950, 320, 1810, 880), radius=34, fill=PAPER, outline=BLACK, width=4)
    draw.text((995, 360), "PLACE CANDIDATES · 地点候选", font=font(FONT_BOLD, 24), fill=VIOLET)
    candidates = [("A", "Great Wall · China", "39.7171, 111.9606", LIME), ("B", "Great Wall · China", "39.4855, 111.8831", CYAN), ("C", "KEEP UNPLACED", "保留在未落位轨道", YELLOW)]
    for index, (letter, label, coords, accent) in enumerate(candidates):
        y1 = 430 + index * 135
        draw.rounded_rectangle((995, y1, 1765, y1 + 105), radius=23, fill=accent if index == 0 else "#ffffff", outline=BLACK, width=3)
        draw.rounded_rectangle((1015, y1 + 22, 1073, y1 + 80), radius=18, fill=BLACK)
        draw.text((1034, y1 + 34), letter, font=font(FONT_BOLD, 19), fill=PAPER)
        draw.text((1100, y1 + 20), label, font=font(FONT_BOLD, 23), fill=BLACK)
        draw.text((1100, y1 + 61), coords, font=font(FONT_CN, 18), fill="#4c4e48")
        if index == 0:
            draw.text((1698, y1 + 31), "✓", font=font(FONT_BOLD, 29), fill=BLACK)
    return image


def atlas_map_frame() -> Image.Image:
    image, draw = base_frame("MAPBOX DARK GLOBE · PRIVATE FACT ATLAS", "Dark geography. Bright verified facts.", "深色底图让地理退到背景，亮色事实节点、Truth Score 与可解释连线成为主角。", True)
    cx, cy, radius = 960, 625, 320
    draw.ellipse((cx - radius + 18, cy - radius + 18, cx + radius + 18, cy + radius + 18), fill=VIOLET)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill="#181b19", outline=PAPER, width=4)
    for offset in (-180, -90, 0, 90, 180):
        width = int((radius**2 - offset**2) ** 0.5) if abs(offset) < radius else 0
        draw.ellipse((cx - width, cy + offset - 13, cx + width, cy + offset + 13), outline="#485049", width=2)
    for inset in (80, 160, 240):
        draw.ellipse((cx - inset, cy - radius, cx + inset, cy + radius), outline="#3c443e", width=2)
    nodes = [(765, 500, PINK, "09"), (1055, 435, LIME, "82"), (1140, 690, CYAN, "74"), (840, 770, YELLOW, "56")]
    for x, y, accent, score in nodes:
        draw.line((cx, cy, x, y), fill="#657068", width=3)
        draw.rounded_rectangle((x - 32, y - 38, x + 32, y + 34), radius=20, fill=accent, outline=BLACK, width=3)
        draw.text((x - 20, y - 16), score, font=font(FONT_BOLD, 19), fill=BLACK)
    draw.rounded_rectangle((1370, 360, 1795, 770), radius=32, fill=PAPER, outline=BLACK, width=4)
    draw.text((1410, 402), "SELECTED FACT", font=font(FONT_BOLD, 21), fill=VIOLET)
    draw.text((1410, 470), "09 / 100", font=font(FONT_BOLD, 55), fill=BLACK)
    draw.multiline_text((1410, 565), "Great Wall\n事实不符\n\n5 sources\n2 Gonka receipts", font=font(FONT_CN, 24), fill="#41443f", spacing=12)
    draw.rounded_rectangle((125, 830, 620, 910), radius=23, fill=LIME, outline=BLACK, width=3)
    draw.text((166, 855), "MAPBOX · USER-CONFIRMED", font=font(FONT_BOLD, 21), fill=BLACK)
    return image


def unplaced_frame() -> Image.Image:
    image, draw = base_frame("HONEST UNCERTAINTY · UNPLACED ORBIT", "No reliable place? Do not invent one.", "无法确定地理语义时，事实仍可保存，但会明确留在未落位轨道。", True)
    cx, cy, radius = 960, 620, 255
    draw.ellipse((cx - 390, cy - 390, cx + 390, cy + 390), outline="#556056", width=3)
    draw.ellipse((cx - 330, cy - 330, cx + 330, cy + 330), outline=VIOLET, width=4)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill="#171a18", outline=PAPER, width=4)
    for x, y, score, accent in ((590, 420, "?", YELLOW), (1330, 415, "41", CYAN), (1370, 780, "?", PINK), (555, 800, "63", LIME)):
        draw.ellipse((x - 42, y - 42, x + 42, y + 42), fill=accent, outline=BLACK, width=4)
        draw.text((x - 14, y - 18), score, font=font(FONT_BOLD, 25), fill=BLACK)
    draw.rounded_rectangle((660, 510, 1260, 735), radius=34, fill="#0d0e0bcc", outline="#586159", width=3)
    draw.text((720, 555), "NO FABRICATED COORDINATES", font=font(FONT_BOLD, 26), fill=LIME)
    draw.text((720, 615), "不伪造坐标", font=font(FONT_CN, 34), fill=PAPER)
    draw.text((720, 675), "Save unplaced · 暂不落位", font=font(FONT_CN, 23), fill="#b9bcb5")
    return image


def privacy_frame() -> Image.Image:
    image, draw = base_frame("BROWSER-LOCAL KNOWLEDGE LINEAGE", "Your evidence snapshot stays with you.", "黑客松版不上传私人星图历史；完整结论、来源、模型推理与回执只留在当前浏览器。")
    draw.rounded_rectangle((110, 310, 1810, 900), radius=46, fill="#11120f", outline=BLACK, width=4)
    draw.rounded_rectangle((140, 345, 1780, 840), radius=34, fill=PAPER)
    draw.ellipse((178, 375, 200, 397), fill=PINK)
    draw.ellipse((212, 375, 234, 397), fill=YELLOW)
    draw.ellipse((246, 375, 268, 397), fill=LIME)
    draw.rounded_rectangle((320, 366, 1510, 410), radius=20, fill="#ecebe6")
    draw.text((700, 378), "LOCAL://FACT-ATLAS", font=font(FONT_BOLD, 15), fill="#5a5c56")
    facts = [("CLAIM", "原始主张", LIME), ("EVIDENCE", "来源账本", YELLOW), ("REVIEW", "双模型分歧", VIOLET), ("RECEIPTS", "Gonka 回执", CYAN)]
    for index, (label, chinese, accent) in enumerate(facts):
        x1 = 190 + index * 390
        draw.rounded_rectangle((x1 + 9, 500 + 9, x1 + 315 + 9, 730 + 9), radius=27, fill=accent)
        draw.rounded_rectangle((x1, 500, x1 + 315, 730), radius=27, fill="#ffffff", outline=BLACK, width=3)
        draw.text((x1 + 24, 538), label, font=font(FONT_BOLD, 22), fill=VIOLET)
        draw.text((x1 + 24, 594), chinese, font=font(FONT_CN, 22), fill=BLACK)
        draw.text((x1 + 24, 660), "SNAPSHOT ✓", font=font(FONT_BOLD, 17), fill="#555750")
        if index < len(facts) - 1:
            draw.line((x1 + 325, 615, x1 + 368, 615), fill=BLACK, width=6)
            draw.polygon([(x1 + 365, 602), (x1 + 365, 628), (x1 + 384, 615)], fill=BLACK)
    draw.rounded_rectangle((1375, 760, 1715, 815), radius=22, fill=LIME, outline=BLACK, width=2)
    draw.text((1430, 774), "LOCAL ONLY · 仅本地", font=font(FONT_CN, 18), fill=BLACK)
    return image


def safety_frame() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)
    draw.text((88, 70), "FACT ATLAS · EXPLICIT TRUST BOUNDARY", font=font(FONT_BOLD, 26), fill=VIOLET)
    draw.text((88, 122), "What the system proves—and what it never claims.", font=font(FONT_BOLD, 58), fill=BLACK)
    draw.text((90, 203), "系统证明什么，也明确说明它不证明什么。", font=font(FONT_CN, 36), fill="#50524d")

    cards = [
        (LIME, "TESTED SCORE", "可测试评分", "Truth Score 由代码计算\n不让模型随口给分"),
        (CYAN, "SSRF GUARD", "链接安全防护", "拒绝本机、内网与\n危险重定向地址"),
        (YELLOW, "NULL PREVIEW", "预览回执为空", "预览模式不伪造\nGonka Request ID"),
        (PINK, "RECEIPT ≠ TRUTH", "回执不等于真相", "回执证明调用来源\n事实仍由证据支持"),
    ]
    for index, (fill, title, chinese, body) in enumerate(cards):
        x1 = 88 + index * 448
        x2 = x1 + 396
        draw.rounded_rectangle((x1 + 12, 340 + 12, x2 + 12, 760 + 12), radius=34, fill=VIOLET)
        draw.rounded_rectangle((x1, 340, x2, 760), radius=34, fill=fill, outline=BLACK, width=4)
        draw.text((x1 + 30, 382), f"0{index + 1}", font=font(FONT_BOLD, 22), fill=BLACK)
        draw.text((x1 + 30, 442), title, font=font(FONT_BOLD, 28), fill=BLACK)
        draw.text((x1 + 30, 500), chinese, font=font(FONT_CN, 25), fill="#41433e")
        draw.multiline_text((x1 + 30, 585), body, font=font(FONT_CN, 23), fill=BLACK, spacing=14)
    footer_en = "SAFE FAILURE     /     NO FABRICATED RECEIPTS"
    draw.text((90, 930), footer_en, font=font(FONT_BOLD, 25), fill=VIOLET)
    footer_width = draw.textbbox((0, 0), footer_en, font=font(FONT_BOLD, 25))[2]
    draw.text((110 + footer_width, 927), "可解释失败 / 不伪造回执", font=font(FONT_CN, 23), fill=VIOLET)
    return image


def mosaic_frame() -> Image.Image:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), BLACK)
    draw = ImageDraw.Draw(canvas)
    title_en = "FOUR INSPECTABLE BLOCKS"
    draw.text((70, 45), title_en, font=font(FONT_BOLD, 28), fill=LIME)
    title_width = draw.textbbox((0, 0), title_en, font=font(FONT_BOLD, 28))[2]
    draw.text((90 + title_width, 43), "· 四张可检查证据卡", font=font(FONT_CN, 25), fill=LIME)
    sources = [
        ("05_真实结果_01_结论.png", "01  VERDICT", "结论", PINK),
        ("06_真实结果_02_来源.png", "02  SOURCES", "来源", YELLOW),
        ("07_真实结果_03_双模型审查.png", "03  REVIEW", "审查", VIOLET),
        ("08_真实结果_04_Gonka回执.png", "04  PROOF", "回执", CYAN),
    ]
    positions = [(70, 115), (980, 115), (70, 585), (980, 585)]
    for (filename, label, chinese, accent), (x, y) in zip(sources, positions):
        shot = Image.open(SHOTS / filename).convert("RGB").resize((850, 478), Image.Resampling.LANCZOS)
        shot = shot.crop((0, 0, 850, 390))
        draw.rounded_rectangle((x + 10, y + 10, x + 870, y + 430), radius=24, fill=accent)
        canvas.paste(shot, (x, y))
        draw.rectangle((x, y + 390, x + 850, y + 430), fill=accent)
        draw.text((x + 22, y + 397), label, font=font(FONT_BOLD, 21), fill=BLACK)
        label_width = draw.textbbox((0, 0), label, font=font(FONT_BOLD, 21))[2]
        draw.text((x + 34 + label_width, y + 395), "· " + chinese, font=font(FONT_CN, 19), fill=BLACK)
    return canvas


def chain_frame() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BLACK)
    draw = ImageDraw.Draw(image)
    draw.text((76, 60), "ONE CLAIM IN. A REVIEWABLE CHAIN OUT.", font=font(FONT_BOLD, 58), fill=PAPER)
    draw.text((78, 145), "输入一条主张，输出一条能够复核的证据链。", font=font(FONT_CN, 38), fill=LIME)
    steps = [
        ("01", "CLAIM", "主张", LIME),
        ("02", "EVIDENCE", "证据", YELLOW),
        ("03", "KIMI", "调查", CYAN),
        ("04", "MINIMAX", "质疑", VIOLET),
        ("05", "VERDICT", "结论", PINK),
        ("06", "RECEIPTS", "回执", LIME),
    ]
    for index, (number, title, chinese, accent) in enumerate(steps):
        x1 = 70 + index * 304
        x2 = x1 + 244
        draw.rounded_rectangle((x1 + 12, 355 + 12, x2 + 12, 710 + 12), radius=30, fill=accent)
        draw.rounded_rectangle((x1, 355, x2, 710), radius=30, fill=PAPER, outline=BLACK, width=4)
        draw.rounded_rectangle((x1 + 24, 380, x1 + 84, 424), radius=20, fill=accent)
        draw.text((x1 + 40, 388), number, font=font(FONT_BOLD, 18), fill=BLACK)
        draw.text((x1 + 24, 490), title, font=font(FONT_BOLD, 24), fill=BLACK)
        draw.text((x1 + 24, 552), chinese, font=font(FONT_CN, 31), fill="#464842")
        if index < len(steps) - 1:
            draw.line((x2 + 18, 530, x2 + 54, 530), fill=LIME, width=7)
            draw.polygon([(x2 + 50, 516), (x2 + 50, 544), (x2 + 72, 530)], fill=LIME)
    draw.rounded_rectangle((70, 830, 1850, 950), radius=28, fill="#171815", outline="#3f413b", width=3)
    draw.text((110, 867), "PUBLIC EVIDENCE  +  TWO DISTINCT MODEL ROLES  +  UNTOUCHED REQUEST IDs", font=font(FONT_BOLD, 27), fill=CYAN)
    return image


def gonka_router_frame() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BLACK)
    draw = ImageDraw.Draw(image)
    draw.text((72, 55), "GONKA ROUTER · MANDATORY INFERENCE PATH", font=font(FONT_BOLD, 28), fill=LIME)
    draw.text((72, 112), "Every AI decision crosses one visible boundary.", font=font(FONT_BOLD, 62), fill=PAPER)
    draw.text((74, 195), "所有 AI 推理与信息验证，都经过同一条可见边界。", font=font(FONT_CN, 36), fill="#d7d8d2")

    blocks = [
        (70, 385, 370, 675, PAPER, LIME, "INPUT", "输入", "Text · URL · image"),
        (430, 385, 730, 675, PAPER, YELLOW, "LIVE DATA", "实时数据", "HTML · Google/Bing RSS"),
        (800, 330, 1260, 730, LIME, VIOLET, "GONKA ROUTER", "Gonka 推理入口", "api.gonkarouter.io/v1\n/chat/completions"),
        (1330, 290, 1660, 505, PAPER, CYAN, "KIMI-K2.6", "调查方", "Evidence investigation"),
        (1330, 555, 1660, 770, PAPER, VIOLET, "MINIMAX-M2.7", "质疑方", "Adversarial review"),
        (1720, 385, 1860, 675, PAPER, PINK, "OUTPUT", "输出", "Score\nTrace\nIDs"),
    ]
    for x1, y1, x2, y2, fill, accent, title, chinese, body in blocks:
        draw.rounded_rectangle((x1 + 10, y1 + 10, x2 + 10, y2 + 10), radius=28, fill=accent)
        draw.rounded_rectangle((x1, y1, x2, y2), radius=28, fill=fill, outline="#171815", width=4)
        draw.text((x1 + 24, y1 + 36), title, font=font(FONT_BOLD, 25 if x2 - x1 > 180 else 18), fill=BLACK)
        draw.text((x1 + 24, y1 + 88), chinese, font=font(FONT_CN, 24 if x2 - x1 > 180 else 19), fill="#454741")
        draw.multiline_text((x1 + 24, y1 + 160), body, font=font(FONT_REGULAR, 19), fill=BLACK, spacing=8)
    arrows = [(370, 530, 430), (730, 530, 800), (1260, 420, 1330), (1260, 650, 1330), (1660, 420, 1720), (1660, 650, 1720)]
    for x1, y, x2 in arrows:
        draw.line((x1 + 10, y, x2 - 18, y), fill=LIME, width=7)
        draw.polygon([(x2 - 23, y - 13), (x2 - 23, y + 13), (x2 - 3, y)], fill=LIME)
    draw.rounded_rectangle((70, 855, 1860, 960), radius=26, fill="#181915", outline="#41423d", width=3)
    draw.text((105, 887), "NON-AI RETRIEVAL", font=font(FONT_BOLD, 23), fill=YELLOW)
    draw.text((345, 884), "检索层不调用其他 AI", font=font(FONT_CN, 22), fill=YELLOW)
    draw.text((760, 887), "ALL SEMANTIC INFERENCE", font=font(FONT_BOLD, 23), fill=CYAN)
    draw.text((1080, 884), "全部语义推理进入 Gonka", font=font(FONT_CN, 22), fill=CYAN)
    return image


def gonka_sequence_frame() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)
    draw.text((76, 60), "GONKA EXECUTION SEQUENCE", font=font(FONT_BOLD, 28), fill=VIOLET)
    draw.text((76, 116), "Two models. Distinct responsibilities. Preserved receipts.", font=font(FONT_BOLD, 57), fill=BLACK)
    draw.text((78, 194), "双模型分工，而不是重复回答；每次调用都保留真实回执。", font=font(FONT_CN, 35), fill="#555750")
    steps = [
        ("01", "RETRIEVE", "检索实时证据", YELLOW, "No AI call"),
        ("02", "KIMI", "形成调查判断", CYAN, "Gonka Request ID #1"),
        ("03", "MINIMAX", "执行对抗审查", VIOLET, "Gonka Request ID #2"),
        ("04", "VALIDATE", "拒绝越界来源", LIME, "Source indexes checked"),
        ("05", "SCORE", "确定性计算评分", PINK, "55% models + 45% evidence"),
    ]
    for index, (number, title, chinese, accent, detail) in enumerate(steps):
        x1 = 72 + index * 360
        x2 = x1 + 306
        draw.rounded_rectangle((x1 + 12, 360 + 12, x2 + 12, 735 + 12), radius=32, fill=VIOLET)
        draw.rounded_rectangle((x1, 360, x2, 735), radius=32, fill=accent, outline=BLACK, width=4)
        draw.rounded_rectangle((x1 + 24, 385, x1 + 88, 432), radius=20, fill=PAPER, outline=BLACK, width=2)
        draw.text((x1 + 43, 394), number, font=font(FONT_BOLD, 19), fill=BLACK)
        draw.text((x1 + 26, 485), title, font=font(FONT_BOLD, 28), fill=BLACK)
        draw.text((x1 + 26, 544), chinese, font=font(FONT_CN, 25), fill="#3f413c")
        draw.multiline_text((x1 + 26, 635), detail, font=font(FONT_REGULAR, 18), fill=BLACK, spacing=7)
        if index < len(steps) - 1:
            draw.line((x2 + 14, 550, x2 + 48, 550), fill=BLACK, width=6)
            draw.polygon([(x2 + 45, 537), (x2 + 45, 563), (x2 + 66, 550)], fill=BLACK)
    draw.rounded_rectangle((72, 845, 1848, 960), radius=26, fill=BLACK)
    draw.text((110, 882), "FAILED CALLS REMAIN PARTIAL IN THE TRACE", font=font(FONT_BOLD, 24), fill=LIME)
    draw.text((750, 879), "失败调用保留在轨迹中，不被隐藏", font=font(FONT_CN, 23), fill=LIME)
    return image


def gonka_requirements_frame() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)
    draw.text((76, 52), "TRACK 3 REQUIREMENTS · IMPLEMENTATION MAP", font=font(FONT_BOLD, 28), fill=VIOLET)
    draw.text((76, 107), "What the brief requires. What Fact Atlas ships.", font=font(FONT_BOLD, 60), fill=BLACK)
    draw.text((78, 188), "赛道三要求什么，Fact Atlas 就展示什么。", font=font(FONT_CN, 36), fill="#53554f")
    rows = [
        ("MANDATORY ROUTER", "所有 AI 推理经 gonkarouter.io", "api.gonkarouter.io/v1/chat/completions", LIME),
        ("MULTI-MODEL", "至少两款模型交叉核验", "Kimi-K2.6 × MiniMax-M2.7", CYAN),
        ("INPUT + LIVE DATA", "链接、文本、图片与实时数据", "Text · URL · image + HTML/RSS", YELLOW),
        ("TRACEABLE OUTPUT", "0–100 Score、轨迹与 Request ID", "Truth Score + ledger + untouched IDs", PINK),
    ]
    for index, (requirement, chinese, shipped, accent) in enumerate(rows):
        y1 = 315 + index * 160
        draw.rounded_rectangle((78, y1, 1842, y1 + 132), radius=26, fill="#FFFFFF", outline=BLACK, width=3)
        draw.rounded_rectangle((96, y1 + 30, 200, y1 + 96), radius=28, fill=accent, outline=BLACK, width=2)
        draw.text((120, y1 + 46), "PASS", font=font(FONT_BOLD, 17), fill=BLACK)
        draw.text((238, y1 + 25), requirement, font=font(FONT_BOLD, 24), fill=BLACK)
        draw.text((238, y1 + 72), chinese, font=font(FONT_CN, 22), fill="#555750")
        draw.text((1040, y1 + 49), shipped, font=font(FONT_BOLD, 22), fill=VIOLET)
    draw.text((78, 984), "Source: official AI³ Growth Hackathon Track 3 brief · 依据：赛事官方赛道三说明", font=font(FONT_CN, 18), fill="#777972")
    return image


def gonka_proof_frame() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BLACK)
    draw = ImageDraw.Draw(image)
    proof_title = "PRODUCTION PROOF"
    draw.text((76, 55), proof_title, font=font(FONT_BOLD, 28), fill=LIME)
    proof_width = draw.textbbox((0, 0), proof_title, font=font(FONT_BOLD, 28))[2]
    draw.text((94 + proof_width, 53), "· 公开站真实运行证明", font=font(FONT_CN, 26), fill=LIME)
    draw.text((76, 116), "Connected is a runtime fact—not a slide claim.", font=font(FONT_BOLD, 59), fill=PAPER)
    draw.text((78, 196), "接入不是口号，而是公开环境中的真实运行状态。", font=font(FONT_CN, 36), fill="#d2d3cd")
    cards = [
        ("HEALTH", "liveReady: true", "Provider: GonkaRouter", LIME),
        ("MODEL 01", "Kimi-K2.6", "Request ID present", CYAN),
        ("MODEL 02", "MiniMax-M2.7", "Request ID present", VIOLET),
        ("LIVE CASE", "Truth Score 18", "5 public sources", PINK),
    ]
    for index, (label, value, detail, accent) in enumerate(cards):
        x1 = 76 + index * 448
        x2 = x1 + 394
        draw.rounded_rectangle((x1 + 12, 340 + 12, x2 + 12, 735 + 12), radius=34, fill=accent)
        draw.rounded_rectangle((x1, 340, x2, 735), radius=34, fill=PAPER, outline=BLACK, width=4)
        draw.text((x1 + 28, 380), label, font=font(FONT_BOLD, 21), fill=VIOLET)
        draw.text((x1 + 28, 475), value, font=font(FONT_BOLD, 31), fill=BLACK)
        draw.text((x1 + 28, 555), detail, font=font(FONT_REGULAR, 21), fill="#4d4f49")
        draw.rounded_rectangle((x1 + 28, 650, x1 + 128, 695), radius=20, fill=accent, outline=BLACK, width=2)
        draw.text((x1 + 54, 661), "PASS", font=font(FONT_BOLD, 17), fill=BLACK)
    draw.rounded_rectangle((76, 850, 1844, 962), radius=26, fill="#181915", outline="#41423d", width=3)
    draw.text((110, 885), "UPSTREAM response.id → requestId · UNCHANGED", font=font(FONT_BOLD, 24), fill=CYAN)
    draw.text((785, 882), "上游回执原样保存并显示", font=font(FONT_CN, 23), fill=CYAN)
    return image


def contact_sheet(frames: list[Path]) -> Image.Image:
    sheet = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(sheet)
    cell_w, cell_h = 384, 270
    for index, frame_path in enumerate(frames):
        row, col = divmod(index, 5)
        x, y = col * cell_w, row * cell_h
        thumb = Image.open(frame_path).convert("RGB").resize((356, 200), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + 14, y + 12))
        start, end, _, _ = SUBTITLES[index]
        label = f"{index + 1:02d}  {start[3:8]} → {end[3:8]}"
        draw.text((x + 16, y + 220), label, font=font(FONT_BOLD, 17), fill=BLACK)
        draw.text((x + 16, y + 244), PLAN[index][4], font=font(FONT_CN, 14), fill="#5c5e58")
    return sheet


def seconds(timestamp: str) -> float:
    hours, minutes, remainder = timestamp.split(":")
    seconds_text, millis = remainder.split(",")
    return int(hours) * 3600 + int(minutes) * 60 + int(seconds_text) + int(millis) / 1000


def main() -> None:
    if len(PLAN) != len(SUBTITLES):
        raise SystemExit("Storyboard plan must match the 19 subtitle cues exactly.")
    PRIMARY.mkdir(parents=True, exist_ok=True)
    BONUS.mkdir(parents=True, exist_ok=True)
    GONKA.mkdir(parents=True, exist_ok=True)
    for directory in (PRIMARY, BONUS, GONKA):
        for old in directory.glob("*.png"):
            old.unlink()

    accents = [VIOLET, LIME, CYAN, YELLOW, PINK]
    generated: list[Path] = []
    rows = []
    for index, ((slug, source_name, mode, box, purpose), subtitle) in enumerate(zip(PLAN, SUBTITLES), start=1):
        start, end, chinese, english = subtitle
        filename = f"{index:02d}_{start.replace(':', '-').replace(',', '-')}_{slug}.png"
        destination = PRIMARY / filename
        if mode == "full":
            image = full(SHOTS / source_name)
        elif mode == "focus":
            image = focus(SHOTS / source_name, box, accents[(index - 1) % len(accents)])
        elif mode == "product":
            image = product_frame()
        elif mode == "paths":
            image = paths_frame()
        elif mode == "signals":
            image = signals_frame()
        elif mode == "signal_receipt":
            image = signal_receipt_frame()
        elif mode == "handoff":
            image = handoff_frame()
        elif mode == "council":
            image = council_frame()
        elif mode == "architecture":
            architecture_frame(destination)
            image = None
        elif mode == "gonka_sequence":
            image = gonka_sequence_frame()
        elif mode == "safety":
            image = safety_frame()
        elif mode == "mosaic":
            image = mosaic_frame()
        elif mode == "chain":
            image = chain_frame()
        elif mode == "human_gate":
            image = human_gate_frame()
        elif mode == "atlas_map":
            image = atlas_map_frame()
        elif mode == "unplaced":
            image = unplaced_frame()
        elif mode == "privacy":
            image = privacy_frame()
        elif mode == "close":
            close_frame(destination)
            image = None
        else:
            raise ValueError(mode)
        if image is not None:
            image.save(destination, quality=95)
        generated.append(destination)
        rows.append((index, start, end, seconds(end) - seconds(start), filename, purpose, chinese, english))

    bonus_sources = [
        ("B01_来源卡片转场.png", "01_首页_来源卡片.png"),
        ("B02_质疑卡片转场.png", "02_首页_质疑卡片.png"),
        ("B03_回执卡片转场.png", "03_首页_回执卡片.png"),
        ("B04_证据缺口转场.png", "09_真实结果_05_证据缺口.png"),
    ]
    for filename, source in bonus_sources:
        full(SHOTS / source).save(BONUS / filename, quality=95)

    gonka_frames = [
        ("G01_所有AI推理通过GonkaRouter.png", gonka_router_frame()),
        ("G02_双模型交叉核验执行序列.png", gonka_sequence_frame()),
        ("G03_赛道三要求逐项对照.png", gonka_requirements_frame()),
        ("G04_公开站真实运行证明.png", gonka_proof_frame()),
    ]
    for filename, image in gonka_frames:
        image.save(GONKA / filename, quality=95)

    contact_sheet(generated).save(OUT / "00_逐句配图总览.png", quality=95)

    with (OUT / "00_剪辑时间表.csv").open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["序号", "开始", "结束", "时长秒", "画面文件", "画面内容", "中文口播/字幕", "English subtitle"])
        writer.writerows(rows)

    lines = [
        "# Fact Atlas 逐句配图与字幕对应表",
        "",
        "19 张主画面与现有 19 条字幕严格一一对应；另有 4 张备用转场图和 4 张 Gonka 核心架构图。所有画面均为 1920×1080，不含烧录字幕和音频。",
        "",
        "| # | 时间码 | 时长 | 文件 | 画面 | 中文口播/字幕 |",
        "| ---: | --- | ---: | --- | --- | --- |",
    ]
    for index, start, end, duration, filename, purpose, chinese, _ in rows:
        lines.append(f"| {index:02d} | {start} → {end} | {duration:.1f}s | `{filename}` | {purpose} | {chinese} |")
    lines.extend([
        "",
        "## 使用方式",
        "",
        "1. 按文件名前两位数字顺序导入剪辑软件。",
        "2. 每张图片的停留时间直接使用表中的时间码；总时长正好 150 秒。",
        "3. 录制口播时严格按中文列朗读即可；自然停顿可以留在每条字幕末尾。",
        "4. 真人口播交回后，再进行降噪、响度统一、画面对齐与最终字幕合成。",
        "5. `02_备用转场_4张` 只在口播有额外停顿时使用，不改变主时间轴。",
        "6. `03_Gonka核心架构_4张` 用于技术说明、答辩或替换第 15–18 段，依次展示强制推理边界、双模型序列、赛道要求映射和公开站运行证明。",
        "",
    ])
    (OUT / "00_字幕与配图对应表.md").write_text("\n".join(lines), encoding="utf-8")
    print(
        f"Generated {len(generated)} primary frames, {len(bonus_sources)} transitions, "
        f"{len(gonka_frames)} Gonka diagrams, one contact sheet, CSV, and mapping."
    )


if __name__ == "__main__":
    main()
