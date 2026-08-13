import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/SiteHeader";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "关于项目 · 中文版 Product Hunt 新人公平曝光辅助系统" },
      {
        name: "description",
        content:
          "项目背景、系统架构、技术选型与研究价值：以对抗马太效应为核心的新人公平曝光辅助系统。",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "关于项目 · 新人公平曝光辅助系统" },
      { property: "og:description", content: "项目背景、系统架构、技术选型与研究价值。" },
    ],
  }),
  component: AboutPage,
});

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-5 mb-4">
      <h2 className="text-base font-semibold text-foreground mb-2">{title}</h2>
      <div className="text-sm text-muted-foreground leading-7 space-y-2">{children}</div>
    </section>
  );
}

function AboutPage() {
  return (
    <PageShell
      title="关于项目"
      subtitle="中文版 Product Hunt 新人公平曝光辅助系统 · 面向内容生态平衡的推荐系统实践"
    >
      <Block title="项目背景与痛点">
        <p>
          在中文创作者接触 Product Hunt 的过程中存在两重障碍：一是语言门槛，英文简介让普通用户难以
          10 秒内理解产品价值；二是曝光不公，榜单以点赞排序导致「头部霸榜、新人沉寂」，
          优质新作被噪音淹没。
        </p>
        <p>
          本项目以对抗马太效应为核心目标，基于真实爬取的 Product Hunt
          数据与 AI 汉化结果，设计并实现一套新人公平曝光辅助系统，
          通过优化内容分发逻辑与曝光资源分配规则，让优质新内容获得突破流量壁垒的机会。
        </p>
      </Block>

      <Block title="系统功能模块">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <Link to="/" className="text-primary hover:underline">今日榜单</Link>
            ：抓取当日榜单，AI 生成中文简介与「这是什么」一句话解读，支持公平榜 / 原始榜切换。
          </li>
          <li>
            <Link to="/newcomers" className="text-primary hover:underline">新人专区</Link>
            ：算法识别的优质长尾新作扶持位。
          </li>
          <li>
            <Link to="/topics" className="text-primary hover:underline">分类浏览</Link>
            ：按话题聚合筛选。
          </li>
          <li>
            <Link to="/analytics" className="text-primary hover:underline">数据看板</Link>
            ：洛伦兹曲线、基尼系数、分群对比等马太效应量化分析。
          </li>
          <li>
            <Link to="/simulation" className="text-primary hover:underline">演化模拟</Link>
            ：λ / α / 轮数可调的策略型创作者多轮实验与参数敏感性分析。
          </li>
          <li>
            <Link to="/algorithm" className="text-primary hover:underline">算法说明</Link>
            ：完整公式与实现细节。
          </li>
          <li>
            <Link to="/archive" className="text-primary hover:underline">历史榜单</Link>
            ：每日数据归档回溯。
          </li>
        </ul>
      </Block>

      <Block title="技术架构">
        <ul className="list-disc pl-5 space-y-1">
          <li>前端：React 19 + TanStack Router/Query + Tailwind CSS，SSR 与移动端优先响应式。</li>
          <li>服务端：TanStack Start Server Functions，负责数据抓取、AI 调用与缓存。</li>
          <li>数据源：Product Hunt 官方 GraphQL API，按太平洋时区对齐每日榜单。</li>
          <li>AI 汉化：大模型批量结构化输出中文简介与通俗解读，结果落库缓存避免重复调用。</li>
          <li>数据库：云端 Postgres，按日期 + 产品 ID 唯一约束存储榜单快照，开启行级安全策略。</li>
          <li>算法层：纯前端可复算的去偏与公平重排模块，便于实验复现与参数调优。</li>
        </ul>
      </Block>

      <Block title="研究价值与局限">
        <p>
          价值：把推荐系统公平性研究（去偏 + 曝光公平 + 表现性反馈）落到真实数据场景，
          并以可视化方式验证「小幅精度代价换取显著公平提升」的结论。
        </p>
        <p>
          局限：质量分为无监督代理指标，缺少真实用户点击反馈；演化模拟基于行为假设，
          尚未接入线上 A/B 实验。后续可引入用户行为日志与因果去偏方法进一步校准。
        </p>
      </Block>
    </PageShell>
  );
}
