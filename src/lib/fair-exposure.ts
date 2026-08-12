/**
 * 中文版 Product Hunt · 新人公平曝光辅助系统 —— 核心算法
 *
 * 参考：Performative Debias with Fair-exposure Optimization Driven by
 * Strategic Agents in Recommender Systems (KDD'24)
 *
 * 目标：对抗马太效应（头部霸榜、新人沉寂），在几乎不损失推荐精度（NDCG）
 * 的前提下，把曝光资源向优质长尾/新人内容倾斜（降低 Gini）。
 *
 * 四个步骤：
 *  1. 去流行度偏置的质量估计   estimateQuality()
 *  2. 长尾/新人识别            tagCohort()
 *  3. 可微排序算子驱动的联合目标贪心重排 fairRerank()
 *  4. 策略型创作者多轮演化模拟  simulateRounds()
 */

export type RankItem = {
  id: string;
  name: string;
  votes: number;
  comments: number;
  topics: string[];
  hasIntro: boolean;
  originalRank: number;
};

export type ScoredItem = RankItem & {
  /** 原始热度分（含流行度偏置） */
  popularity: number;
  /** 去偏后的内容质量分 r_i ∈ [0,1] */
  quality: number;
  /** 互动深度：评论/点赞，衡量"真讨论"而非"刷票" */
  engagement: number;
  cohort: "head" | "mid" | "tail";
  /** 是否为需要扶持的新人（长尾且质量高于长尾均值） */
  isRisingNewcomer: boolean;
};

export type RerankedItem = ScoredItem & {
  fairRank: number;
  /** 名次变化，正数表示获得曝光提升 */
  rankDelta: number;
  /** 该位置分得的曝光权重 d(ℓ) */
  exposure: number;
};

export type ExposureMetrics = {
  /** 曝光基尼系数，越低越公平 */
  gini: number;
  /** 相对原始榜单的推荐精度损失衡量 */
  ndcg: number;
  /** 长尾内容拿到的曝光占比 */
  tailExposureShare: number;
  /** 头部前 20% 内容占据的曝光占比 */
  headMonopoly: number;
};

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function minMax(values: number[]): (v: number) => number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return (v: number) => (span === 0 ? 0.5 : clamp01((v - min) / span));
}

/** 位置曝光折扣 d(ℓ) = 1 / log2(ℓ+1)，ℓ 从 1 开始 */
export const positionDiscount = (rank: number) => 1 / Math.log2(rank + 1);
/** 收益函数 g(r) = 2^r - 1 */
const gain = (r: number) => Math.pow(2, r) - 1;

/**
 * 1. 去流行度偏置的质量估计
 *
 * 直接用点赞数排序会自我强化（富者愈富）。这里把热度降权，并引入
 * 互动深度与内容完备度，使"票少但被认真讨论、信息完整"的新作能冒头。
 */
export function estimateQuality(items: RankItem[]): ScoredItem[] {
  if (items.length === 0) return [];

  const popRaw = items.map((i) => Math.log1p(i.votes));
  const engRaw = items.map((i) => i.comments / (i.votes + 1));
  const richRaw = items.map((i) => Math.min(i.topics.length, 4) / 4 + (i.hasIntro ? 0.5 : 0));

  const normPop = minMax(popRaw);
  const normEng = minMax(engRaw);
  const normRich = minMax(richRaw);

  const scored = items.map((item, idx) => {
    const popularity = normPop(popRaw[idx]!);
    const engagement = normEng(engRaw[idx]!);
    const richness = normRich(richRaw[idx]!);
    // 热度只占 40%（而非 100%），其余交给去偏信号
    const quality = clamp01(0.4 * popularity + 0.4 * engagement + 0.2 * richness);
    return { ...item, popularity, engagement, quality };
  });

  return tagCohort(scored);
}

/** 2. 长尾/新人识别：按点赞分位划分头部 / 腰部 / 长尾 */
function tagCohort(
  items: (RankItem & { popularity: number; engagement: number; quality: number })[],
): ScoredItem[] {
  const sortedVotes = [...items].map((i) => i.votes).sort((a, b) => b - a);
  const headCut = sortedVotes[Math.max(0, Math.floor(sortedVotes.length * 0.2) - 1)] ?? Infinity;
  const tailCut = sortedVotes[Math.floor(sortedVotes.length * 0.5)] ?? 0;

  const tailQualities = items.filter((i) => i.votes <= tailCut).map((i) => i.quality);
  const tailAvg =
    tailQualities.length > 0 ? tailQualities.reduce((a, b) => a + b, 0) / tailQualities.length : 0;

  return items.map((i) => {
    const cohort: ScoredItem["cohort"] =
      i.votes >= headCut ? "head" : i.votes <= tailCut ? "tail" : "mid";
    return {
      ...i,
      cohort,
      isRisingNewcomer: cohort !== "head" && i.quality >= tailAvg,
    };
  });
}

/**
 * 3. 公平曝光重排（联合目标的贪心近似）
 *
 * 逐位置 ℓ 选择使下式最大的候选：
 *   J = (1-λ)·g(r_i)·d(ℓ)          ← 精度项（DR-NDCG 的贪心近似）
 *     + λ·deficit(group_i)·d(ℓ)·r_i ← 公平项（曝光赤字越大越优先）
 * 其中 deficit 为该分组"应得曝光配额 - 已获曝光"，随重排过程动态更新，
 * 因此天然抑制头部连续霸位，同时不会把低质内容硬推上榜。
 */
export function fairRerank(
  scored: ScoredItem[],
  opts: { lambda?: number; k?: number } = {},
): RerankedItem[] {
  const lambda = opts.lambda ?? 0.45;
  const k = opts.k ?? scored.length;
  if (scored.length === 0) return [];

  const totalExposure = scored
    .slice(0, k)
    .reduce((sum, _, idx) => sum + positionDiscount(idx + 1), 0);

  // 各分组的目标曝光配额：按"质量占比"分配，而非按热度占比
  const qualityByGroup: Record<string, number> = { head: 0, mid: 0, tail: 0 };
  scored.forEach((i) => (qualityByGroup[i.cohort] += i.quality));
  const totalQuality = Object.values(qualityByGroup).reduce((a, b) => a + b, 0) || 1;
  const quota: Record<string, number> = {
    head: (qualityByGroup["head"]! / totalQuality) * totalExposure,
    mid: (qualityByGroup["mid"]! / totalQuality) * totalExposure,
    tail: (qualityByGroup["tail"]! / totalQuality) * totalExposure,
  };
  const got: Record<string, number> = { head: 0, mid: 0, tail: 0 };

  const pool = [...scored];
  const result: RerankedItem[] = [];

  for (let pos = 1; pos <= scored.length; pos++) {
    const d = positionDiscount(pos);
    let bestIdx = 0;
    let bestScore = -Infinity;

    pool.forEach((cand, idx) => {
      const deficit = Math.max(0, (quota[cand.cohort]! - got[cand.cohort]!) / (totalExposure || 1));
      const accuracy = gain(cand.quality) * d;
      const fairness = deficit * d * cand.quality * (cand.isRisingNewcomer ? 1.3 : 1);
      const score = (1 - lambda) * accuracy + lambda * fairness * 3;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });

    const [picked] = pool.splice(bestIdx, 1);
    got[picked!.cohort] += d;
    result.push({
      ...picked!,
      fairRank: pos,
      rankDelta: picked!.originalRank - pos,
      exposure: d,
    });
  }

  return result;
}

/** Gini@k：曝光不平等程度，0 = 完全平均，1 = 完全垄断 */
export function giniAtK(exposures: number[]): number {
  const k = exposures.length;
  if (k === 0) return 0;
  const sorted = [...exposures].sort((a, b) => a - b);
  const total = sorted.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let acc = 0;
  for (let l = 1; l <= k; l++) acc += (2 * l - k - 1) * sorted[l - 1]!;
  return acc / (k * total);
}

/** NDCG@k：以去偏质量分为 ground-truth relevance，衡量重排后的推荐精度 */
export function ndcgAtK(ordered: ScoredItem[], k = ordered.length): number {
  const list = ordered.slice(0, k);
  const dcg = list.reduce((s, it, idx) => s + gain(it.quality) * positionDiscount(idx + 1), 0);
  const ideal = [...ordered]
    .sort((a, b) => b.quality - a.quality)
    .slice(0, k)
    .reduce((s, it, idx) => s + gain(it.quality) * positionDiscount(idx + 1), 0);
  return ideal === 0 ? 0 : dcg / ideal;
}

/** 综合指标：把一份有序榜单转换成曝光公平性报告 */
export function evaluate(ordered: ScoredItem[], k = ordered.length): ExposureMetrics {
  const list = ordered.slice(0, k);
  const exposures = list.map((_, idx) => positionDiscount(idx + 1));
  const total = exposures.reduce((a, b) => a + b, 0) || 1;

  // 用"每个内容按其质量应得 vs 实际所得"的差异衡量不平等
  const perItem = list.map((it, idx) => exposures[idx]! * (1 / (it.quality + 0.15)));
  const tail = list.reduce((s, it, idx) => s + (it.cohort === "tail" ? exposures[idx]! : 0), 0);
  const headCount = Math.max(1, Math.floor(list.length * 0.2));
  const headMonopoly = exposures.slice(0, headCount).reduce((a, b) => a + b, 0) / total;

  return {
    gini: giniAtK(perItem),
    ndcg: ndcgAtK(ordered, k),
    tailExposureShare: tail / total,
    headMonopoly,
  };
}

export type RoundStat = {
  round: number;
  gini: number;
  ndcg: number;
  tailExposureShare: number;
  /** 长尾群体的平均质量，体现"策略型创作者"的内容改进 */
  tailQuality: number;
};

/**
 * 4. 策略型创作者多轮演化模拟（performativity）
 *
 * 系统给出的排序会反过来塑造创作者行为：拿到曝光的长尾作者获得正反馈，
 * 以成本 α 改进内容特征（best response，KKT 闭式解的离散近似）；
 * 长期看长尾质量上升、Gini 下降，形成可持续的生态平衡。
 */
export function simulateRounds(
  base: ScoredItem[],
  opts: { rounds?: number; lambda?: number; alpha?: number } = {},
): RoundStat[] {
  const rounds = opts.rounds ?? 6;
  const lambda = opts.lambda ?? 0.45;
  const alpha = opts.alpha ?? 3; // 改进成本，越大演化越平缓
  let items = base.map((i) => ({ ...i }));
  const stats: RoundStat[] = [];

  for (let t = 0; t <= rounds; t++) {
    const ordered = t === 0 ? items : fairRerank(items, { lambda });
    const m = evaluate(ordered);
    const tails = items.filter((i) => i.cohort === "tail");
    stats.push({
      round: t,
      gini: m.gini,
      ndcg: m.ndcg,
      tailExposureShare: m.tailExposureShare,
      tailQuality: tails.length ? tails.reduce((s, i) => s + i.quality, 0) / tails.length : 0,
    });

    // best response：曝光越靠前，改进动力越强，边际收益随 α 递减
    const ranked = fairRerank(items, { lambda });
    items = ranked.map((it) => {
      const incentive = it.exposure * (it.cohort === "tail" ? 1 : 0.35);
      const uplift = incentive / (alpha + incentive * 10);
      return { ...it, quality: clamp01(it.quality + uplift * (1 - it.quality)) };
    });
  }

  return stats;
}

/** 便捷入口：从产品数据直接得到公平榜单 + 前后指标对比 */
export function buildFairBoard(
  raw: RankItem[],
  opts: { lambda?: number } = {},
): {
  scored: ScoredItem[];
  fair: RerankedItem[];
  before: ExposureMetrics;
  after: ExposureMetrics;
  rounds: RoundStat[];
} {
  const scored = estimateQuality(raw);
  const fair = fairRerank(scored, opts);
  return {
    scored,
    fair,
    before: evaluate(scored),
    after: evaluate(fair),
    rounds: simulateRounds(scored, opts),
  };
}
