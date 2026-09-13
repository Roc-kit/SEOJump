# SEOJump Growth / Workflow 交接文档

日期：2026-09-13

> 归档说明：2026-09-13 后，Growth System 已从扩展仓库迁移为同级独立目录 `/home/cislunar/App/SEOJump/growth/`，其中包含 Growth Skill。本文下方出现的旧 `SEOJump/growth/` 路径仅记录当时状态。

## 1. 当前项目定位

SEOJump 现阶段仍然是一个轻量 Chrome 扩展，不是 SEO Agent，也不是 SEO 数据平台。

核心产品模型：

```text
Context -> Action

Context:
- %selectedText%
- %currentUrl%
- %currentDomain%

Action:
- Google / Google Trends
- Ahrefs / Semrush / Similarweb
- Reddit / YouTube / 其他搜索与 SEO 工具
- Whois / Wayback / PageSpeed 等
```

产品宗旨：

> SEOJump 不替代 SEO 工具，而是让 SEO 工具更高效地被使用。

“免费工具”是重要的获客和新手场景，但不是产品边界。收费工具同样可以作为 Template，只要 SEOJump 能把上下文有效传递过去。

## 2. 第一目标用户

当前第一目标用户明确为：**SEO 新手**。

不要继续把当前产品规划发散到专业 SEO、AI Agent Power User、企业 SEO 团队等人群。

新手实际做 SEO 更接近问题驱动，而不是严格执行一套专家 SOP：

```text
遇到 SEO 问题
-> 问 ChatGPT / Gemini / Claude
-> Google 搜索
-> 看博客 / YouTube / 官方文档
-> Reddit / Facebook 群 / Forum 看真人经验
-> 打开 SEO 工具查真实数据
-> 修改网站
-> Google / GSC 看结果
-> 再遇到下一个问题
```

他们的主要痛点更可能是：

- 不知道下一步应该做什么；
- 不知道该使用哪个工具；
- 工具分散；
- 同一个关键词、URL、域名反复输入；
- AI、教程、社区、工具之间来回切换。

## 3. Workflow 的最新定义

Workflow 不应该等同于“一键打开很多标签页”，也不应该依赖自动抓取第三方页面数据。

当前最合理的 V1 模型：

```text
Guide
-> Open
-> Observe
-> Done
-> Next
```

例如 Keyword Research：

```text
1. Find ideas
   [Keyword Generator]
   [Google]

2. Check trend
   看什么：
   - 长期上涨 / 下降？
   - 是否有明显季节性？
   [Google Trends]

3. Inspect SERP
   看什么：
   - 前十是什么页面类型？
   - 有没有小网站？
   - 首页还是内页？
   [Google]
   [Ahrefs SERP Checker]

4. Check competition
   [Ahrefs KD]
   [Google intitle]

5. Decide
```

SEOJump 负责：

- 告诉用户为什么做这一步；
- 告诉用户打开页面后重点看什么；
- 打开正确工具；
- 记住 Workflow 进度；
- 允许快速返回之前已经打开的页面。

第三方工具负责展示真实数据。

## 4. 不抓第三方页面数据

V1 明确不做：

- 自动解析 Ahrefs / Semrush / Google Trends DOM；
- 自动抓 KD / Volume / DR 等字段；
- 依赖页面 selector 的长期维护；
- 自动化 Ahrefs Free 网页作为数据接口；
- iframe 嵌入多个第三方工具作为核心实现；
- 截图 / 附件 / 研究数据库。

原因：第三方页面随时会变，还有登录态、Cloudflare、A/B Test、地区差异和使用条款问题。

后续只有在真实用户需求出现后，才考虑 Notes、结构化字段、截图或 API/MCP。

## 5. Workflow 页面切换与状态

Side Panel 仍是最有希望的 Workflow UI，因为它可以在用户切换标签页时保持流程界面存在。

但 V1 不需要保存每一步的研究数据。

更简单的设计是记录每一步打开的 Tab：

```text
workflow session
  step-1 -> tabId 123
  step-2 -> tabId 127
  step-3 -> tabId 132
```

用户到了后面的步骤，如果想回看：

```text
点击之前的 Step / Tool
-> 对应 tab 仍存在：直接切回该 tab
-> tab 已关闭：按原 Template 重新打开
```

因此当前需要保存的状态很少：

```text
当前 Workflow
当前 Context
当前步骤 / 已完成步骤
Step <-> Tab 映射
```

不需要为“忘记前面看到什么”提前建设复杂笔记系统。

## 6. Workflow 应可自定义

不需要先研究出“唯一正确的前 5 个 Workflow”才开发产品框架。

正确方向：

> SEOJump 提供少量基础、通用的 Official Starter Workflows；用户可以自行增删步骤、替换工具、调整顺序和创建自己的 Workflow。

数据模型保持简单：

```text
Tool
= 一个 Action

Workflow
= 多个 Step

Step
= 标题 + 说明 + 一个或多个 Tool
```

概念示例：

```json
{
  "name": "Keyword Research",
  "steps": [
    {
      "title": "Check trend",
      "description": "Check whether demand is stable, seasonal or declining.",
      "tools": ["google-trends"]
    }
  ]
}
```

首批 Official Workflow 最终名称尚未锁死，可从以下通用任务中选择 2-4 个：

- Keyword Research
- Competitor Research
- SEO Audit
- Content / SERP Validation

重点不是先把数量定死，而是保证数据结构支持用户自定义。

## 7. Website 与 Extension 必须形成闭环

这是后续调整中非常重要的一部分，不能遗漏。

产品分工：

```text
Website = Discover / Learn / Configure
Extension = Execute
```

### 7.1 Tool Page -> Add to SEOJump

网站 Tool 页面未来主 CTA：

```text
[Add to SEOJump]
[Copy URL]
```

扩展已安装：直接添加 Tool Template。

扩展未安装：提示安装 SEOJump。

技术实现可评估 Chrome external messaging / `externally_connectable`，但开发前再确认具体方案。

### 7.2 Workflow Page -> Add Workflow to SEOJump

网站新增：

```text
/workflows/
/workflows/<slug>
```

Workflow 页面展示：

- 适合谁；
- 目标是什么；
- Step 列表；
- 包含哪些 Tool；
- 对应 Guide；
- `Add Workflow to SEOJump`。

点击后把 Workflow + 必要 Tool Templates 安装到扩展本地。

### 7.3 Guide <-> Workflow

网站内容体系不要继续以泛化 `/articles/` 为中心。

推荐关系：

```text
Guide
  teaches why/how
      ↓
Workflow
  organizes steps
      ↓
Tools
  execute actions
```

正式 Workflow 原则上应该有相应 Guide，Guide 以后应包含真实截图、短视频/录屏和真实案例。

### 7.4 Extension -> Website

扩展 Options / Side Panel 提供轻量链接即可，不需要把 Marketplace 全部塞进扩展：

```text
Discover Tools      -> 网站目录
Browse Workflows    -> /workflows/
SEO Guides          -> /guides/
Submit / Share      -> /submit/
```

### 7.5 User-created -> Share

后续用户自己创建 Tool / Workflow 后，可提供 `Share`：

```text
Extension
-> Share
-> 打开网站 Submit 页并预填内容
-> Review
-> Publish as Community Tool / Workflow
-> 其他用户 Add to SEOJump
```

形成闭环：

```text
Website Discover
-> Add to SEOJump
-> Extension Use / Customize
-> Share
-> Website Review / Publish
-> Other users Add
```

V1 不需要账号、云同步、Favorites、个人 Dashboard。

## 8. Side Panel 的定位

扩展保留两种不同形态，各自承担不同任务：现有工具栏保持当前 Quick Jump 形态不变；Side Panel 以 Guided Workflow 为主。

推荐结构：

```text
SEOJump Extension
├── Quick Jump
│   └── 当前已有选词 / URL / Domain 快捷动作
└── Guided Workflow
    └── Side Panel
```

对于熟练用户：继续使用 Quick Jump。

对于新手：Side Panel 给出步骤、说明、工具入口和进度。

Side Panel 是 Workflow 的主要承载界面，但不是要替代现有工具栏。暂时不需要因此改名，也不要拆成第二个扩展。

## 9. AI / MCP / Agent 结论

已经确认市场正在向 AI + SEO Data 发展：Ahrefs MCP、Semrush MCP、DataForSEO、AIsa、seo.web.cafe、Ahrefs Agent A 等都值得长期观察。

但当前不要把 SEOJump 做成 SEO Agent。

近期不做：

- AI SEO Agent 平台；
- MCP 聚合平台；
- DataForSEO / Ahrefs API 计费层；
- 自动调用多个付费数据源；
- Hosted AI Workflow。

这部分保留在 Tool / Market Radar 中即可。

## 10. Detailed SEO Extension 的正确定位

Detailed SEO Extension 不是 SEOJump 的直接竞争对手。

Detailed 核心：

```text
Current Page -> Inspect SEO information
```

SEOJump 核心：

```text
Current Context -> External Action
```

Detailed 的 Quick Access（当前站点跳 Ahrefs / Semrush / Similarweb / Archive 等）与 SEOJump 局部重合，因此只作为 Adjacent Product / Feature Benchmark。

后续真正应该寻找的同类产品：

- selected text -> configurable search / tool；
- current URL/domain -> configurable external tool；
- custom search engines；
- URL templates；
- SEO-specific context launcher。

## 11. Growth System 已有文件

目前仓库已经加入：

```text
SEOJump/growth/PLAYBOOK.md
SEOJump/growth/README.md
SEOJump/growth/opportunities.json

SEOJump/growth/evidence/
├── 2026-09-12-initial-demand-research.md
├── 2026-09-12-keyword-research-workflow.md
└── 2026-09-12-ai-data-workflow.md

SEOJump/growth/experiments/
└── keyword-research-workflow-product-gate.md

SEOJump/growth/references/
└── detailed-seo-extension-quick-links.md

SEOJump/.agents/skills/seojump-growth/SKILL.md
```

下一窗口需要按本交接文档重新收口这些文件：

- 将 SEO 新手明确为当前第一目标用户；
- 将 Beginner Journey Research 提升为近期市场研究重点；
- 将 AI Agent / MCP 自动化降为长期 Radar；
- 将 Workflow V1 改成 Guide -> Open -> Observe -> Done -> Next；
- 增加 Website <-> Extension 闭环原则；
- 删除/降级第三方数据抓取作为近期方向的内容。

## 12. 网站 Articles 的历史遗留

此前过早实现并部署过一批 Article / Extension 页面，包括：

```text
SEOJumpSite/src/data/articles.ts
SEOJumpSite/src/layouts/ArticleLayout.astro
SEOJumpSite/src/pages/articles/
SEOJumpSite/src/pages/extension.astro
```

这些不是当前确认后的最终内容体系。

建议下一窗口先处理为：

1. 不继续扩展这些文章；
2. 从主导航隐藏 Articles；
3. 草稿 Article 页面先 noindex；
4. 代码暂不删除；
5. 后续按 `/guides/ + /workflows/` 重做。

不要继续基于旧 Article 方向堆内容。

## 13. 当前 Git 状态提醒

当前扩展仓库和网站仓库都有未提交修改，不要直接 reset / clean。

扩展仓库当前包括此前 UI / favicon 修改，以及本轮新增的 `growth/` 和 `.agents/`。

网站仓库当前包括 UI / favicon 修改，以及此前过早新增的 Articles / Extension 页面。

开始下一步前先检查：

```bash
git status --short
git -C ../SEOJumpSite status --short
```

不要把旧 UI / favicon 修改误删。

## 14. 下一窗口建议执行顺序

不要直接开发完整 Workflow。

建议按以下顺序处理：

### Step 1 — 收口文档

先按本交接文档更新：

- `growth/PLAYBOOK.md`
- `growth/opportunities.json`
- `.agents/skills/seojump-growth/SKILL.md`

目标：所有文档和当前决策一致。

### Step 2 — 处理网站旧 Article 遗留

先隐藏 / noindex，不需要马上重写。

### Step 3 — 定义最小 Workflow 数据结构

只定义：

```text
Workflow
Step
Tool reference
title / description / order
```

必须支持用户自定义、排序、删除、替换 Tool。

不要提前做复杂 Engine。

### Step 4 — Website -> Extension：Add to SEOJump

先只实现单 Tool 的 `Add to SEOJump`，验证网站和扩展真正可以互通。

### Step 5 — Add Workflow to SEOJump

在单 Tool 通路稳定后再扩展到 Workflow。

### Step 6 — 最小 Side Panel Prototype

只做：

- Workflow 标题；
- Context；
- Step 列表；
- Step 说明；
- Tool 按钮；
- Done / Next；
- Step <-> Tab 跳转；
- 本地进度保存。

明确不做抓数据、截图、Notes、API、AI。

### Step 7 — Extension -> Website

加入 Discover Tools / Workflows / Guides / Submit / Share 的轻量入口。

### Step 8 — 再决定首发 Official Workflow / Guide

提供基础通用模板即可，不需要追求“唯一正确流程”。

## 15. 下一窗口开场指令

可直接使用：

> 读取 `SEOJump/docs/HANDOFF_2026-09-13_Growth_Workflow.md`，先检查两个仓库的 git status。按照交接文档从 Step 1 开始收口 Growth 文档和旧 Article 遗留，不要直接开发完整 Workflow，也不要做第三方页面数据抓取、AI Agent 或复杂 Workflow Engine。每一步保持最小化修改。

