import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/SiteHeader";

export const Route = createFileRoute("/algorithm")({
  head: () => ({
    meta: [
      { title: "算法说明 · 去偏与公平曝光优化 | 公平曝光系统" },
      {
        name: "description",
        content:
          "系统算法四步：去流行度偏置质量估计、长尾新人识别、曝光配额贪心重排、策略型创作者演化。",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "算法说明 · 去偏与公平曝光优化" },
      { property: "og:description", content: "论文方法落地：公式、流程与工程实现细节。" },
    ],
  }),
  component: AlgorithmPage,
});

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-5 mb-4">
      <h2 className="text-base font-semibold text-foreground mb-2">{title}</h2>
      <div className="text-sm text-muted-foreground leading-7 space-y-2">{children}</div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-muted/50 border border-border rounded-lg p-3 text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function AlgorithmPage() {
  return (
    <PageShell
      title="算法说明"
      subtitle="参考 Performative Debias with Fair-exposure Optimization Driven by Strategic Agents in Recommender Systems (KDD 2024)，在真实汉化榜单数据上落地实现。"
    >
      <Block title="问题定义">
        <p>
          Product Hunt 榜单以点赞数排序，先获得曝光的产品会得到更多点赞，进而占据更高位置——
          形成「富者愈富」的马太效应。优质但初始票数低的新作长期沉在尾部，无法被中文用户发现。
        </p>
        <p>
          目标：在几乎不损失排序精度（NDCG）的前提下，降低曝光基尼系数（Gini），
          提升长尾群体的曝光占比，并通过长期激励促使创作者提升内容质量。
        </p>
      </Block>

      <Block title="步骤一 · 去流行度偏置的质量估计">
        <p>
          直接使用点赞数会把历史偏置带入排序。系统把热度降权到 40%，
          引入互动深度（评论/点赞比，衡量真讨论而非刷票）与内容完备度（话题数、简介完整度）：
        </p>
        <Formula>{`pop_i  = norm(log(1 + votes_i))
eng_i  = norm(comments_i / (votes_i + 1))
rich_i = norm(min(|topics_i|,4)/4 + 0.5·hasIntro_i)

r_i = clip[0,1]( 0.4·pop_i + 0.4·eng_i + 0.2·rich_i )`}</Formula>
      </Block>

      <Block title="步骤二 · 长尾 / 新人识别">
        <p>
          按点赞分位划分头部（前 20%）、腰部、长尾（后 50%）。
          长尾中质量分不低于长尾均值者标记为「优质新人」，在重排时获得 1.3 倍公平权重。
        </p>
        <Formula>{`cohort_i = head  if votes_i ≥ Q80
           tail  if votes_i ≤ Q50
           mid   otherwise
isRising_i = (cohort_i ≠ head) ∧ (r_i ≥ mean(r | tail))`}</Formula>
      </Block>

      <Block title="步骤三 · 公平曝光重排（贪心近似）">
        <p>
          位置曝光折扣 d(ℓ) = 1 / log₂(ℓ+1)。按「质量占比」而非「热度占比」给每个分群分配曝光配额，
          逐位置选择联合目标最大的候选：
        </p>
        <Formula>{`J(i, ℓ) = (1−λ)·g(r_i)·d(ℓ)                    ← 精度项
        + λ·deficit(group_i)·d(ℓ)·r_i·w_i·3      ← 公平项

g(r) = 2^r − 1
deficit(G) = max(0, quota_G − exposure_G) / totalExposure
w_i = 1.3 若 i 为优质新人，否则 1`}</Formula>
        <p>
          deficit 随重排过程动态更新，天然抑制头部连续霸位；因公平项仍乘以 r_i，
          低质量内容不会被硬推上榜。
        </p>
      </Block>

      <Block title="步骤四 · 策略型创作者多轮演化（Performativity）">
        <p>
          排序结果会反过来塑造创作者行为。拿到曝光的长尾作者获得正反馈，以成本 α
          改进内容（最优响应的离散近似）：
        </p>
        <Formula>{`incentive_i = exposure_i · (1 if tail else 0.35)
uplift_i    = incentive_i / (α + 10·incentive_i)
r_i ← r_i + uplift_i · (1 − r_i)`}</Formula>
        <p>
          多轮迭代后长尾平均质量上升、Gini 持续下降，系统达到内容生态的可持续均衡。
          可在<Link to="/simulation" className="text-primary hover:underline">演化模拟</Link>页调参复现。
        </p>
      </Block>

      <Block title="评价指标">
        <ul className="list-disc pl-5 space-y-1">
          <li>Gini@K：曝光不平等程度，越低越公平。</li>
          <li>NDCG@K：相对去偏质量分的排序精度，衡量公平化的精度代价。</li>
          <li>长尾曝光占比：长尾群体获得的位置曝光总和 / 全部曝光。</li>
          <li>头部垄断度：前 20% 内容占据的曝光比例。</li>
        </ul>
        <p>
          实测结果见<Link to="/analytics" className="text-primary hover:underline">数据看板</Link>。
        </p>
      </Block>
    </PageShell>
  );
}
