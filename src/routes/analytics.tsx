import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageShell } from "@/components/SiteHeader";
import { todayQueryOptions, useToday, formatDate } from "@/lib/board";
import { positionDiscount } from "@/lib/fair-exposure";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "数据看板 · 马太效应量化分析 | 公平曝光系统" },
      {
        name: "description",
        content: "洛伦兹曲线、基尼系数、票数分布与头部垄断度，量化今日榜单的曝光不平等程度。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "数据看板 · 马太效应量化分析" },
      { property: "og:description", content: "用洛伦兹曲线与基尼系数量化榜单曝光不平等。" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(todayQueryOptions),
  component: AnalyticsPage,
});

function lorenz(values: number[]): { x: number; y: number }[] {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((a, b) => a + b, 0) || 1;
  const pts = [{ x: 0, y: 0 }];
  let acc = 0;
  sorted.forEach((v, i) => {
    acc += v;
    pts.push({ x: (i + 1) / sorted.length, y: acc / total });
  });
  return pts;
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-primary mt-1">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}

function AnalyticsPage() {
  const { date, products, board } = useToday();

  const stats = useMemo(() => {
    const votes = products.map((p) => p.votes_count);
    const total = votes.reduce((a, b) => a + b, 0) || 1;
    const sortedDesc = [...votes].sort((a, b) => b - a);
    const top20n = Math.max(1, Math.round(votes.length * 0.2));
    const top20Share = sortedDesc.slice(0, top20n).reduce((a, b) => a + b, 0) / total;
    const voteCurve = lorenz(votes);
    const expCurve = lorenz(products.map((_, i) => positionDiscount(i + 1)));
    return { votes, total, top20Share, voteCurve, expCurve, sortedDesc };
  }, [products]);

  if (products.length === 0) {
    return (
      <PageShell title="数据看板">
        <p className="text-muted-foreground py-16 text-center">今日暂无数据。</p>
      </PageShell>
    );
  }

  const maxVote = stats.sortedDesc[0] ?? 1;

  return (
    <PageShell
      title="数据看板 · 马太效应量化分析"
      subtitle={`${formatDate(date)} · 样本 ${products.length} 个产品，总票数 ${stats.total}`}
      wide
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat
          label="票数基尼系数"
          value={board.before.gini.toFixed(3)}
          hint="0 = 绝对平均，1 = 完全垄断"
        />
        <Stat
          label="重排后基尼"
          value={board.after.gini.toFixed(3)}
          hint={`下降 ${((1 - board.after.gini / (board.before.gini || 1)) * 100).toFixed(1)}%`}
        />
        <Stat
          label="头部 20% 票数占比"
          value={`${(stats.top20Share * 100).toFixed(1)}%`}
          hint="典型的幂律长尾分布"
        />
        <Stat
          label="长尾曝光占比"
          value={`${(board.after.tailExposureShare * 100).toFixed(1)}%`}
          hint={`原始 ${(board.before.tailExposureShare * 100).toFixed(1)}%`}
        />
      </div>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">洛伦兹曲线（票数集中度）</h2>
          <svg viewBox="0 0 100 100" className="w-full h-64 bg-muted/30 rounded-lg">
            <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="0.6" className="text-muted-foreground/50" strokeDasharray="3 2" />
            <polyline
              points={stats.voteCurve.map((p) => `${p.x * 100},${100 - p.y * 100}`).join(" ")}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1.6"
            />
            <polyline
              points={stats.expCurve.map((p) => `${p.x * 100},${100 - p.y * 100}`).join(" ")}
              fill="none"
              stroke="currentColor"
              className="text-muted-foreground"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
          </svg>
          <p className="text-[11px] text-muted-foreground mt-2">
            实线为票数分布，虚线为位置曝光分布，斜对角线为绝对公平线。曲线越下凹，头部垄断越严重。
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">票数分布（降序）</h2>
          <div className="flex items-end gap-1 h-64">
            {stats.sortedDesc.map((v, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/70 rounded-t"
                style={{ height: `${(v / maxVote) * 100}%` }}
                title={`${v} 票`}
              />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            典型长尾：少数头部产品占据绝大部分票数，尾部产品几乎无人问津。
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 md:col-span-2">
          <h2 className="text-sm font-semibold text-foreground mb-3">分群对比（头部 / 腰部 / 长尾）</h2>
          <div className="grid grid-cols-3 gap-3">
            {(["head", "mid", "tail"] as const).map((c) => {
              const g = board.scored.filter((i) => i.cohort === c);
              const avgQ = g.length ? g.reduce((s, i) => s + i.quality, 0) / g.length : 0;
              const avgV = g.length ? g.reduce((s, i) => s + i.votes, 0) / g.length : 0;
              const label = c === "head" ? "头部" : c === "mid" ? "腰部" : "长尾";
              return (
                <div key={c} className="bg-muted/40 rounded-xl p-3">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-1">数量 {g.length}</p>
                  <p className="text-xs text-muted-foreground">平均票数 {avgV.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">
                    平均质量分 {(avgQ * 100).toFixed(0)}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            关键观察：长尾群体的平均质量分显著高于其票数占比，说明「票数」并不能等价于「质量」——
            这正是公平曝光重排的依据。
          </p>
        </div>
      </section>
    </PageShell>
  );
}
