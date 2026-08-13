import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getTodayProducts, type Product } from "@/lib/products.functions";
import { buildFairBoard, type RankItem } from "@/lib/fair-exposure";

export const todayQueryOptions = queryOptions({
  queryKey: ["ph-today"],
  queryFn: () => getTodayProducts(),
  staleTime: 5 * 60 * 1000,
});

export function toRankItems(products: Product[]): RankItem[] {
  return products.map((p, i) => ({
    id: p.id,
    name: p.name,
    votes: p.votes_count,
    comments: p.comments_count,
    topics: p.topics ?? [],
    hasIntro: Boolean(p.ai_zh_intro),
    originalRank: i + 1,
  }));
}

export function useToday(lambda = 0.45) {
  const { data } = useSuspenseQuery(todayQueryOptions);
  const board = useMemo(
    () => buildFairBoard(toRankItems(data.products), { lambda }),
    [data.products, lambda],
  );
  const byId = useMemo(() => {
    const m = new Map<string, Product>();
    data.products.forEach((p) => m.set(p.id, p));
    return m;
  }, [data.products]);
  return { date: data.date, products: data.products, board, byId };
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const week = ["日", "一", "二", "三", "四", "五", "六"][d.getUTCDay()];
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日 星期${week}`;
}
