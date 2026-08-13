import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/", label: "今日榜单" },
  { to: "/newcomers", label: "新人专区" },
  { to: "/topics", label: "分类浏览" },
  { to: "/analytics", label: "数据看板" },
  { to: "/simulation", label: "演化模拟" },
  { to: "/algorithm", label: "算法说明" },
  { to: "/archive", label: "历史榜单" },
  { to: "/about", label: "关于项目" },
] as const;

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-card sticky top-0 z-50 border-b border-border">
      <div className="flex justify-between items-center max-w-[1120px] mx-auto px-4 md:px-10 h-16">
        <div className="flex items-center gap-5 min-w-0">
          <Link to="/" className="text-base md:text-lg font-bold text-primary whitespace-nowrap">
            新人公平曝光榜
          </Link>
          <nav className="hidden lg:flex items-center gap-4">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "text-primary font-semibold" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="text-sm hover:text-primary transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {right}
          <button
            className="lg:hidden text-muted-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="菜单"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="lg:hidden border-t border-border bg-card px-4 py-3 grid grid-cols-2 gap-2">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{ className: "text-primary font-semibold" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="text-sm py-1.5"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function PageShell({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className={`${wide ? "max-w-[1120px]" : "max-w-[860px]"} mx-auto px-4 py-6 md:py-10`}>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        <footer className="text-center text-xs text-muted-foreground mt-14 pb-8">
          中文版 Product Hunt 新人公平曝光辅助系统 · 数据来自 Product Hunt 官方 API · 中文解读由 AI
          生成
        </footer>
      </main>
    </div>
  );
}
