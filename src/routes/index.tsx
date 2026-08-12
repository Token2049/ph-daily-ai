import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { getTodayProducts, refreshTodayProducts, type Product } from "@/lib/products.functions";
import { ProductCard } from "@/components/ProductCard";
import { FairExposurePanel } from "@/components/FairExposurePanel";
import { buildFairBoard, type RankItem } from "@/lib/fair-exposure";


const todayQueryOptions = queryOptions({
  queryKey: ["ph-today"],
  queryFn: () => getTodayProducts(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "中文版 Product Hunt 新人公平曝光辅助系统" },
      {
        name: "description",
        content:
          "抓取 Product Hunt 今日榜单，AI 中文解读，并用去偏公平曝光算法重排，让优质新作不被头部噪音淹没。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "中文版 Product Hunt 新人公平曝光辅助系统" },
      {
        property: "og:description",
        content:
          "抓取 Product Hunt 今日榜单，AI 中文解读，并用去偏公平曝光算法重排，让优质新作不被头部噪音淹没。",
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
  const [mode, setMode] = useState<"fair" | "original">("fair");
  const [lambda, setLambda] = useState(0.45);

  const board = useMemo(() => {
    const raw: RankItem[] = data.products.map((p, i) => ({
      id: p.id,
      name: p.name,
      votes: p.votes_count,
      comments: p.comments_count,
      topics: p.topics,
      hasIntro: Boolean(p.ai_zh_intro),
      originalRank: i + 1,
    }));
    return buildFairBoard(raw, { lambda });
  }, [data.products, lambda]);

  const byId = useMemo(() => {
    const map = new Map<string, Product>();
    data.products.forEach((p) => map.set(p.id, p));
    return map;
  }, [data.products]);

  const list =
    mode === "fair"
      ? board.fair.map((it) => ({
          product: byId.get(it.id)!,
          rankDelta: it.rankDelta,
          isRisingNewcomer: it.isRisingNewcomer,
        }))
      : data.products.map((p) => ({ product: p, rankDelta: undefined, isRisingNewcomer: false }));

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
            <span className="text-lg md:text-xl font-bold text-primary">新人公平曝光榜</span>
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
        <div className="mb-5">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            中文版 Product Hunt 新人公平曝光辅助系统
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            {dateLabel} · AI 中文解读 + 去偏公平曝光重排，让优质新作被看见
          </p>
        </div>

        {data.products.length > 0 && (
          <>
            <FairExposurePanel
              before={board.before}
              after={board.after}
              rounds={board.rounds}
              lambda={lambda}
              onLambdaChange={setLambda}
            />

            <div className="inline-flex rounded-lg border border-border overflow-hidden mb-4">
              {(["fair", "original"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 text-xs md:text-sm transition-colors ${
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-primary"
                  }`}
                >
                  {m === "fair" ? "公平曝光榜" : "原始 Top 榜"}
                </button>
              ))}
            </div>
          </>
        )}

        {data.products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>今日榜单暂无数据。</p>
            <button onClick={handleRefresh} className="mt-3 text-primary hover:underline">
              立即拉取
            </button>
          </div>
        ) : (
          <section className="flex flex-col gap-3 md:gap-4">
            {list.map((it, i) => (
              <ProductCard
                key={it.product.id}
                product={it.product}
                rank={i + 1}
                rankDelta={it.rankDelta}
                isRisingNewcomer={it.isRisingNewcomer}
              />
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
