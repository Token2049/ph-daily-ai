import { Scale, TrendingUp, Users, Gauge } from "lucide-react";
import type { ExposureMetrics, RoundStat } from "@/lib/fair-exposure";

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

function Metric({
  icon,
  label,
  before,
  after,
  better,
}: {
  icon: React.ReactNode;
  label: string;
  before: string;
  after: string;
  better: "up" | "down";
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-muted-foreground/70 line-through">{before}</span>
        <span className="text-lg font-bold text-primary">{after}</span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        {better === "down" ? "越低越公平" : "越高越好"}
      </p>
    </div>
  );
}

export function FairExposurePanel({
  before,
  after,
  rounds,
  lambda,
  onLambdaChange,
}: {
  before: ExposureMetrics;
  after: ExposureMetrics;
  rounds: RoundStat[];
  lambda: number;
  onLambdaChange: (v: number) => void;
}) {
  const maxTail = Math.max(...rounds.map((r) => r.tailExposureShare), 0.01);

  return (
    <section className="bg-muted/40 border border-border rounded-2xl p-4 md:p-5 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            公平曝光算法效果
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            去流行度偏置质量估计 + 曝光配额贪心重排 + 策略型创作者多轮演化
          </p>
        </div>
        <label className="text-xs text-muted-foreground flex items-center gap-2">
          公平强度 λ = {lambda.toFixed(2)}
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.05}
            value={lambda}
            onChange={(e) => onLambdaChange(Number(e.target.value))}
            className="accent-[hsl(var(--primary))] w-32"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric
          icon={<Gauge className="w-3.5 h-3.5" />}
          label="曝光基尼系数 Gini@k"
          before={before.gini.toFixed(3)}
          after={after.gini.toFixed(3)}
          better="down"
        />
        <Metric
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="推荐精度 NDCG@k"
          before={before.ndcg.toFixed(3)}
          after={after.ndcg.toFixed(3)}
          better="up"
        />
        <Metric
          icon={<Users className="w-3.5 h-3.5" />}
          label="长尾曝光占比"
          before={pct(before.tailExposureShare)}
          after={pct(after.tailExposureShare)}
          better="up"
        />
        <Metric
          icon={<Scale className="w-3.5 h-3.5" />}
          label="头部垄断度"
          before={pct(before.headMonopoly)}
          after={pct(after.headMonopoly)}
          better="down"
        />
      </div>

      <div className="mt-4">
        <p className="text-xs text-muted-foreground mb-2">
          策略型创作者演化：长尾曝光占比随轮次变化（内容改进的正反馈）
        </p>
        <div className="flex items-end gap-1.5 h-20">
          {rounds.map((r) => (
            <div key={r.round} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-primary/80 rounded-t"
                style={{ height: `${(r.tailExposureShare / maxTail) * 100}%`, minHeight: 2 }}
                title={`第 ${r.round} 轮：长尾曝光 ${pct(r.tailExposureShare)}，Gini ${r.gini.toFixed(3)}`}
              />
              <span className="text-[10px] text-muted-foreground">t{r.round}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
