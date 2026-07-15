import { Download, PlusSquare, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function PwaInstall() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [showHelp, setShowHelp] = useState(false);
  const isIos = isIosDevice();

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setShowHelp(false);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    const displayMode = window.matchMedia("(display-mode: standalone)");
    displayMode.addEventListener("change", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
      displayMode.removeEventListener("change", markInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!promptEvent) {
      setShowHelp(true);
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  };

  return <>
    <button type="button" className="pwa-install-trigger" data-testid="pwa-install" onClick={() => void install()} aria-label="Install Fact Atlas · 安装知识星球">
      <Download size={15} /><span>Install<small>安装</small></span>
    </button>
    {showHelp ? (
      <aside className="pwa-install-help" role="dialog" aria-modal="true" aria-label="Install Fact Atlas · 安装知识星球">
        <button type="button" className="pwa-help-close" onClick={() => setShowHelp(false)} aria-label="Close installation guide · 关闭安装说明"><X size={16} /></button>
        <span className="pwa-help-kicker"><Download size={15} /> INSTALL THE APP · 安装应用</span>
        <h2>Keep Fact Atlas on your home screen.<small>把知识星球放到手机桌面。</small></h2>
        {isIos ? <p><Share2 size={18} /><span>In Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>, and confirm <b>Add</b>.<small>在 Safari 点“分享”→“添加到主屏幕”→“添加”。</small></span></p>
          : <p><PlusSquare size={18} /><span>Open the browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.<small>打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。</small></span></p>}
        <em>iOS + Android · standalone PWA · 支持离线打开应用外壳</em>
      </aside>
    ) : null}
  </>;
}
