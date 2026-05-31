import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Product = {
  id: string;
  ph_id: string;
  rank: number;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  url: string | null;
  topics: string[];
  votes_count: number;
  comments_count: number;
  ai_zh_tagline: string | null;
  ai_zh_intro: string | null;
  list_date: string;
};

type PHNode = {
  id: string;
  name: string;
  tagline: string;
  description: string | null;
  url: string;
  website: string | null;
  votesCount: number;
  commentsCount: number;
  thumbnail: { url: string } | null;
  topics: { edges: { node: { name: string } }[] };
};

const PH_QUERY = `
  query TodayPosts($postedAfter: DateTime!, $postedBefore: DateTime!) {
    posts(featured: true, order: RANKING, first: 30, postedAfter: $postedAfter, postedBefore: $postedBefore) {
      edges {
        node {
          id
          name
          tagline
          description
          url
          website
          votesCount
          commentsCount
          thumbnail { url }
          topics(first: 5) { edges { node { name } } }
        }
      }
    }
  }
`;

// Product Hunt's API returns today's launch list when date filters are plain
// YYYY-MM-DD strings. ISO timestamps can return an empty list even for valid days.
function todayPHRange(): { postedAfter: string; postedBefore: string; phDate: string } {
  const PST_OFFSET_MS = 8 * 60 * 60 * 1000;
  const nowPst = new Date(Date.now() - PST_OFFSET_MS);
  const y = nowPst.getUTCFullYear();
  const m = nowPst.getUTCMonth();
  const d = nowPst.getUTCDate();
  const phDate = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const next = new Date(Date.UTC(y, m, d + 1));
  const postedBefore = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  return { postedAfter: phDate, postedBefore, phDate };
}

async function fetchProductHunt(token: string): Promise<PHNode[]> {
  const { postedAfter, postedBefore } = todayPHRange();
  const variables = { postedAfter, postedBefore };
  const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: PH_QUERY, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Product Hunt API ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: { posts?: { edges: { node: PHNode }[] } }; errors?: unknown };
  if (json.errors) throw new Error(`PH GraphQL error: ${JSON.stringify(json.errors).slice(0, 200)}`);
  return (json.data?.posts?.edges ?? []).map((e) => e.node);
}

async function translateBatch(
  items: { name: string; tagline: string; description: string | null }[],
): Promise<{ zh_tagline: string; zh_intro: string }[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const prompt = `下面是 Product Hunt 上的 ${items.length} 个产品。请为每一个产品输出两段中文：
1) zh_tagline：将英文 tagline 翻译成简洁自然的中文（不超过 30 字）。
2) zh_intro："这是什么"——用一句通俗中文（30~60 字）告诉普通用户这个产品到底是干什么的、能解决什么问题。

按输入顺序返回，数量必须严格一致。

产品列表：
${items
  .map(
    (p, i) =>
      `${i + 1}. ${p.name}\n   tagline: ${p.tagline}\n   description: ${(p.description ?? "").slice(0, 400)}`,
  )
  .join("\n\n")}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "你是一位精通中英文的科技产品编辑，擅长把英文产品介绍翻译成自然、地道、易懂的中文。" },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_translations",
            description: "返回所有产品的中文翻译",
            parameters: {
              type: "object",
              properties: {
                translations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      zh_tagline: { type: "string" },
                      zh_intro: { type: "string" },
                    },
                    required: ["zh_tagline", "zh_intro"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["translations"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_translations" } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const argsStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!argsStr) throw new Error("AI returned no tool call");
  const parsed = JSON.parse(argsStr) as { translations: { zh_tagline: string; zh_intro: string }[] };
  return parsed.translations;
}

function todayPHDate(): string {
  // Product Hunt's leaderboard rolls at midnight Pacific Time
  return todayPHRange().phDate;
}

export const getTodayProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const date = todayPHDate();

  const { data: cached, error: readErr } = await supabaseAdmin
    .from("ph_products")
    .select("*")
    .eq("list_date", date)
    .order("rank", { ascending: true });

  if (readErr) throw new Error(readErr.message);
  if (cached && cached.length > 0) {
    return { date, products: cached as Product[] };
  }

  // Fetch fresh
  const token = process.env.PRODUCT_HUNT_TOKEN;
  if (!token) throw new Error("PRODUCT_HUNT_TOKEN not configured");

  const nodes = await fetchProductHunt(token);
  if (nodes.length === 0) return { date, products: [] };

  // Translate in one batched call
  let translations: { zh_tagline: string; zh_intro: string }[] = [];
  try {
    translations = await translateBatch(
      nodes.map((n) => ({ name: n.name, tagline: n.tagline, description: n.description })),
    );
  } catch (e) {
    console.error("translateBatch failed, continuing without AI:", e);
  }

  const rows = nodes.map((n, idx) => ({
    ph_id: n.id,
    list_date: date,
    rank: idx + 1,
    name: n.name,
    tagline: n.tagline,
    description: n.description,
    logo_url: n.thumbnail?.url ?? null,
    url: n.url,
    topics: n.topics?.edges?.map((e) => e.node.name) ?? [],
    votes_count: n.votesCount,
    comments_count: n.commentsCount,
    ai_zh_tagline: translations[idx]?.zh_tagline ?? null,
    ai_zh_intro: translations[idx]?.zh_intro ?? null,
  }));

  const { error: upErr } = await supabaseAdmin
    .from("ph_products")
    .upsert(rows, { onConflict: "list_date,ph_id" });
  if (upErr) console.error("Upsert error:", upErr);

  const { data: fresh } = await supabaseAdmin
    .from("ph_products")
    .select("*")
    .eq("list_date", date)
    .order("rank", { ascending: true });

  return { date, products: (fresh ?? []) as Product[] };
});

export const refreshTodayProducts = createServerFn({ method: "POST" })
  .inputValidator(z.object({}).optional())
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const date = todayPHDate();
    await supabaseAdmin.from("ph_products").delete().eq("list_date", date);
    return getTodayProducts();
  });
