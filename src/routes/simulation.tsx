import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/SiteHeader";
import { todayQueryOptions, useToday } from "@/lib/board";
import { estimateQuality, fairRerank, evaluate, simulateRounds } from "@/lib/fair-exposure";
import { toRankItems } from "@/lib/board";

export const Route = createFileRoute("/simulation")({
  head: () => ({
    meta: [
      { title: "演化模拟 · 策略型创作者多轮实验 | 公平曝光系统" },
      {
        name: "description",
        content: "调节公平强度 λ 与改进成本 α，观察多轮演化下长尾质量提升与基尼系数下降。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "演化模拟 · 策略型创作者多轮实验" },
      { property: "og:description", content: "交互式实验：公平曝光如何激励长尾创作者提升内容质量。" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(todayQueryOptions),
  component: SimulationPage,
});

function SimulationPage() {
  const { products } = useToday();
  const [lambda, setLambda] = useState(0.45);
  const [alpha, setAlpha] = useState(3);
  const [rounds, setRounds] = useState(8);

  const scored = useMemo(() => estimateQuality(toRankItems(products)), [products]);
  const stats = useMemo(
    () => simulateRounds(scored, { lambda, alpha, rounds }),
    [scored, lambda, alpha, rounds],
  );

  const sweep = useMemo(
    () =>
      [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((l) => {
        const m = evaluate(fairRerank(scored, { lambda: l }));
        return { lambda: l, ...m };
      }),
    [scored],
  );

  if (products.length === 0) {
    return (
      <PageShell title="演化模拟">
        <p className="text-muted-foreground py-16 text-center">今日暂无数据。</p>
      </PageShell>
    );
  }

  const maxGini = Math.max(...stats.map((s) => s.gini), 0.01);

  return (
    <PageShell
      title="演化模拟 · 策略型创作者实验"
      subtitle="系统排序会反向塑造创作者行为（performativity）。拿到曝光的长尾作者以成本 α 改进内容，长期形成正循环。"
      wide
    >
      <section className="bg-muted/40 border border-border rounded-2xl p-4 md:p-5 mb-6 grid md:grid-cols-3 gap-4">
        <Slider label={`公平强度 λ = ${lambda.toFixed(2)}`} min={0} max={0.9} step={0.05} value={lambda} onChange={setLambda} hint="越大越向长尾倾斜" />
        <Slider label={`改进成本 α = ${alpha}`} min={1} max={8} step={0.5} value={alpha} onChange={setAlpha} hint="越大创作者改进越缓慢" />
        <Slider label={`模拟轮数 = ${rounds}`} min={2} max={15} step={1} value={rounds} onChange={setRounds} hint="每轮一次曝光分配 + 最优响应" />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">多轮演化趋势</h2>
          <div className="flex items-end gap-1.5 h-56">
            {stats.map((s) => (
              <div key={s.round} className="flex-1 flex flex-col justify-end items-center gap-1">
                <div
                  className="w-full bg-primary/70 rounded-t"
                  style={{ height: `${(s.tailExposureShare / 1) * 160}px` }}
                  title={`长尾曝光 ${(s.tailExposureShare * 100).toFixed(1)}%`}
                />
                <span className="text-[10px] text-muted-foreground">{s.round}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">柱高 = 该轮长尾曝光占比；横轴为轮次。</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 overflow-x-auto">
          <h2 className="text-sm font-semibold text-foreground mb-3">逐轮指标表</h2>
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="py-1.5">轮次</th>
                <th>Gini↓</th>
                <th>NDCG↑</th>
                <th>长尾曝光↑</th>
                <th>长尾质量↑</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              {stats.map((s) => (
                <tr key={s.round} className="border-t border-border">
                  <td className="py-1.5">{s.round}</td>
                  <td>{s.gini.toFixed(3)}</td>
                  <td>{s.ndcg.toFixed(3)}</td>
                  <td>{(s.tailExposureShare * 100).toFixed(1)}%</td>
                  <td>{(s.tailQuality * 100).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-muted-foreground mt-2">
            最大 Gini {maxGini.toFixed(3)} → 末轮 {stats[stats.length - 1]!.gini.toFixed(3)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 md:col-span-2 overflow-x-auto">
          <h2 className="text-sm font-semibold text-foreground mb-3">λ 参数敏感性分析（精度—公平权衡）</h2>
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="py-1.5">λ</th>
                <th>Gini</th>
                <th>NDCG</th>
                <th>长尾曝光占比</th>
                <th>头部垄断度</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              {sweep.map((s) => (
                <tr key={s.lambda} className="border-t border-border">
                  <td className="py-1.5">{s.lambda.toFixed(2)}</td>
                  <td>{s.gini.toFixed(3)}</td>
                  <td>{s.ndcg.toFixed(3)}</td>
                  <td>{(s.tailExposureShare * 100).toFixed(1)}%</td>
                  <td>{(s.headMonopoly * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-muted-foreground mt-2">
            结论：λ 在 0.3–0.6 区间时，长尾曝光显著提升而 NDCG 损失很小，是推荐的工作点。
          </p>
        </div>
      </section>
    </PageShell>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  hint,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground mb-1.5">{label}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[hsl(var(--primary))]"
      />
      <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}
