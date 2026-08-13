import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { getArchiveDates, getProductsByDate } from "@/lib/products.functions";
import { formatDate } from "@/lib/board";

const archiveQueryOptions = queryOptions({
  queryKey: ["ph-archive"],
  queryFn: () => getArchiveDates(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "历史榜单 · 每日归档 | 公平曝光系统" },
      { name: "description", content: "浏览往期 Product Hunt 每日中文榜单归档与当日数据统计。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "历史榜单 · 每日归档" },
      { property: "og:description", content: "往期 Product Hunt 每日中文榜单归档。" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(archiveQueryOptions),
  component: ArchivePage,
});

function ArchivePage() {
  const { data } = useSuspenseQuery(archiveQueryOptions);
  const [selected, setSelected] = useState<string | null>(data.days[0]?.date ?? null);

  const dayQuery = useQuery({
    queryKey: ["ph-day", selected],
    queryFn: () => getProductsByDate({ data: { date: selected! } }),
    enabled: Boolean(selected),
  });

  return (
    <PageShell
      title="历史榜单归档"
      subtitle={`已归档 ${data.days.length} 天数据，可查看任意一天的中文榜单`}
      wide
    >
      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2">
          {data.days.map((d) => (
            <button
              key={d.date}
              onClick={() => setSelected(d.date)}
              className={`text-left rounded-xl border px-3 py-2 whitespace-nowrap transition-colors ${
                selected === d.date
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary/50"
              }`}
            >
              <p className="text-sm font-medium">{d.date}</p>
              <p className="text-[11px] opacity-80">
                {d.count} 个产品 · {d.votes} 票
              </p>
            </button>
          ))}
          {data.days.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无归档数据。</p>
          )}
        </aside>

        <section>
          {selected && (
            <h2 className="text-sm font-semibold text-foreground mb-3">{formatDate(selected)}</h2>
          )}
          {dayQuery.isLoading && <p className="text-sm text-muted-foreground">加载中…</p>}
          <div className="flex flex-col gap-3 md:gap-4">
            {(dayQuery.data?.products ?? []).map((p, i) => (
              <ProductCard key={p.id} product={p} rank={i + 1} />
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
