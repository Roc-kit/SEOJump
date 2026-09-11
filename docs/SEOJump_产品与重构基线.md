# SEOJump 产品与重构基线

## 1. 产品定位

SEOJump 是一个面向 SEO 工作流的浏览器快捷跳转扩展。

它不是 SEO Audit 工具，也不是单纯的划词搜索扩展。核心能力是把当前浏览上下文快速发送到其他搜索、SEO、站点分析和域名工具。

三个一等公民 Context：

```text
%selectedText%   选中文字 / 关键词
%currentUrl%     当前页面完整 URL
%currentDomain%  当前页面域名
```

其中 `%currentUrl%` 和 `%currentDomain%` 是 SEOJump 相比普通 Selection Search 扩展的重要差异，必须长期保留。

## 2. 品牌

正式名称：`SEOJump`

推荐商店描述：

> Keyword, Page & Domain Tools for SEO

产品一句话：

> Jump selected text, the current page, or domain to your favorite SEO tools.

旧名称 `EasySwitchSearch / Easy Switch Search` 仅作为 Git 历史存在，不再作为当前产品名称使用。

## 3. 划词工具栏

支持三种模式：

```text
Ctrl + 划词
永久自动启用
关闭划词工具栏
```

### Ctrl + 划词

```text
按住 Ctrl
→ 划词
→ 显示 SEOJump 工具栏
```

普通划词不弹出工具栏。

Ctrl 只负责召唤工具栏。工具栏出现后，即使用户松开 Ctrl，也不应该立即消失。

### 永久自动启用

保留旧版本现有行为和现有定位算法。

不要重新设计自适应定位逻辑。此前尝试复杂自动定位时已经遇到兼容性问题。

### 关闭

关闭划词工具栏后，右键菜单仍然可用。

### 默认迁移策略

- 老用户升级：如果不存在新的触发模式配置，保持旧行为，即 `always`。
- 全新安装：默认使用 `Ctrl + 划词`，减少网页干扰。

## 4. 右键菜单

右键搜索菜单与划词工具栏互相独立。

无论划词工具栏设置为：

```text
Ctrl
Always
Off
```

右键搜索都必须继续可用。

## 5. 页面复制问题

历史问题：工具栏直接注入网页 DOM 后，部分页面执行“全选 → 复制”时，会把工具栏文本一起复制。

当前处理原则：

```text
beforecopy / copy
→ 临时隐藏 SEOJump toolbar
→ 浏览器完成复制
→ 下一事件循环恢复 toolbar
```

不接管用户剪贴板，不重新拼接富文本内容，不申请额外 clipboard 权限。

## 6. Advanced Action

Advanced Action 保留，但明确定位为：

```text
Advanced / Experimental
```

原因是它依赖目标网站 DOM、CSS Selector、SPA 渲染和前端框架行为，无法达到普通 URL Template 同等稳定性。

### Advanced Action 协议

统一使用：

```text
__seojump_start
__delay
__incognito
__input
__submit
__bruteAction
__text
```

### 本轮稳定性增强

1. Advanced Action 只绑定到刚刚创建的目标 tab，不再使用“同域名任意 tab”监听。
2. 等待元素从固定轮询改为 `MutationObserver + timeout`。
3. selector 支持 fallback：

```text
selector1 || selector2 || selector3
```

4. 输入后再次读取 value / textContent；若目标框架没有接受第一次写入，则进行一次 fallback 写入。
5. `__bruteAction` 继续保留，但属于最高风险实验模式。

## 7. 中英文界面

支持：

```text
English
简体中文
```

语言由用户在 Options 中主动切换并保存。

只翻译扩展自身 UI，例如：

- 基础设置
- 按钮
- 占位符说明
- 状态提示
- 导入导出对话框
- Popup

不自动翻译：

- 用户自定义分类名称
- 用户自定义工具名称
- URL Template

避免语言切换修改用户数据。

## 8. 重构原则

本轮允许大重构，但遵守以下约束：

1. Manifest V3 保持不变。
2. Vanilla JavaScript 保持不变。
3. SortableJS 保持不变。
4. 不引入 React / Vue / bundler。
5. 单个源码文件尽量不超过 500 行。
6. 按职责拆分，不为满足行数机械拆文件。
7. 已验证的历史交互优先于“代码看起来更漂亮”。

## 9. 当前代码结构

```text
background.js                  Service Worker 入口
options.js                     Options 入口与事件协调
popup.js                       Popup 入口

src/shared/settings.js         通用设置
src/shared/i18n.js             中英文 UI

src/background/search.js       URL Template / Advanced 参数 / 打开 tab
src/background/context-menu.js 右键菜单
src/background/favicon.js      favicon 获取

src/content/core.js            Content 状态 / 配置 / favicon
src/content/toolbar.js         工具栏 UI / 划词触发 / 复制保护
src/content/advanced-actions.js Advanced Action 执行器
src/content/main.js            Content Script 生命周期

src/options/state.js           Options 数据状态
src/options/render.js          渲染 / Sortable / URL Modal
src/options/io.js              JSON / CSV 导入导出
```

## 10. Options 拖动排序回归要求

拖动排序是本轮重构的重点回归项。

以下场景都必须保持 Sortable 可用：

```text
初次打开 Options
新增 Engine 后
删除 Engine 后
新增 Category 后
删除 Category 后
导入 JSON 后
导入 CSV 后
Reset 后
Category 排序后
Engine 排序后
```

数据数组是唯一状态源。DOM 排序结束后必须同步数组顺序与 data-index，不能形成两套状态。

## 11. 网站关系

历史目录：

```text
/home/cislunar/App/EasySwitchSearch/EasySwitchSearchSite/
```

其中 `searchengines1.1.tar.gz`、数据库备份和需求文档证明网站原本就是扩展的配套 Tool Library / Builder。

网站暂不在本轮扩展重构中一起修改。

以后恢复网站时，应以扩展当前协议为准，尤其统一：

```text
%selectedText%
%currentUrl%
%currentDomain%
```

旧文档中的 `%selecttext%` 不再作为规范格式。

## 12. Git 基线

重构前已建立：

```text
commit: 7130ab9  chore: checkpoint before refactor
tag:    backup/pre-refactor-20260911
branch: backup/pre-refactor-checkpoint
```

当前重构分支：

```text
refactor/seojump
```

远端仓库已改名：

```text
Roc-kit/SEOJump
```

