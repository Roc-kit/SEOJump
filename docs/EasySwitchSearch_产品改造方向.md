# EasySwitchSearch 产品改造方向

## 1. 产品定位

EasySwitchSearch 保持为一个独立的浏览器扩展，不与 GoogleTrendsPlus 合并。

它的核心价值不是单纯的“划词搜索”，而是通过统一的 URL Template，把不同上下文快速发送到搜索引擎、SEO 工具、网站分析工具和其他在线服务。

当前应明确保留三种核心上下文：

- `%selectedText%`：用户当前选中的文本。
- `%currentUrl%`：当前页面完整 URL。
- `%currentDomain%`：当前页面域名。

其中 `%currentUrl%` 和 `%currentDomain%` 是 EasySwitchSearch 相比大量普通划词搜索扩展的重要差异，不应弱化或删除。

泛搜索同样保留。用户没有必要为了“普通搜索”和“SEO / Website / Domain 工具跳转”安装两个功能高度重叠的扩展。

---

## 2. 名称与图标

### 2.1 名称

现有名称 `Easy Switch Search` 可以继续作为开发阶段名称，但如果后续准备公开发布，建议重新评估名称。

原因：

- 名称较泛，难以体现 `%selectedText% + %currentUrl% + %currentDomain%` 的差异化能力。
- 市面上已经有大量 Selection Search、Context Search、Search Switcher 一类扩展，名称辨识度不足。
- 后续更适合突出“一个上下文快速打开多个工具”的产品特征，而不是只强调搜索引擎切换。

当前阶段不急于改名，等功能方向收口后再单独做名称检索和筛选。

### 2.2 图标

如果未来公开发布，建议重新设计图标，而不是继续沿用旧图标做小修小补。

图标设计原则：

- 优先保证 16×16、32×32 工具栏尺寸下仍然清晰。
- 尽量只表达一个核心概念：一个输入 / 上下文，快速跳转到多个工具。
- 避免复杂的“放大镜 + 地球 + 多个箭头”等传统搜索扩展图标组合。
- 可以抽象为“中心节点 + 多方向出口”或“搜索符号 + 多工具节点”。

现阶段不需要立即重做图标。

---

## 3. 划词工具栏触发方式

### 3.1 新增 Ctrl + 划词模式

新增一种低干扰触发方式：

```text
按住 Ctrl + 划词
→ 显示 EasySwitchSearch 工具栏

普通划词
→ 不显示工具栏
```

Ctrl 只负责“召唤”工具栏。

工具栏出现后，即使松开 Ctrl，也不要立即隐藏。工具栏继续保持正常交互，直到用户执行搜索、点击其他区域、按 Esc，或现有隐藏逻辑触发。

### 3.2 保留永久自动启用模式

必须完整保留当前行为：

```text
普通划词
→ 自动显示工具栏
```

此模式即“永久自动启用”。

该模式继续使用当前已有的工具栏定位逻辑，不重新设计自动避让、四方向碰撞检测或复杂动态定位。

原因：此前已经尝试过自动调整工具栏位置，容易引入新的兼容性和交互问题。当前优先降低改动范围，保持已有稳定行为。

### 3.3 建议设置项

设置页增加“划词工具栏”配置：

```text
划词工具栏

○ 按住 Ctrl 划词时显示（推荐）
○ 划词后自动显示
○ 关闭划词工具栏
```

建议默认值：

```text
按住 Ctrl 划词时显示
```

是否后续支持 Alt / Shift 等自定义修饰键，可以作为后续增强，不放入当前最小改造范围。

### 3.4 右键菜单独立保留

右键菜单搜索必须始终作为独立入口保留，不依赖划词工具栏模式。

即使用户设置：

```text
划词工具栏：关闭
```

仍然可以：

```text
选中文字
→ 右键
→ EasySwitchSearch
→ 选择搜索引擎 / 工具
```

因此 EasySwitchSearch 最终形成三种独立入口：

```text
Ctrl + Selection    低干扰快速入口
Auto Selection      高频用户入口
Context Menu        稳定备用入口
```

---

## 4. 当前问题：复制整个网页时会复制工具栏文本

### 4.1 原因

当前工具栏通过 Content Script 直接加入页面 DOM：

```js
document.documentElement.appendChild(toolbar);
```

因此在部分页面执行“全选 → 复制”时，EasySwitchSearch 工具栏中的文字可能进入复制内容。

CSS 中虽然已经使用：

```css
user-select: none;
```

但不能完全保证浏览器的整页 Selection / Copy 永远排除该 DOM。

### 4.2 推荐修复方式

不劫持剪贴板内容，也不重新拼接用户复制的数据。

建议在 `copy` 事件发生时暂时隐藏工具栏，浏览器完成原生复制后立即恢复：

```text
copy 开始
→ 临时隐藏 toolbar
→ 浏览器执行原生复制
→ 下一事件循环恢复 toolbar
```

目标是：

- 不修改用户真实复制内容。
- 不申请额外 clipboard 权限。
- 不破坏富文本复制。
- 尽量保持为最小修改。

该修复需要浏览器实测以下情况：

- Ctrl+A → Ctrl+C。
- 鼠标选择较大范围 → Ctrl+C。
- 工具栏显示状态下复制。
- 工具栏未显示状态下复制。
- 常规网页以及复杂 SPA 页面。

---

## 5. 顶部划词遮挡问题

当前不重新设计工具栏自动定位策略。

已有“永久自动启用”模式继续保留当前行为和现有定位逻辑。

本轮主要通过新增 `Ctrl + 划词` 模式降低工具栏无意出现的频率，从产品交互层面缓解顶部内容被挡住的问题。

对于希望始终自动弹出的用户，继续接受当前已有交互，不引入新的自动避让算法。

如果后续确认存在一个明确、可重复、低风险的定位 Bug，可以单独修复，但不在本轮做全面定位重构。

---

## 6. Advanced Action

### 6.1 定位

Advanced Action 保留，但明确标记为：

```text
Advanced / Experimental
高级 / 实验性功能
```

并向用户说明：

> 该功能依赖目标网站页面结构，网站更新后可能失效。

普通用户主要使用 URL Template；Advanced Action 面向少量无法通过 URL 参数直接传递关键词的网站。

### 6.2 当前主要问题

现有机制包括：

- `__delay`
- `__input`
- `__submit`
- `__bruteAction`
- `__text`
- `__incognito`

Content Script 会等待目标页面、查找 CSS Selector、模拟输入、点击或 Enter。

主要脆弱点：

- CSS Selector 单点依赖，目标网站 DOM 修改后容易失效。
- placeholder、class 等选择器稳定性较差。
- 页面 `loading` / hydration / SPA 初始化时机不固定。
- 目前依赖固定轮询、固定重试次数和固定延迟。
- `bruteAction` 行为过宽，容易误匹配多个元素。
- 缺少明确的“输入成功 / 点击成功 / 最终失败”状态验证。

### 6.3 后续改造方向

不删除现有 Advanced Action，也不立即破坏已有 URL 配置。

后续可以逐步升级为更明确的动作模型：

```text
Wait
Fill
Click
Press Enter
```

优先增强以下能力：

1. 一个动作允许多个 Selector fallback。

```text
selector A
失败
→ selector B
失败
→ fallback
```

2. 执行前等待页面 Content Script Ready，而不是简单依赖 `tabs.onUpdated` 的 loading / complete。

3. Fill 后验证目标元素是否真的获得预期值。

4. Click / Enter 后记录是否执行成功。

5. 对 `bruteAction` 降级处理，只保留作为最终实验性 fallback。

6. 旧 `__ess_start` 配置继续兼容，避免已有配置一次性失效。

本轮不要求全面重写 Advanced Action，只先确定后续改造原则。

---

## 7. Website / Domain 能力

Website / Domain 功能必须保留，并且后续应视为核心能力，而不是普通划词搜索的附属功能。

### 7.1 Selection Context

使用：

```text
%selectedText%
```

典型用途：

- Google / Bing / Reddit / YouTube 搜索。
- Google Trends。
- Ahrefs Keyword Generator。
- Ahrefs Keyword Difficulty。
- Semrush Keyword Overview。
- AlsoAsked。
- 各类关键词、内容、社媒搜索工具。

### 7.2 Page Context

使用：

```text
%currentUrl%
```

典型用途：

- PageSpeed。
- Wayback Machine。
- 单 URL Backlink。
- 单页面 SEO / Header / Performance 分析工具。

### 7.3 Domain Context

使用：

```text
%currentDomain%
```

典型用途：

- Similarweb。
- Ahrefs Traffic / Backlink / Authority。
- Whois。
- BuiltWith。
- `site:domain.com`。
- 竞争站点、域名、技术栈和 SEO 工具。

后续设置和默认工具配置，可以逐渐围绕这三种 Context 重新整理，但不要求本轮立即重构现有分类。

---

## 8. 当前改造优先级

### P0：最小可用改造

1. 新增 `Ctrl + 划词` 触发模式。
2. 保留“划词自动显示”现有模式，不修改现有定位逻辑。
3. 增加“关闭划词工具栏”模式。
4. 右键菜单完全独立保留。
5. 修复整页复制时工具栏文本被复制的问题。

### P1：Advanced Action 稳定性

1. UI 明确标记 Advanced / Experimental。
2. 增强 Selector fallback。
3. 增强页面 Ready / Element Ready 判断。
4. 增加 Fill / Submit 成功验证。
5. 降低 `bruteAction` 的默认使用优先级。

### P2：产品重新包装

1. 重新评估扩展名称。
2. 重新设计图标。
3. 重新整理默认工具列表。
4. 更清楚地区分 Selection / Page / Domain 三类使用场景。

---

## 9. 当前明确不做

本阶段不做以下内容：

- 不删除泛搜索功能。
- 不删除 `%currentUrl%` / `%currentDomain%`。
- 不把 EasySwitchSearch 合并进 GoogleTrendsPlus。
- 不重写整个扩展。
- 不全面重做工具栏自动定位算法。
- 不为了顶部遮挡问题给网页插入占位空间或修改页面布局。
- 不立即废弃现有 Advanced Action URL 配置。

本轮原则是：在保留旧项目核心能力和已有使用习惯的前提下，先降低划词工具栏干扰，并解决确定存在的复制问题，再逐步提高 Advanced Action 的健壮性。
