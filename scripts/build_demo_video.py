#!/usr/bin/env python3
"""Build the deterministic 2:30 FactRelay demo from public-site captures."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DELIVERY = ROOT / "FactRelay_黑客松交付包"
SHOTS = DELIVERY / "03_截图"
VIDEO_DIR = DELIVERY / "02_演示视频"
WORK = ROOT / "tmp" / "video-work"
FFMPEG = ROOT / "tmp" / "video-tools" / "node_modules" / "ffmpeg-static" / "ffmpeg"
FFPROBE = ROOT / "tmp" / "video-tools" / "node_modules" / "ffprobe-static" / "bin" / "darwin" / "arm64" / "ffprobe"

FONT_BOLD = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
FONT_REGULAR = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
FONT_CN = Path("/System/Library/Fonts/STHeiti Medium.ttc")

WIDTH, HEIGHT, FPS = 1920, 1080, 30
BLACK = "#0d0e0b"
PAPER = "#f7f5ef"
LIME = "#aaff4f"
VIOLET = "#7560ff"
CYAN = "#b9edf2"
YELLOW = "#ffe28a"
PINK = "#f8bad6"

PUBLIC_DEMO = "factrelay-ai3-2026.yediqizhang37.chatgpt.site"
GITHUB = "github.com/narratorzhang0307/FactRelay"

SCENES = [
    (12.0, "AI 事实核查不应该要求我们再相信另一个黑盒。FactRelay 把每次核查拆成一叠可以翻看的证据区块。"),
    (15.0, "用户可以提交原始文本、公开文章链接或社交媒体截图。实时运行会先提取准确主张，再检索当前公开资料。"),
    (14.0, "这里核查一条常见说法：人类能从月球上肉眼看到长城。FactRelay 先收集证据，再依次调用两位 Gonka 模型。"),
    (17.0, "结果是事实不符，并给出一项可复算的真实度评分。这个数字不是模型随口生成的，而是由可测试代码根据模型共识和来源加权证据确定计算。"),
    (18.0, "每条证据都保留发布者、日期、原始链接、立场和可信度。模型只能引用这份编号清单，伪造或越界的来源编号会被拒绝。"),
    (20.0, "Kimi K 二点六担任调查方，先形成证据判断；MiniMax M 二点七担任质疑方，专门寻找循环引用、时间错位、因果跳跃和遗漏背景。分歧不会被隐藏。"),
    (18.0, "每次推理都保留 Gonka 上游 Request ID 和执行顺序。回执证明哪次请求生成了分析，但不冒充事实本身的证明；事实仍由可检查的证据支持。"),
    (16.0, "所有语义推理只通过 GonkaRouter。检索不依赖其他 AI；评分是确定性代码；链接会经过安全防护；预览数据绝不伪造真实回执。"),
    (14.0, "从结论、来源、审查到回执，每一张卡都是可翻看、可追溯的证据区块。用户看到的不只是答案，而是一条能够复核的链路。"),
    (6.0, "FactRelay：质疑主张，保留回执。"),
]


def run(*args: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, cwd=cwd, check=True, text=True, capture_output=True)


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def fit_text(draw: ImageDraw.ImageDraw, text: str, box_width: int, start_size: int, font_path: Path) -> ImageFont.FreeTypeFont:
    size = start_size
    while size > 22:
        candidate = font(font_path, size)
        if draw.textbbox((0, 0), text, font=candidate)[2] <= box_width:
            return candidate
        size -= 2
    return font(font_path, size)


def shadow_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, accent: str) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle((x1 + 14, y1 + 14, x2 + 14, y2 + 14), radius=28, fill=accent)
    draw.rounded_rectangle(box, radius=28, fill=fill, outline="#171815", width=4)


def architecture_frame(path: Path) -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), BLACK)
    draw = ImageDraw.Draw(image)
    draw.text((72, 56), "FACTRELAY · TRUST BOUNDARY", font=font(FONT_BOLD, 28), fill=LIME)
    draw.text((72, 112), "Only Gonka crosses the inference boundary.", font=font(FONT_BOLD, 66), fill=PAPER)
    draw.text((74, 196), "只有 Gonka 进入语义推理边界。", font=font(FONT_CN, 38), fill="#d6d6d0")

    cards = [
        ((70, 330, 390, 610), PAPER, LIME, "01", "INPUT GUARD", "输入防护", "Text · URL · image\nSSRF + size validation"),
        ((455, 330, 775, 610), PAPER, YELLOW, "02", "LIVE EVIDENCE", "实时证据", "Public HTML + RSS\nNo inference provider"),
        ((840, 330, 1160, 610), PAPER, CYAN, "03", "KIMI", "调查方", "Investigator\nGonka Request ID"),
        ((1225, 330, 1545, 610), PAPER, VIOLET, "04", "MINIMAX", "质疑方", "Adversarial review\nGonka Request ID"),
        ((1610, 330, 1850, 610), PAPER, PINK, "05", "SCORE", "确定性评分", "55% models\n45% evidence"),
    ]
    for index, (box, fill, accent, number, title, title_cn, body) in enumerate(cards):
        shadow_card(draw, box, fill, accent)
        x1, y1, x2, _ = box
        draw.rounded_rectangle((x1 + 22, y1 + 22, x1 + 82, y1 + 64), radius=20, fill=accent, outline=BLACK, width=2)
        draw.text((x1 + 38, y1 + 28), number, font=font(FONT_BOLD, 18), fill=BLACK)
        draw.text((x1 + 22, y1 + 96), title, font=fit_text(draw, title, x2 - x1 - 44, 30, FONT_BOLD), fill=BLACK)
        draw.text((x1 + 22, y1 + 140), title_cn, font=font(FONT_CN, 25), fill="#4f504b")
        draw.multiline_text((x1 + 22, y1 + 190), body, font=font(FONT_REGULAR, 20), fill="#383934", spacing=10)
        if index < len(cards) - 1:
            draw.line((x2 + 20, 470, cards[index + 1][0][0] - 20, 470), fill=LIME, width=6)
            draw.polygon([(cards[index + 1][0][0] - 25, 458), (cards[index + 1][0][0] - 25, 482), (cards[index + 1][0][0] - 5, 470)], fill=LIME)

    draw.rounded_rectangle((70, 720, 1850, 932), radius=30, fill="#161713", outline="#42433e", width=3)
    invariant_label = "PROVENANCE INVARIANTS"
    invariant_font = font(FONT_BOLD, 26)
    draw.text((110, 760), invariant_label, font=invariant_font, fill=VIOLET)
    label_width = draw.textbbox((0, 0), invariant_label, font=invariant_font)[2]
    draw.text((128 + label_width, 758), "· 可追溯约束", font=font(FONT_CN, 24), fill=VIOLET)
    invariants = [
        "1  Every semantic inference uses GonkaRouter · 所有语义推理仅通过 GonkaRouter",
        "2  Truth Score is computed by tested code · Truth Score 由可测试代码计算",
        "3  Preview receipts stay null · 预览回执始终为空，不伪造真实 ID",
    ]
    for idx, line in enumerate(invariants):
        draw.text((110, 810 + idx * 42), line, font=font(FONT_CN, 23), fill=PAPER)
    draw.text((72, 1000), "AI³ GROWTH HACKATHON 2026 · TRACK 3 · GONKA — AI FOR SOCIETY", font=font(FONT_BOLD, 20), fill="#9a9b95")
    image.save(path)


def close_frame(path: Path) -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), BLACK)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((88, 84, 1832, 996), radius=54, fill=PAPER, outline="#171815", width=5)
    draw.rounded_rectangle((110, 106, 1810, 974), radius=42, outline=VIOLET, width=8)
    draw.text((160, 160), "FACTRELAY", font=font(FONT_BOLD, 34), fill=VIOLET)
    draw.text((160, 250), "Question the claim.", font=font(FONT_BOLD, 98), fill=BLACK)
    draw.text((160, 365), "Keep the receipts.", font=font(FONT_BOLD, 98), fill=BLACK)
    draw.text((164, 500), "质疑主张，保留每一张推理回执。", font=font(FONT_CN, 48), fill="#3e403b")
    draw.rounded_rectangle((160, 640, 1760, 735), radius=24, fill=LIME, outline=BLACK, width=3)
    draw.text((200, 667), PUBLIC_DEMO, font=fit_text(draw, PUBLIC_DEMO, 1500, 31, FONT_BOLD), fill=BLACK)
    draw.rounded_rectangle((160, 760, 1760, 855), radius=24, fill=VIOLET, outline=BLACK, width=3)
    draw.text((200, 787), GITHUB, font=fit_text(draw, GITHUB, 1500, 31, FONT_BOLD), fill=PAPER)
    draw.text((160, 910), "AI³ Growth Hackathon 2026 · Track 3 · Gonka — AI for Society", font=font(FONT_BOLD, 23), fill="#696a65")
    image.save(path)


def screenshot_frame(source: Path, destination: Path, focus: bool = False) -> None:
    screenshot = Image.open(source).convert("RGB")
    if focus:
        width, height = screenshot.size
        crop = screenshot.crop((max(0, int(width * 0.33)), 0, width, height))
        background = screenshot.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(18))
        overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 120))
        background = Image.alpha_composite(background.convert("RGBA"), overlay).convert("RGB")
        crop.thumbnail((1760, 1000), Image.Resampling.LANCZOS)
        x = (WIDTH - crop.width) // 2
        y = (HEIGHT - crop.height) // 2
        draw = ImageDraw.Draw(background)
        draw.rounded_rectangle((x - 10, y - 10, x + crop.width + 20, y + crop.height + 20), radius=26, fill=VIOLET)
        background.paste(crop, (x, y))
        screenshot = background
    else:
        screenshot = screenshot.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    screenshot.save(destination)


def probe_duration(path: Path) -> float:
    result = run(str(FFPROBE), "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path))
    return float(json.loads(result.stdout)["format"]["duration"])


def build() -> None:
    if not FFMPEG.exists() or not FFPROBE.exists():
        raise SystemExit("Install ffmpeg-static and ffprobe-static under tmp/video-tools first.")
    WORK.mkdir(parents=True, exist_ok=True)
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)

    for old in WORK.glob("*"):
        if old.is_file() or old.is_symlink():
            old.unlink()
        else:
            shutil.rmtree(old)

    prepared = []
    sources = [
        (SHOTS / "01_首页_来源卡片.png", False),
        (SHOTS / "02_首页_质疑卡片.png", False),
        (SHOTS / "04_实时核查进行中.png", False),
        (SHOTS / "05_真实结果_01_结论.png", True),
        (SHOTS / "06_真实结果_02_来源.png", True),
        (SHOTS / "07_真实结果_03_双模型审查.png", True),
        (SHOTS / "08_真实结果_04_Gonka回执.png", True),
    ]
    for index, (source, focus) in enumerate(sources, 1):
        destination = WORK / f"frame-{index:02d}.png"
        screenshot_frame(source, destination, focus=focus)
        prepared.append(destination)

    architecture = WORK / "frame-08-architecture.png"
    architecture_frame(architecture)
    close = WORK / "frame-10-close.png"
    close_frame(close)
    shutil.copy2(close, VIDEO_DIR / "FactRelay_Demo_Cover.png")

    # Scene 09 deliberately flips through four real cards in sequence.
    visual_plan = [
        (prepared[0], 12.0),
        (prepared[1], 15.0),
        (prepared[2], 14.0),
        (prepared[3], 17.0),
        (prepared[4], 18.0),
        (prepared[5], 20.0),
        (prepared[6], 18.0),
        (architecture, 16.0),
        (prepared[3], 3.5),
        (prepared[4], 3.5),
        (prepared[5], 3.5),
        (prepared[6], 3.5),
        (close, 6.0),
    ]

    visual_segments = []
    for index, (image_path, duration) in enumerate(visual_plan, 1):
        destination = WORK / f"visual-{index:02d}.mp4"
        zoom = "min(zoom+0.00010,1.025)" if index % 2 else "min(zoom+0.00007,1.018)"
        run(
            str(FFMPEG), "-y", "-loop", "1", "-framerate", str(FPS), "-i", str(image_path),
            "-t", f"{duration:.3f}",
            "-vf", f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={WIDTH}x{HEIGHT}:fps={FPS},format=yuv420p",
            "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-r", str(FPS), str(destination),
        )
        visual_segments.append(destination)

    visual_list = WORK / "visuals.txt"
    visual_list.write_text("\n".join(f"file '{path.name}'" for path in visual_segments) + "\n", encoding="utf-8")
    silent_video = WORK / "silent-video.mp4"
    run(str(FFMPEG), "-y", "-f", "concat", "-safe", "0", "-i", visual_list.name, "-c", "copy", silent_video.name, cwd=WORK)

    clean_video = VIDEO_DIR / "FactRelay_Demo_2m30s_Clean_NoAudio.mp4"
    run(
        str(FFMPEG), "-y", "-i", str(silent_video), "-map", "0:v:0", "-an", "-sn",
        "-c:v", "copy", "-movflags", "+faststart",
        "-metadata", "title=FactRelay — Clean visual master",
        "-metadata", "comment=No narration, no music, no burned subtitles",
        str(clean_video),
    )

    audio_segments = []
    for index, (duration, narration) in enumerate(SCENES, 1):
        raw = WORK / f"voice-{index:02d}.aiff"
        destination = WORK / f"audio-{index:02d}.wav"
        run("/usr/bin/say", "-v", "Tingting", "-r", "185", "-o", str(raw), narration)
        raw_duration = probe_duration(raw)
        filters = []
        if raw_duration > duration - 0.35:
            filters.append(f"atempo={raw_duration / (duration - 0.35):.5f}")
        filters.extend(["apad", f"atrim=duration={duration:.3f}", "afade=t=in:st=0:d=0.08", f"afade=t=out:st={max(duration - 0.18, 0):.3f}:d=0.18"])
        run(
            str(FFMPEG), "-y", "-i", str(raw), "-af", ",".join(filters),
            "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(destination),
        )
        audio_segments.append(destination)

    audio_list = WORK / "audio.txt"
    audio_list.write_text("\n".join(f"file '{path.name}'" for path in audio_segments) + "\n", encoding="utf-8")
    narration_wav = WORK / "narration.wav"
    run(str(FFMPEG), "-y", "-f", "concat", "-safe", "0", "-i", audio_list.name, "-c", "copy", narration_wav.name, cwd=WORK)

    narration_m4a = VIDEO_DIR / "FactRelay_Chinese_Narration.m4a"
    run(str(FFMPEG), "-y", "-i", str(narration_wav), "-c:a", "aac", "-b:a", "192k", str(narration_m4a))

    subtitles = WORK / "subtitles.srt"
    shutil.copy2(VIDEO_DIR / "FactRelay_English_Subtitles.srt", subtitles)
    final = VIDEO_DIR / "FactRelay_Demo_2m30s_Bilingual.mp4"
    subtitle_filter = (
        "subtitles=subtitles.srt:fontsdir=/System/Library/Fonts/Supplemental:"
        "force_style='FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H00000000,BackColour=&H99000000,BorderStyle=3,Outline=1,"
        "Shadow=0,MarginV=42,Alignment=2'"
    )
    run(
        str(FFMPEG), "-y", "-i", silent_video.name, "-i", narration_wav.name,
        "-vf", subtitle_filter, "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart",
        "-metadata", "title=FactRelay — Question the claim. Keep the receipts.",
        "-metadata", "comment=AI³ Growth Hackathon 2026 · Track 3 · Gonka — AI for Society",
        "-shortest", str(final), cwd=WORK,
    )

    probe = run(
        str(FFPROBE), "-v", "error", "-show_entries",
        "format=duration,size,bit_rate:stream=index,codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels",
        "-of", "json", str(final),
    )
    qa = json.loads(probe.stdout)
    qa["expectedDurationSeconds"] = 150
    qa["source"] = "Public FactRelay deployment screenshots + generated architecture/closing cards"
    qa["privacy"] = "No API key, email, phone number, password, or unrelated browser tab is visible."
    (VIDEO_DIR / "FactRelay_Demo_QA.json").write_text(json.dumps(qa, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(qa, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    build()
