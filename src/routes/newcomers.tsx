import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Rocket } from "lucide-react";
import { PageShell } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { todayQueryOptions, useToday, formatDate } from "@/lib/board";

export const Route = createFileRoute("/newcomers")({
  head: () => ({
    meta: [
      { title: "新人专区 · 优质新作扶持榜 | 公平曝光系统" },
      {
        name: "description",
        content: "筛选出票数不高但内容质量优秀的长尾新作，给予额外曝光位，对抗马太效应。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "新人专区 · 优质新作扶持榜" },
      { property: "og:description", content: "票数不高但值得一看的优质新作，公平曝光算法挑选。" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(todayQueryOptions),
  component: NewcomersPage,
});

function NewcomersPage() {
  const [lambda] = useState(0.6);
  const { date, board, byId } = useToday(lambda);
  const rising = board.fair.filter((i) => i.isRisingNewcomer);

  return (
    <PageShell
      title="新人专区 · 优质新作扶持榜"
      subtitle={`${formatDate(date)} · 共 ${rising.length} 个被算法识别为「优质新人」的产品`}
    >
      <div className="bg-muted/40 border border-border rounded-2xl p-4 mb-6 text-sm text-muted-foreground leading-relaxed">
        <p className="flex items-center gap-2 text-foreground font-medium mb-1.5">
          <Rocket className="w-4 h-4 text-primary" />
          识别规则
        </p>
        入选条件：点赞数处于当日榜单后 50%（长尾群体），但去偏质量分 r_i 不低于长尾平均水平。
        质量分由「热度 40% + 互动深度 40% + 内容完备度 20%」构成，弱化点赞对排序的主导作用。
      </div>

      {rising.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center">今日暂无符合条件的新人产品。</p>
      ) : (
        <section className="flex flex-col gap-3 md:gap-4">
          {rising.map((it, i) => {
            const product = byId.get(it.id);
            if (!product) return null;
            return (
              <div key={it.id}>
                <ProductCard
                  product={product}
                  rank={i + 1}
                  rankDelta={it.rankDelta}
                  isRisingNewcomer
                />
                <div className="text-[11px] text-muted-foreground mt-1 pl-1">
                  质量分 {(it.quality * 100).toFixed(0)} · 互动深度{" "}
                  {(it.engagement * 100).toFixed(0)} · 原始名次 #{it.originalRank} → 公平榜 #
                  {it.fairRank}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </PageShell>
  );
}
