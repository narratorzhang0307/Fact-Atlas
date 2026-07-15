# Fact Atlas 36-shot narration visual pack

The narration visual pack converts the existing 150-second, 19-cue demo script into 36 editing-ready 1920×1080 frames. The responsive revision explicitly states that Fact Atlas supports both desktop and mobile, and dedicates 10 main shots to centered mobile UI inside a restrained device shell. It combines four visual modes:

- real desktop and mobile product captures, including Relay, Evidence Council, Atlas, and Signals;
- interaction close-ups from a live Gonka verification run;
- conceptual product diagrams;
- Gonka Router architecture, request-receipt, scoring, human-gate, Mapbox, and privacy diagrams.

The first 17 narration cues use two shots each. The final two cues use one shot each, yielding 36 continuous segments from `00:00:00,000` through `00:02:30,000`. Every frame has a purpose, narration switch phrase, full Chinese line, English subtitle, and exact start/end time.

Generate the local editing pack with:

```bash
python3 scripts/build_narration_visual_pack.py
```

The generated delivery directory is intentionally excluded from Git. The tracked builder is deterministic and relies on the existing subtitle master, storyboard builders, live-result captures, and browser screenshots in the local handoff package.
