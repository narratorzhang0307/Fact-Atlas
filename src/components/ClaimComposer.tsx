import { FileImage, Link2, Radio, SearchCheck, Type, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import type { InputKind } from "../types";

const MODES: Array<{ id: InputKind; label: string; icon: typeof Type }> = [
  { id: "text", label: "Text 文本", icon: Type },
  { id: "url", label: "Link 链接", icon: Link2 },
  { id: "image", label: "Image 图片", icon: FileImage },
];

const SAMPLES = [
  "The Great Wall of China is visible from the Moon with the naked eye.",
  "The Eiffel Tower becomes taller during hot weather because metal expands.",
  "A viral post says octopuses have three hearts and blue blood.",
];

interface Props {
  kind: InputKind;
  content: string;
  imageDataUrl: string;
  imageName: string;
  loading: boolean;
  liveReady: boolean;
  onKindChange: (kind: InputKind) => void;
  onContentChange: (content: string) => void;
  onImageChange: (dataUrl: string, name: string) => void;
  onSubmit: () => void;
  onPreview: () => void;
}

export function ClaimComposer({
  kind,
  content,
  imageDataUrl,
  imageName,
  loading,
  liveReady,
  onKindChange,
  onContentChange,
  onImageChange,
  onSubmit,
  onPreview,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const canSubmit = kind === "image" ? Boolean(imageDataUrl) : content.trim().length >= 8;

  const loadFile = (file?: File) => {
    if (!file) return;
    setFileError("");
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
      setFileError("Use a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("Image must be smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onImageChange(String(reader.result), file.name);
    reader.readAsDataURL(file);
  };

  return (
    <section className="composer card" aria-labelledby="composer-title">
      <div className="panel-heading">
        <span className="panel-number">01</span>
        <div className="section-kicker"><Radio size={14} /> New case · 新建核查</div>
      </div>
      <h2 id="composer-title">Start with a claim.</h2>
      <p className="heading-zh">从一条主张开始。</p>
      <p className="section-copy">Paste the exact text, a public article, or a screenshot worth checking.</p>

      <div className="mode-tabs" aria-label="Input type">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={kind === id ? "mode-tab active" : "mode-tab"}
            aria-pressed={kind === id}
            onClick={() => onKindChange(id)}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {kind === "text" && (
        <label className="field-block">
          <span>Factual claim · 待核查主张</span>
          <textarea
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder="Paste a claim exactly as you saw it… / 粘贴原始表述"
            maxLength={8000}
            rows={7}
          />
        </label>
      )}

      {kind === "url" && (
        <label className="field-block">
          <span>Public article URL · 公开文章链接</span>
          <input
            type="url"
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder="https://example.com/article"
          />
          <small>We extract the central claim and retrieve fresh related coverage.</small>
        </label>
      )}

      {kind === "image" && (
        <div className="image-input">
          <input
            ref={fileRef}
            className="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => loadFile(event.target.files?.[0])}
          />
          {imageDataUrl ? (
            <button type="button" className="image-preview" onClick={() => fileRef.current?.click()}>
              <img src={imageDataUrl} alt="Uploaded claim" />
              <span>{imageName} · click to replace</span>
            </button>
          ) : (
            <button type="button" className="upload-zone" onClick={() => fileRef.current?.click()}>
              <UploadCloud size={28} />
              <strong>Choose a screenshot · 选择截图</strong>
              <span>PNG, JPEG, or WebP · max 5 MB</span>
            </button>
          )}
          <label className="field-block compact">
            <span>Optional context · 补充背景</span>
            <input
              value={content}
              onChange={(event) => onContentChange(event.target.value)}
              placeholder="Where did you see this?"
              maxLength={500}
            />
          </label>
          {fileError && <p className="field-error">{fileError}</p>}
        </div>
      )}

      <button
        type="button"
        className="verify-button"
        disabled={!canSubmit || loading}
        onClick={onSubmit}
        data-testid="verify-button"
      >
        <SearchCheck size={19} />
        {loading ? "Cross-checking… / 正在交叉核查" : "Run verification · 开始核查"}
      </button>

      <div className={liveReady ? "readiness ready" : "readiness"}>
        <span className="status-dot" />
        {liveReady ? "GonkaRouter is connected · 已连接" : "Preview ready · 预览可用，实时核查需密钥"}
      </div>

      <div className="samples">
        <div className="samples-head">
          <span>Case starters · 示例</span>
          <button type="button" onClick={onPreview}>Reset · 重置</button>
        </div>
        {SAMPLES.map((sample, index) => (
          <button
            type="button"
            className="sample-chip"
            key={sample}
            onClick={() => {
              onKindChange("text");
              onContentChange(sample);
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {sample}
          </button>
        ))}
      </div>
    </section>
  );
}
