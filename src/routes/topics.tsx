import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { todayQueryOptions, useToday, formatDate } from "@/lib/board";

export const Route = createFileRoute("/topics")({
  head: () => ({
    meta: [
      { title: "分类浏览 · 今日产品话题分布 | 公平曝光系统" },
      {
        name: "description",
        content: "按话题分类浏览今日 Product Hunt 产品，快速找到你关注领域的中文解读。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "分类浏览 · 今日产品话题分布" },
      { property: "og:description", content: "按话题分类浏览今日 Product Hunt 产品中文榜单。" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(todayQueryOptions),
  component: TopicsPage,
});

function TopicsPage() {
  const { date, products } = useToday();
  const [active, setActive] = useState<string | null>(null);

  const topics = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => (p.topics ?? []).forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [products]);

  const list = active ? products.filter((p) => (p.topics ?? []).includes(active)) : products;

  return (
    <PageShell
      title="分类浏览"
      subtitle={`${formatDate(date)} · ${products.length} 个产品，${topics.length} 个话题`}
    >
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActive(null)}
          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
            active === null
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:text-primary"
          }`}
        >
          全部 {products.length}
        </button>
        {topics.map(([t, c]) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
              active === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-primary"
            }`}
          >
            {t} {c}
          </button>
        ))}
      </div>

      {topics.length === 0 && (
        <p className="text-muted-foreground py-10 text-center">
          今日暂无数据，<Link to="/" className="text-primary hover:underline">返回首页</Link>拉取。
        </p>
      )}

      <section className="flex flex-col gap-3 md:gap-4">
        {list.map((p, i) => (
          <ProductCard key={p.id} product={p} rank={i + 1} />
        ))}
      </section>
    </PageShell>
  );
}
