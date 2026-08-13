import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUp, MessageCircle, ExternalLink, Sparkles } from "lucide-react";
import { getProductById } from "@/lib/products.functions";

const productQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["ph-product", id],
    queryFn: () => getProductById({ data: { id } }),
    staleTime: 5 * 60 * 1000,
  });

export const Route = createFileRoute("/product/$id")({
  loader: async ({ context, params }) => {
    const res = await context.queryClient.ensureQueryData(productQueryOptions(params.id));
    if (!res.product) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.product) {
      return {
        meta: [{ title: "产品未找到 · 新人公平曝光榜" }, { name: "robots", content: "noindex" }],
      };
    }
    const p = loaderData.product;
    const title = `${p.name} · 中文解读 | 新人公平曝光榜`;
    const desc = (p.ai_zh_intro ?? p.ai_zh_tagline ?? p.tagline ?? p.name).slice(0, 150);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(p.logo_url?.startsWith("https://")
          ? [
              { property: "og:image", content: p.logo_url },
              { name: "twitter:image", content: p.logo_url },
            ]
          : []),
      ],
    };
  },
  component: ProductDetail,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      未找到该产品
    </div>
  ),
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(productQueryOptions(id));
  const p = data.product!;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card sticky top-0 z-50 border-b border-border">
        <div className="flex items-center max-w-[800px] mx-auto px-4 h-16">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回榜单
          </Link>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-4 py-8">
        <div className="flex gap-4 items-start">
          <div className="w-20 h-20 flex-shrink-0 bg-muted rounded-xl overflow-hidden flex items-center justify-center">
            {p.logo_url ? (
              <img src={p.logo_url} alt={`${p.name} logo`} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary">{p.name.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0 flex-grow">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{p.name}</h1>
            <p className="text-base text-muted-foreground mt-1">{p.ai_zh_tagline ?? p.tagline}</p>
            {p.ai_zh_tagline && p.tagline && (
              <p className="text-xs text-muted-foreground/70 italic mt-1">{p.tagline}</p>
            )}
          </div>
          <div className="flex flex-col items-center bg-primary text-primary-foreground rounded-xl w-16 py-2">
            <ArrowUp className="w-5 h-5" strokeWidth={3} />
            <span className="text-sm font-bold mt-0.5">{p.votes_count}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <span className="text-xs text-muted-foreground">今日排名 #{p.rank}</span>
          {p.topics.map((t) => (
            <span
              key={t}
              className="bg-muted px-2 py-0.5 rounded text-[11px] uppercase tracking-wide text-muted-foreground"
            >
              {t}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            {p.comments_count}
          </span>
        </div>

        {p.ai_zh_intro && (
          <section className="bg-muted rounded-xl p-4 mt-6 border-l-4 border-primary">
            <h2 className="text-sm font-semibold text-primary inline-flex items-center gap-1 mb-2">
              <Sparkles className="w-4 h-4" />
              这是什么
            </h2>
            <p className="text-sm md:text-base text-foreground/85 leading-relaxed">
              {p.ai_zh_intro}
            </p>
          </section>
        )}

        {p.description && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-2">英文原文简介</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {p.description}
            </p>
          </section>
        )}

        {p.url && (
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-8 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-95"
          >
            <ExternalLink className="w-4 h-4" />
            在 Product Hunt 查看原帖
          </a>
        )}
      </main>
    </div>
  );
}
