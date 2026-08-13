import { ArrowUp, MessageCircle, Sparkles, ExternalLink, Rocket, ChevronUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/products.functions";

export function ProductCard({
  product,
  rank,
  rankDelta,
  isRisingNewcomer,
}: {
  product: Product;
  rank: number;
  rankDelta?: number;
  isRisingNewcomer?: boolean;
}) {
  return (
    <article className="product-card-hover bg-card border border-border rounded-xl p-4 md:p-5 flex gap-4 items-start">
      <div className="hidden sm:flex flex-col items-center w-6 pt-2 text-muted-foreground text-sm font-semibold">
        {rank}
        {typeof rankDelta === "number" && rankDelta > 0 && (
          <span className="text-[10px] text-primary font-bold inline-flex items-center">
            <ChevronUp className="w-3 h-3" />
            {rankDelta}
          </span>
        )}
      </div>


      <div className="w-14 h-14 md:w-20 md:h-20 flex-shrink-0 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
        {product.logo_url ? (
          <img
            src={product.logo_url}
            alt={`${product.name} logo`}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl font-bold text-primary">{product.name.charAt(0)}</span>
        )}
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="text-lg md:text-xl font-semibold text-foreground truncate">
            <Link
              to="/product/$id"
              params={{ id: product.id }}
              className="hover:text-primary transition-colors"
            >
              {product.name}
            </Link>
          </h3>
          {product.ai_zh_intro && (
            <span className="bg-gradient-ai text-primary-foreground px-2 py-0.5 rounded text-[10px] font-bold tracking-wider inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI 解读
            </span>
          )}
          {isRisingNewcomer && (
            <span className="border border-primary/50 text-primary px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
              <Rocket className="w-3 h-3" />
              优质新人
            </span>
          )}
        </div>


        <p className="text-sm md:text-base text-muted-foreground mb-1">
          {product.ai_zh_tagline ?? product.tagline}
        </p>
        {product.ai_zh_tagline && product.tagline && (
          <p className="text-xs text-muted-foreground/70 mb-3 italic truncate">{product.tagline}</p>
        )}

        {product.ai_zh_intro && (
          <div className="bg-muted rounded-lg p-3 mb-3 border-l-4 border-primary">
            <p className="text-sm text-foreground/80 leading-relaxed">
              <span className="font-semibold text-primary mr-1">这是什么：</span>
              {product.ai_zh_intro}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {product.topics.slice(0, 3).map((t) => (
            <span
              key={t}
              className="bg-muted px-2 py-0.5 rounded text-[11px] uppercase tracking-wide text-muted-foreground"
            >
              {t}
            </span>
          ))}
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <MessageCircle className="w-4 h-4" />
            <span>{product.comments_count}</span>
          </div>
          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              查看原帖
            </a>
          )}
        </div>
      </div>

      <a
        href={product.url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center bg-primary text-primary-foreground rounded-xl w-14 md:w-16 py-2 transition-transform active:scale-95 hover:opacity-95"
        aria-label={`${product.votes_count} upvotes`}
      >
        <ArrowUp className="w-5 h-5" strokeWidth={3} />
        <span className="text-sm font-bold mt-0.5">{product.votes_count}</span>
      </a>
    </article>
  );
}
