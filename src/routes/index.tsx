import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { getTodayProducts, refreshTodayProducts } from "@/lib/products.functions";
import { ProductCard } from "@/components/ProductCard";

const todayQueryOptions = queryOptions({
  queryKey: ["ph-today"],
  queryFn: () => getTodayProducts(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Product Hunt CN | 一句话看懂今日全球热门产品" },
      {
        name: "description",
        content: "每天自动抓取 Product Hunt 今日榜单，AI 中文解读，10 秒了解全球最新热门产品。",
      },
      { property: "og:title", content: "Product Hunt CN | 一句话看懂今日全球热门产品" },
      {
        property: "og:description",
        content: "每天自动抓取 Product Hunt 今日榜单，AI 中文解读，10 秒了解全球最新热门产品。",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(todayQueryOptions),
  component: HomePage,
  errorComponent: ({ error, reset }) => <ErrorState message={error.message} reset={reset} />,
});

function ErrorState({ message, reset }: { message: string; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">加载今日榜单失败</h2>
        <p className="text-sm text-muted-foreground mb-4 break-all">{message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
        >
          重试
        </button>
      </div>
    </div>
  );
}

function HomePage() {
  const { data } = useSuspenseQuery(todayQueryOptions);
  const refresh = useServerFn(refreshTodayProducts);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh({ data: {} });
      await router.invalidate();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const dateLabel = formatDate(data.date);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card sticky top-0 z-50 border-b border-border">
        <div className="flex justify-between items-center max-w-[1120px] mx-auto px-4 md:px-10 h-16">
          <div className="flex items-center gap-4">
            <span className="text-lg md:text-xl font-bold text-primary">Product Hunt CN</span>
            <span className="hidden md:block w-px h-6 bg-border" />
            <span className="hidden md:block text-sm text-muted-foreground">
              今日榜单 · {dateLabel}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "更新中" : "刷新"}</span>
          </button>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-4 md:px-0 py-6 md:py-10">
        <div className="md:hidden mb-4">
          <h1 className="text-2xl font-bold text-foreground">今日榜单</h1>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        <div className="hidden md:flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              今日全球热门产品
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              每一个产品都附带 AI 中文一句话解读，10 秒看懂
            </p>
          </div>
        </div>

        {data.products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>今日榜单暂无数据。</p>
            <button onClick={handleRefresh} className="mt-3 text-primary hover:underline">
              立即拉取
            </button>
          </div>
        ) : (
          <section className="flex flex-col gap-3 md:gap-4">
            {data.products.map((p, i) => (
              <ProductCard key={p.id} product={p} rank={i + 1} />
            ))}
          </section>
        )}

        <footer className="text-center text-xs text-muted-foreground mt-12 pb-8">
          数据来自 Product Hunt 官方 API · 中文解读由 AI 自动生成，仅供参考
        </footer>
      </main>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const week = ["日", "一", "二", "三", "四", "五", "六"][d.getUTCDay()];
  return `${y}年${m}月${day}日 星期${week}`;
}
