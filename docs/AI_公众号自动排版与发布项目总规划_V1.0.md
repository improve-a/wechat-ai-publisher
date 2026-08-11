# AI 公众号自动排版与发布项目总规划 V1.0

> **文档性质：项目基石 / 总纲**
>
> 本文档用于冻结项目目标、核心架构、阶段划分、交付物与验收标准。  
> 后续所有 Codex 开发提示词、架构调整、功能增删与验收，应以本文档为上位依据。

---

## 0. 项目一句话定义

用户提供 **文章素材 + 图片 + 主题/风格要求**，系统由 AI 自动完成：

**内容识别 → 结构理解 → 排版决策 → 微信兼容排版 → 预览与检查 → 生成公众号草稿 → 发布。**

目标体验：

```text
用户输入素材和主题
        ↓
AI 自动理解内容
        ↓
AI 自动选择版式、组件、层级和图片位置
        ↓
生成微信公众号兼容文章
        ↓
自动检查 + 手机预览
        ↓
进入公众号草稿箱
        ↓
人工确认 / AI 微调
        ↓
发布
```

---

# 1. 最终产品目标

## 1.1 用户输入

第一阶段优先支持：

- Markdown；
- 纯文本；
- 本地图片；
- 文章标题（可选）；
- 主题或风格要求，例如：
  - “极简科技风”；
  - “克制、理性、蓝灰色”；
  - “偏杂志感”；
  - “适合校园科技公众号”。

后续可扩展：

- Word；
- 网页文章；
- PDF；
- 多篇素材自动整合；
- URL / RSS / 知识库内容。

---

## 1.2 AI 自动完成的工作

AI 需要识别：

- 主标题；
- 副标题；
- 导语；
- 章节层级；
- 普通正文；
- 核心观点；
- 引用；
- 列表；
- 步骤；
- 提示信息；
- 图片与图注；
- 适合突出展示的句子；
- 段落之间的阅读节奏。

AI 进一步决定：

- 使用哪套 Theme；
- 每个内容块使用哪个组件；
- 哪些内容需要强调；
- 图片放在哪里；
- 标题采用什么视觉层级；
- 是否使用卡片、引用块、编号列表等；
- 全文留白、颜色、字号、间距等整体设计。

---

## 1.3 用户最终获得

至少生成：

1. 微信公众号兼容 HTML；
2. 375px 手机预览；
3. 自动排版检查结果；
4. 微信公众号草稿；
5. 可继续修改的项目状态；
6. 发布能力。

---

# 2. 产品原则

## 2.1 AI 负责“理解和决策”，程序负责“稳定执行”

核心原则：

```text
错误方向：
文章
 ↓
AI
 ↓
直接生成一大段任意 HTML/CSS

正确方向：
文章
 ↓
结构化内容
 ↓
AI 做排版决策
 ↓
结构化排版方案
 ↓
确定性组件 / Theme / Renderer
 ↓
微信 HTML
```

AI 不应该成为唯一的排版引擎。

AI 主要负责：

- 内容理解；
- 设计判断；
- 组件选择；
- Theme 选择；
- 局部修改意图理解。

程序负责：

- HTML；
- CSS；
- 微信兼容；
- 图片；
- 组件渲染；
- 校验；
- 发布。

这样才能保证生成结果稳定、可测试、可维护、可回退。

---

## 2.2 不做“另一个秀米”

本项目不是优先构建几百、几千个手工模板。

第一版采用：

```text
约 15 个高质量语义组件
        ×
约 3 套 Theme
        ×
有限 Variant
        ↓
AI 智能组合
```

重点是：

**AI 理解内容以后自动完成组合，而不是让用户手工挑模板。**

---

## 2.3 微信兼容规则必须程序化

微信公众号的 HTML/CSS 限制，不应只依赖 Prompt 提醒 AI。

凡是能够写成代码检查或 Renderer 约束的规则，应尽量程序化。

包括：

- inline style；
- 标签白名单；
- CSS 安全规则；
- 图片 URL；
- 图片最大宽度；
- 375px 移动端显示；
- 横向溢出；
- 不支持的定位；
- 不安全外部资源。

---

## 2.4 先草稿，后全自动发布

第一版正式产品目标：

```text
AI 自动生成
↓
自动进入公众号草稿箱
↓
人工最终确认
↓
人工点击发布
```

在系统足够稳定后，再增加：

```text
审核规则
↓
自动发布
```

避免早期错误内容被直接公开发布。

---

# 3. 总体架构

```text
┌──────────────────────┐
│      User Input       │
│ 素材 / 图片 / 主题要求 │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│    Article Parser     │
│      内容结构化        │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│   AI Layout Planner   │
│ 内容理解 + 排版决策    │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│      Layout AST       │
│      排版中间层        │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Components + Themes   │
│    组件库 + 主题系统    │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│   WeChat Renderer     │
│   微信兼容 HTML 生成   │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Validator + Preview   │
│ 自动检查 + 手机预览    │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│   WeChat Publisher    │
│ 图片 / 封面 / 草稿箱   │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│        Publish        │
│   人工确认 / 自动发布   │
└──────────────────────┘
```

---

# 4. 核心数据流

完整主链：

```text
原始素材
↓
Article AST
↓
AI Layout Planner
↓
Layout AST
↓
Components + Theme
↓
WeChat HTML
↓
Validator
↓
Preview
↓
WeChat Draft
↓
Publish
```

其中两个 AST 是项目长期稳定性的核心。

---

# 5. Article AST

Article AST 负责表达：

**“文章说了什么。”**

示意：

```json
{
  "title": "AI Agent 正在改变软件开发",
  "blocks": [
    {
      "id": "a1",
      "type": "paragraph",
      "text": "过去的软件开发……"
    },
    {
      "id": "a2",
      "type": "heading",
      "level": 2,
      "text": "从 Copilot 到 Agent"
    },
    {
      "id": "a3",
      "type": "quote",
      "text": "真正的变化并不是代码生成。"
    }
  ]
}
```

第一版支持：

- title；
- paragraph；
- heading；
- quote；
- ordered list；
- unordered list；
- image；
- image caption；
- divider；
- code；
- table。

---

# 6. Layout AST

Layout AST 负责表达：

**“文章应该怎样呈现。”**

示意：

```json
{
  "theme": "minimal-tech",
  "blocks": [
    {
      "id": "l1",
      "component": "article-title",
      "sourceBlockIds": ["a0"]
    },
    {
      "id": "l2",
      "component": "body-text",
      "sourceBlockIds": ["a1"]
    },
    {
      "id": "l3",
      "component": "section-title",
      "sourceBlockIds": ["a2"]
    },
    {
      "id": "l4",
      "component": "quote-card",
      "variant": "accent",
      "sourceBlockIds": ["a3"]
    }
  ]
}
```

必须保留：

```text
sourceBlockIds
```

确保视觉块可以追踪回原文内容。

这将直接支持：

- 局部重新排版；
- 修改原文后的同步；
- Undo / Redo；
- AI 局部调整；
- 版本管理。

---

# 7. 第一版组件系统

第一版不追求数量，优先保证质量。

## 7.1 基础组件

### 标题类

1. `ArticleTitle`
2. `Subtitle`
3. `SectionTitle`

### 正文类

4. `BodyText`
5. `LeadText`

### 强调类

6. `Highlight`
7. `QuoteCard`
8. `InfoCard`
9. `Note`

### 列表类

10. `BulletList`
11. `NumberList`
12. `StepList`

### 图片类

13. `Image`
14. `ImageCaption`

### 辅助类

15. `Divider`
16. `Ending`

第一版目标约：

**15～20 个组件。**

---

# 8. 第一版 Theme 系统

第一版只做三套：

## Theme A：Minimal

关键词：

- 极简；
- 留白；
- 克制；
- 黑白灰；
- 阅读优先。

## Theme B：Tech

关键词：

- 科技；
- 蓝色或冷色；
- 清晰层级；
- 适合 AI / 工程 / 科技内容。

## Theme C：Editorial

关键词：

- 杂志；
- 人文；
- 编辑感；
- 更强的标题层级；
- 适合观点与长文。

Theme 主要控制：

- 主色；
- 辅助色；
- 字号；
- 字重；
- 行高；
- 间距；
- 圆角；
- 边框；
- 组件默认 Variant。

---

# 9. 开发阶段总览

项目按以下七个正式阶段开发。

```text
M1 组件 + Theme
↓
M2 文章解析
↓
M3 AI 自动排版
↓
M4 微信 HTML
↓
M5 预览 + Validator
↓
M6 微信草稿箱
↓
M7 发布
```

参考 Skill 的拆解、规则整理作为各阶段的支撑任务执行，不单独取代主线开发。

---

# 10. M1：组件 + Theme 系统

## 目标

建立 AI 可以调用的稳定视觉语言。

## 要完成

- 定义组件接口；
- 实现约 15～20 个基础组件；
- 定义 3 套 Theme；
- 定义 Variant；
- 给每个组件制作测试样例；
- 建立组件展示页。

## 本阶段不做

- AI；
- 微信 API；
- 自动发布；
- 高级拖拽编辑器。

## 交付物

```text
Component Catalog
Theme Catalog
Component Demo Page
Component Tests
```

## PASS 条件

- 所有基础组件可稳定渲染；
- 3 套 Theme 均能作用于所有主要组件；
- 375px 下无明显布局问题；
- 组件 API 基本冻结。

最终状态：

```text
M1_COMPONENT_THEME_PASS
```

---

# 11. M2：文章解析

## 目标

把用户素材稳定转换成 Article AST。

## 第一版输入

- Markdown；
- 纯文本；
- 图片。

## 要完成

识别：

- 标题；
- 章节；
- 段落；
- 引用；
- 列表；
- 图片；
- 图注；
- 代码；
- 表格。

## 交付物

```text
Article Parser
Article AST Schema
Parser Tests
Example Fixtures
```

## PASS 条件

准备至少 20 篇不同结构测试文章：

```text
input
↓
Article AST
↓
serialize
↓
deserialize
↓
Article AST
```

结构保持稳定。

最终状态：

```text
M2_ARTICLE_AST_PASS
```

---

# 12. M3：AI 自动排版

## 目标

让 AI 从：

```text
Article AST
+
主题要求
```

生成：

```text
Layout AST
```

## AI 负责

- 判断文章风格；
- 选择 Theme；
- 识别重点；
- 选择组件；
- 决定视觉层级；
- 决定图片位置；
- 选择 Variant。

## AI 不负责

- 任意写 HTML；
- 任意写 CSS；
- 绕开组件系统。

## 必须加入

Layout Schema 校验。

流程：

```text
AI 输出
↓
Schema Validate
├─ 非法 → 修复 / 重试
└─ 合法 → Renderer
```

## PASS 条件

准备不同类型文章：

- 科技；
- 校园；
- 人文；
- 新闻；
- 教程；
- 观点；
- 活动通知。

要求 AI 可以稳定生成合法 Layout AST。

最终状态：

```text
M3_AI_LAYOUT_PASS
```

---

# 13. M4：微信 HTML Renderer

## 目标

将：

```text
Layout AST
+
Components
+
Theme
```

确定性生成：

```text
WeChat-compatible HTML
```

## 要完成

- inline style；
- 标签安全；
- 微信兼容 CSS；
- 图片尺寸；
- 移动端间距；
- 字体；
- 375px 页面布局。

## 核心要求

微信公众号规则由 Renderer 强制保证。

不把兼容性完全交给 AI。

## PASS 条件

同一份 Layout AST：

- 每次输出稳定；
- 无非法结构；
- 微信编辑器可正常接受；
- 375px 页面显示正常。

最终状态：

```text
M4_WECHAT_RENDERER_PASS
```

---

# 14. M5：预览 + 自动检查

## 目标

在进入微信草稿箱前发现排版问题。

## Web Preview

提供：

```text
375px 手机预览
```

至少支持：

- 实时预览；
- Theme 切换；
- 组件查看；
- 文章整体查看。

## Validator

检查：

- 不支持 CSS；
- 非法标签；
- `script`；
- `iframe`；
- `position: fixed`；
- 图片本地路径；
- 非 HTTPS 图片；
- 图片超宽；
- 横向滚动；
- 代码块爆宽；
- 不安全外部资源。

## Screenshot Test

使用浏览器实际渲染：

```text
375 × 812
```

并保存截图。

后续可以加入 Vision AI 视觉质检。

## PASS 条件

任何准备进入草稿箱的文章必须：

```text
Renderer PASS
Validator PASS
Preview PASS
```

最终状态：

```text
M5_PREVIEW_VALIDATOR_PASS
```

---

# 15. M6：微信公众号草稿箱

## 目标

完成：

```text
生成结果
↓
微信公众号草稿箱
```

## 要完成

- 微信公众号身份配置；
- Access Token；
- 图片素材上传；
- 封面上传；
- 正文图片处理；
- 创建草稿；
- 更新草稿；
- 草稿状态记录。

## 用户流程

```text
上传素材
↓
输入主题
↓
AI 自动排版
↓
预览
↓
“生成公众号草稿”
↓
公众号后台出现草稿
```

## 第一版安全边界

此阶段：

**禁止默认自动公开发布。**

## PASS 条件

一篇包含：

- 标题；
- 正文；
- 多级标题；
- 图片；
- 列表；
- 引用；
- 封面；

的完整文章，可以自动进入指定公众号草稿箱，并正常显示。

最终状态：

```text
M6_WECHAT_DRAFT_PASS
```

---

# 16. M7：发布

## 目标

打通完整工作流。

第一版建议：

```text
AI 自动生成
↓
进入草稿箱
↓
用户最终确认
↓
发布
```

后续再增加：

```text
AI / 规则自动审核
↓
自动发布
```

## 发布前门禁

必须同时满足：

```text
CONTENT_READY
LAYOUT_VALID
IMAGES_READY
WECHAT_RENDER_PASS
DRAFT_CREATED
USER_APPROVED
```

才允许正式发布。

## PASS 条件

端到端完成：

```text
素材
↓
主题
↓
AI 识别
↓
自动排版
↓
预览
↓
草稿
↓
确认
↓
发布
```

最终状态：

```text
M7_END_TO_END_PASS
```

---

# 17. 参考 Skill 的定位

现有他人初步完成的公众号 Skill 是本项目的重要参考资产，但不是最终架构。

重点吸收：

- 微信 HTML/CSS 规则；
- 375px 排版经验；
- 图片处理；
- inline-block 安全；
- 背景色兼容；
- SVG 兼容；
- WorkBench / Editor 交互经验；
- 截图检查；
- 自检流程；
- 微信发布流程；
- Chrome 注入经验。

原则：

```text
规则可以继承
经验可以继承
测试可以参考
代码按需要复用

但项目核心架构由本项目重新建立
```

尤其要把：

```text
Prompt 中的规则
```

尽可能升级为：

```text
Schema
Renderer
Validator
Test
```

---

# 18. Codex 使用原则

Codex 不接受“一次把整个产品做完”的任务。

必须按阶段执行。

每个阶段：

```text
读取项目总纲
↓
读取当前状态
↓
完成本阶段
↓
运行测试
↓
自审查
↓
输出验收结果
↓
Git Commit / PR
↓
进入下一阶段
```

Codex 每阶段至少输出：

```text
IMPLEMENTATION_RESULT=
TEST_RESULT=
REGRESSION_RESULT=
KNOWN_LIMITATIONS=
GIT_STATUS=
NEXT_STATE=
```

禁止：

- 无理由重构前序已验收模块；
- 绕开 AST 直接让 AI 生成最终 HTML；
- 为了 Demo 快速通过而破坏架构；
- 未测试就声明 PASS；
- 未经过 Validator 就推送到公众号；
- 默认自动公开发布。

---

# 19. Git 与版本管理

建议主分支：

```text
main
```

开发分支：

```text
feat/m1-components-theme
feat/m2-article-parser
feat/m3-ai-layout
feat/m4-wechat-renderer
feat/m5-preview-validator
feat/m6-wechat-draft
feat/m7-publish
```

每个阶段：

```text
实现
↓
测试
↓
Review
↓
Commit
↓
PR
↓
Merge
```

后续每一个 Layout、Theme、组件设计也应具备版本号。

---

# 20. 第一版明确不做的功能

为防止范围失控，以下功能不进入第一版主线：

- 数百个秀米式模板；
- 完整 Canva 式自由设计器；
- 多人协作；
- 商业化组件市场；
- 自动生成复杂 SVG 插画；
- 自动生成视频；
- 多平台同步发布；
- 完整 CMS；
- 多公众号团队权限系统；
- AI 完全自由编写任意 CSS；
- 无审核自动公开发布。

这些功能只能在 M7 完成后按价值追加。

---

# 21. M7 后可扩展方向

## M8：AI 对话式局部修改

例如：

> 第二个标题简单一点。

> 这里改成重点卡片。

> 整篇不要这么蓝。

AI 应修改 Layout AST，而不是整篇重生成。

---

## M9：高级图片 Pipeline

支持：

- 自动压缩；
- 自动裁剪；
- 图片素材库；
- AI 配图；
- 自动封面；
- 图注；
- CDN / 微信素材管理。

---

## M10：拖拽编辑器

支持：

- 组件拖动；
- 顺序调整；
- Theme 编辑；
- Variant 切换；
- 属性面板；
- Undo / Redo。

---

## M11：Sketch-to-Layout

用户只需要粗略拖出：

```text
标题

正文

[重点框]

图片

正文
```

AI 自动转换为正式 Layout AST。

---

## M12：更多输入源

支持：

- Word；
- 网页；
- PDF；
- Notion；
- 飞书；
- Google Docs；
- RSS；
- 多篇资料自动整合。

---

# 22. 第一版最终验收场景

选取一篇真实公众号文章素材：

```text
1. 用户上传 Markdown
2. 上传 3～5 张图片
3. 输入：
   “极简科技风，克制一些，蓝灰色”
4. AI 自动解析文章
5. AI 自动选择 Theme
6. AI 自动识别重点句
7. AI 自动选择组件
8. 自动生成微信 HTML
9. Validator 全部 PASS
10. 375px 手机预览正常
11. 图片上传成功
12. 生成微信公众号草稿
13. 用户在公众号后台看到完整文章
14. 用户确认
15. 发布
```

以上流程完整成功，才认为第一版产品完成。

最终项目状态：

```text
PROJECT_V1_PASS
```

---

# 23. 项目成功标准

这个项目成功，不是因为：

> “AI 能生成看起来不错的 HTML。”

而是因为它能够稳定做到：

```text
用户只提供：
素材
+
主题

系统自动完成：
理解
+
设计
+
排版
+
兼容
+
检查
+
草稿
+
发布
```

最终用户真正需要做的事情应尽量压缩到：

```text
给素材
↓
说想要什么风格
↓
看一眼
↓
发布
```

这就是本项目的核心产品价值。

---

# 24. 当前正式路线

```text
PROJECT_START
    ↓
M1_COMPONENT_THEME
    ↓
M2_ARTICLE_AST
    ↓
M3_AI_LAYOUT
    ↓
M4_WECHAT_RENDERER
    ↓
M5_PREVIEW_VALIDATOR
    ↓
M6_WECHAT_DRAFT
    ↓
M7_PUBLISH
    ↓
PROJECT_V1_PASS
```

后续所有开发优先围绕这条主线。

任何新增功能，如果不能直接帮助完成：

```text
素材 + 主题
↓
AI 自动排版
↓
公众号草稿
↓
发布
```

则默认降为后续阶段，不进入当前主线。

---

**文档版本：V1.0**  
**项目状态：PROJECT_PLAN_FROZEN_V1**  
**下一阶段：READY_FOR_M1_COMPONENT_THEME**
