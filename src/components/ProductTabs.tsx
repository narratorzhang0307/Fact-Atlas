import { FileSearch, Globe2, RadioTower, type LucideIcon } from "lucide-react";
import type { ProductView } from "../navigation";

const PRODUCT_VIEWS: Array<{ id: ProductView; label: string; labelZh: string; Icon: LucideIcon }> = [
  { id: "relay", label: "Relay", labelZh: "探索", Icon: FileSearch },
  { id: "atlas", label: "Atlas", labelZh: "星图", Icon: Globe2 },
  { id: "signals", label: "Signals", labelZh: "发现", Icon: RadioTower },
];

interface Props {
  activeView: ProductView;
  className: "product-nav" | "mobile-tabbar";
  iconSize: number;
  onSelect: (view: ProductView) => void;
}

export function ProductTabs({ activeView, className, iconSize, onSelect }: Props) {
  return (
    <nav className={className} aria-label={className === "mobile-tabbar" ? "Mobile product tabs · 手机端产品标签" : "Product views · 产品视图"}>
      {PRODUCT_VIEWS.map(({ id, label, labelZh, Icon }) => (
        <button
          type="button"
          key={id}
          className={activeView === id ? "active" : ""}
          aria-current={activeView === id ? "page" : undefined}
          aria-controls={`${id}-view`}
          onClick={() => onSelect(id)}
        >
          <Icon size={iconSize} />
          <span>{label}<small>{labelZh}</small></span>
        </button>
      ))}
    </nav>
  );
}
