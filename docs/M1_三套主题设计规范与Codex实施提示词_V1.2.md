# M1 三套主题设计规范与 Codex 实施提示词 V1.2

> **文档性质：M1 附件 / Theme 视觉规范 / Codex 实施约束**
>
> **V1.1 修订说明：**在 V1.0 的北理官微与官方 VI 基础上，进一步参考徐特立学院、特立书院的学院新闻、迎新晚会、体育赛事、学科专业体验、国际研学、社会实践等代表性内容，对三套 Theme 的适用边界和视觉气质进行校准。
>
> **V1.2 修订说明：**不改项目总规划 V1.0；补齐总规划 Article AST 已明确支持的 `code` / `table` 展示链路，将 M1 基础组件从 17 个扩展为 19 个；正式区分 `ThemeVariantId` 与 `ComponentVariantId`；统一 `defaultVariant` 合同；并明确 M1 最终 PASS 必须有真实 375px 浏览器视觉验收证据。
>
> 本文档不单独启动开发。  
> 后续应与《M1 组件 + Theme 系统》主提示词一并提供给 Codex。
>
> 本文档只负责冻结三套 Theme 的设计方向、视觉语言、组件默认表现和实现边界。  
> M1 的任务范围、仓库操作、提交方式等，以 M1 主提示词为准。
>
> **本附件不要求建立重型测试体系。**
>
> 文档状态：`THEME_SPEC_FROZEN_V1_2`

---

# 0. 设计背景

本项目的主要使用场景不是通用商业公众号，而是：

**北京理工大学校级 / 院级 / 学生组织等学校新媒体内容的自动排版。**

因此第一版 Theme 不采用泛化的：

```text
Minimal
Tech
Editorial
```

而改为围绕北理新媒体真实内容类型设计：

```text
BIT Official
BIT Innovation
BIT Youth
```

对应：

```text
BIT Official
学校 / 学院正式传播、新闻、通知、育人工作、重大事项

BIT Innovation
科研、工程、学术探索、拔尖培养、创新实践

BIT Youth
学生、校园、活动、青年成长、社会实践、青春叙事
```

这三套 Theme 不是三份固定模板。

它们应当是：

```text
Theme Tokens
+
Component Default Styles
+
Component Default Variants
+
少量可选 Variant
```

同一套组件系统在不同 Theme 下呈现不同视觉语言。

---

# 1. 设计依据

## 1.1 项目总纲

本项目第一版采用：

```text
约 15～20 个语义组件
×
3 套 Theme
×
有限 Variant
↓
AI 自动组合
```

Theme 的任务不是直接定义整篇文章结构，而是控制：

- 主色；
- 辅助色；
- 背景色；
- 字体层级；
- 行高；
- 字重；
- 留白；
- 圆角；
- 边框；
- 分隔方式；
- 组件默认 Variant；
- 卡片气质；
- 图片呈现方式。

文章最终使用什么组件，由后续 Layout Planner 决定。

---

## 1.2 北京理工大学官方视觉语言

根据北京理工大学当前官方视觉形象识别系统：

- 学校主色强调 **北理白色**；
- 辅助色包括 **北理绿**；
- 辅助色包括 **墨绿色**；
- 辅助色包括 **棕色**。

官方 VI 所列 Pantone 参考：

```text
北理绿    Pantone 347 C
墨绿色    Pantone 349 C
棕色      Pantone 1535 C
```

因此本项目的“北理风格”不得简单理解成：

```text
整页绿色
大量绿色背景
所有标题都绿色
所有卡片都绿色
```

更合理的整体原则是：

```text
白色作为主要阅读空间
+
北理绿建立品牌识别
+
墨绿色建立稳重层级
+
棕色提供少量暖色平衡
+
中性色保证正文可读性
```

---

## 1.3 北理新媒体内容结构

北理官方新媒体长期同时存在以下三类高频内容：

### A. 正式传播

例如：

- 学校新闻；
- 重要会议；
- 规划与政策；
- 通知；
- 荣誉喜报；
- 重要合作；
- 党建与重大主题。

### B. 科创传播

例如：

- 科研成果；
- 科技奖项；
- AI / 工程 / 前沿技术；
- 科研团队；
- 教师人物；
- 实验室；
- 创新人才培养；
- 学科成果。

### C. 青年校园传播

例如：

- 学生故事；
- 校园生活；
- 学生活动；
- 体育竞赛；
- 节日；
- 迎新 / 毕业；
- 招生；
- 校园指南；
- 青年人物。

三套 Theme 应分别服务这三类内容。

---

## 1.4 V1.1：徐特立学院 / 特立书院样本校准

V1.1 进一步参考徐特立学院、特立书院代表性新媒体内容，重点得到以下结论：

### A. 青年内容不是单纯“轻松校园风”

特立书院的迎新晚会、运动会、社会实践等内容，常同时包含：

```text
青年叙事
+
集体荣誉
+
五育并举 / 拔尖培养
+
家国使命 / 强国担当
```

因此 `BIT Youth` 的核心气质应从：

```text
年轻 + 温暖 + 轻松
```

校准为：

```text
昂扬 + 温暖 + 叙事 + 成长 + 使命感
```

它仍然年轻，但不应小清新化、娱乐化或过度可爱。

### B. 科创内容覆盖“科研成果”之外的学术成长

徐特立学院 / 特立书院大量内容处在：

```text
学生成长
×
专业探索
×
科研启蒙
×
拔尖培养
×
国际交流
```

之间。

因此 `BIT Innovation` 不仅服务科研成果，还应自然覆盖：

- 学科专业体验；
- 学术论坛；
- 科研启蒙；
- 创新实践；
- 国际学术研学；
- 实验室 / 项目平台；
- 拔尖人才培养；
- 学生科研成长。

### C. 正式主题必须覆盖“育人工作传播”

徐特立学院正式新闻中，会议、专题学习、人才培养改革、学院书院协同育人等内容占有稳定位置。

因此 `BIT Official` 不仅是“学校新闻风”，还应覆盖：

```text
学院正式传播
+
育人工作
+
会议 / 政策 / 制度
+
重要新闻
```

### D. 两类高频视觉能力必须进入 M1

V1.1 新增两项重点能力：

1. **ChapterTitle / 篇章式标题**
   - 服务迎新晚会、人物故事、活动回顾、研学纪实等具有明显叙事章节的内容；
   - 支持类似“第一篇章 / 初见 / 相知 / 共融”的分篇章表达；
   - 文案必须来自 Article / Layout 数据，组件不得自行生成章节名。

2. **Highlight.metric / 数字成果型强调**
   - 服务竞赛成绩、科研成果、社会实践、招生数据、育人成效等；
   - 支持“大数字 + 单位 / 标签 + 简短说明”；
   - 不建立 Dashboard，不把整篇文章数据看板化。

### E. 代表性参考样本

本次校准参考的代表页面包括：

- 特立书院“特立星程·E路同行”迎新晚会；
- 特立学子 2025 新生运动会总分第一；
- 2026 年学科专业体验季；
- 徐特立学院 / 未来精工技术学院东京大学研学实践；
- 特立书院暑期社会实践重点团答辩；
- 徐特立学院专题学习会等正式学院新闻。

参考地址：

```text
https://xuteli.bit.edu.cn/sysh/947819726a2e4a9dab0816cc8ed59429.htm
https://xuteli.bit.edu.cn/sysh/8b2bdebcbcc84aac9ac7f97fd1d02ff1.htm
https://xuteli.bit.edu.cn/sysh/7e3e94854f3445419e1520527e01d24e.htm
https://xuteli.bit.edu.cn/sysh/fbe9aa3f306b411ba06cd550924695d8.htm
https://xuteli.bit.edu.cn/sysh/a71b02e3b651468cb7b683ee60894b6a.htm
https://xuteli.bit.edu.cn/zhxw/6d11d74765cf423fa0091f46db2b8b36.htm
```

---

## 1.5 V1.2：code / table 链路与 Variant 合同校准

项目总规划 V1.0 已将 `code` 与 `table` 列入第一版 Article AST 支持范围。

因此 M1 组件层必须存在稳定承接组件，避免后续出现：

```text
Article AST
  有 code / table
        ↓
Layout AST
        ↓
Components
  无对应组件
```

V1.2 正式新增：

```text
CodeBlock
Table
```

基础组件总数由：

```text
17
```

升级为：

```text
19
```

M1 只负责稳定展示：

```text
CodeBlock
→ 代码文本 / language / caption 的稳定排版

Table
→ columns / rows / caption 的稳定排版
```

第一版明确不做：

- 复杂语法高亮引擎；
- 可编辑代码 IDE；
- 表格编辑器；
- Markdown → Table / CodeBlock 转换；
- 超复杂合并单元格；
- Dashboard。

V1.2 同时正式区分两种完全不同的 Variant：

```text
ThemeVariantId
```

表示整篇文章在某个 Theme 下的轻量风格分支，例如：

```text
bit-innovation / data
bit-youth / event
```

以及：

```text
ComponentVariantId
```

表示单个组件自身的表现分支，例如：

```text
highlight / metric
```

后续不得再使用一个含糊的 `variant` 字段同时表达这两种概念。

未来 Layout AST 语义建议：

```json
{
  "theme": "bit-innovation",
  "themeVariant": "data",
  "component": "highlight",
  "componentVariant": "metric",
  "sourceBlockIds": ["a17"]
}
```

Theme 的默认 Variant 合同统一冻结为：

```text
defaultVariant: ThemeVariantId | null
```

正式值：

```text
bit-official
→ defaultVariant = "default"

bit-innovation
→ defaultVariant = "research"

bit-youth
→ defaultVariant = null
```

其中：

```text
null = bit-youth 基础视觉
```

不得默认假定所有青年内容都是 `story`。

---

# 2. 总体设计原则

三套 Theme 必须同时遵守以下原则。

## 2.1 阅读优先

公众号首先是长文本阅读界面。

任何视觉设计都不能明显降低：

- 连续阅读舒适度；
- 中文段落可读性；
- 标题识别速度；
- 图片观看体验；
- 手机端稳定性。

不要为了“设计感”牺牲正文。

---

## 2.2 北理感来自系统，而不是 Logo 堆叠

不得通过反复放置：

- 校徽；
- 校名；
- “BIT”文字；
- 北理工 Logo；

来制造所谓“北理感”。

品牌感主要来自：

- 白色空间；
- 北理绿；
- 墨绿色；
- 克制的暖色；
- 稳定的标题系统；
- 高校气质；
- 工程理性；
- 青年气质。

除非文章素材本身提供 Logo，否则 Theme 不应自动向正文插入学校 Logo。

---

## 2.3 不做传统模板网站风格

禁止大量使用：

- 复杂背景图；
- 花边；
- 装饰性 SVG 堆叠；
- 大量渐变；
- 霓虹发光；
- 玻璃拟态；
- 大阴影；
- 立体按钮；
- 复杂绝对定位；
- 依赖 JavaScript 的视觉效果；
- 每段一个卡片；
- 过度圆角。

目标不是“炫技”。

目标是：

```text
学校官方新媒体
+
现代
+
干净
+
有辨识度
+
适合自动排版
```

---

## 2.4 兼顾后续微信 Renderer

M1 阶段可以使用正常前端 CSS 构建 Demo。

但视觉方案本身必须尽量能够在后续 M4 中转换为微信兼容 HTML。

因此优先使用：

- padding；
- margin；
- border；
- border-radius；
- background-color；
- font-size；
- font-weight；
- line-height；
- text-align；
- inline / inline-block；
- 简单 block 布局。

谨慎使用：

- CSS Grid；
- 复杂 Flex；
- absolute；
- pseudo-element；
- filter；
- backdrop-filter；
- mask；
- clip-path；
- transform；
- animation。

不要让 Theme 的核心视觉依赖这些能力。

---

# 3. 公共 Theme Token 建议

Theme 应以统一 Token 接口实现。

不要求为了 Token 系统进行复杂抽象，但至少不要把颜色和间距散落硬编码在所有组件中。

建议具有类似以下语义：

```text
colors
typography
spacing
radius
border
shadow
componentDefaults
```

具体代码结构可根据现有技术栈决定。

---

## 3.1 Web 实现基础色

以下 HEX 用作第一版 Web 实现参考。

注意：

**Pantone 与屏幕 RGB 并非严格一一对应。**

因此以下值是用于产品实现的 Web 近似值，必须集中为 Token，禁止散落硬编码，方便后续根据宣传部门提供的正式数字色值整体替换。

```text
bitWhite        #FFFFFF

bitGreen        #009A44
参考 Pantone 347 C

bitDarkGreen    #046A38
参考 Pantone 349 C

bitBrown        #94450B
参考 Pantone 1535 C
```

中性色建议：

```text
inkStrong       #1F2321
ink             #303532
inkSecondary    #626A65
inkMuted        #8B938E

surface         #FFFFFF
surfaceSoft     #F6F8F6
surfaceWarm     #FAF7F2

line            #E4E9E5
lineStrong      #CDD6D0
```

允许每个 Theme 基于这些 Token 派生浅色背景。

不要再引入大量无必要品牌色。

---

## 3.2 字体

第一版禁止依赖外部 Web Font。

中文优先使用系统字体栈，例如：

```css
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
"PingFang SC",
"Hiragino Sans GB",
"Microsoft YaHei",
Arial,
sans-serif
```

核心原则：

```text
标题靠字号 / 字重 / 间距建立层级
而不是靠特殊字体建立层级
```

---

## 3.3 正文基础参数

三套主题正文不需要为了“差异”而完全不同。

建议基线：

```text
BodyText
font-size: 16px
line-height: 1.8 ～ 2.0
paragraph spacing: 14 ～ 20px
letter-spacing: 0 ～ 0.02em
```

正文颜色避免纯黑：

```text
#2A2F2C ～ #343A36
```

辅助文字：

```text
13 ～ 14px
较低对比度
```

---

## 3.4 手机宽度

所有 Theme 默认以：

```text
375px viewport
```

作为主要设计观察宽度。

正文视觉安全区建议：

```text
左右 16 ～ 20px
```

图片可根据组件类型：

```text
正文宽度
或
接近全宽
```

但不得制造横向滚动。

---

# 4. Theme A — BIT Official

```text
Theme ID: bit-official
中文名：北理·正式
英文名：BIT Official
```

---

## 4.1 Theme 定位

BIT Official 是项目的：

**默认官方传播主题。**

关键词：

```text
权威
稳重
清晰
克制
现代
正式
可信
秩序
育人
学院气质
```

它不能看起来：

- 老气；
- 公文 Word 风；
- 政务网站风；
- PPT 汇报风。

也不能过于：

- 活泼；
- 营销；
- 网红；
- 互联网产品化。

目标感觉：

> 北京理工大学官方账号制作的一篇现代、干净、可信的正式推文。

---

## 4.2 适用内容

优先用于：

- 学校新闻；
- 学院正式新闻；
- 会议报道；
- 专题学习；
- 重要通知；
- 学校 / 学院规划；
- 政策与制度解读；
- 人才培养改革；
- 学院书院协同育人；
- 育人工作总结；
- 重大合作；
- 荣誉信息；
- 新闻通稿；
- 校级 / 院级重要事项；
- 党建 / 思政等重大主题；
- 不确定使用什么 Theme 时的默认选择。

---

## 4.3 不优先用于

以下内容原则上优先选择其他 Theme：

- 强科研数据展示 → `bit-innovation`
- 学科体验 / 学术研学 / 创新实践 → `bit-innovation`
- 学生人物与成长故事 → `bit-youth`
- 体育 / 文艺 / 校园活动回顾 → `bit-youth`
- 技术成果深度介绍 → `bit-innovation`

注意：如果一篇内容虽然围绕学生或培养，但核心是**学院正式工作、制度、会议或育人成效发布**，仍优先使用 `bit-official`。

---

## 4.4 色彩策略

视觉占比建议：

```text
白色 / 浅色空间      约 75%～85%
中性色正文            主要文字
北理绿                主要品牌强调
墨绿色                深层级标题 / 强调
棕色                  极少量暖色点缀
```

不要做大面积高饱和绿色正文背景。

### 推荐 Token

```text
background        #FFFFFF
surface           #FFFFFF
surfaceMuted      #F6F8F6

primary           bitGreen
primaryStrong     bitDarkGreen
accent            bitBrown

textStrong        #1F2321
text              #303532
textSecondary     #626A65

border            #DDE5DF
borderStrong      #BFCBC3
```

---

## 4.5 标题体系

### ArticleTitle

目标：

```text
大方
稳
有正式媒体感
```

建议：

```text
font-size: 26 ～ 30px
font-weight: 700
line-height: 1.3 ～ 1.45
color: textStrong
```

标题本身不必强制绿色。

优先：

```text
深色主标题
+
绿色小标 / 细线 / 元信息
```

而不是：

```text
整段绿色大标题
```

---

### Subtitle

建议：

```text
15 ～ 17px
中等字重
textSecondary
```

与主标题之间保持明确但不过大的间隔。

---

### SectionTitle

默认风格：

**左侧品牌色短竖线 + 深色标题。**

例如视觉逻辑：

```text
┃ 01 章节标题
```

但不要真的依赖特殊 Unicode 装饰字符。

可通过 border-left 或普通块结构实现。

建议：

```text
20 ～ 22px
font-weight: 650 ～ 700
margin-top 明显大于 margin-bottom
```

默认不使用巨大的绿色底块。

### ChapterTitle

BIT Official 下的 ChapterTitle 只用于确有“篇章 / 阶段 / 部分”结构的正式内容。

建议：

```text
PART 01 / 第一部分
标题
```

或：

```text
01
阶段标题
```

保持克制，不做大型舞台式章节页。

---

## 4.6 正文

BodyText 应是三套 Theme 中最稳的一套：

```text
16px
line-height: 1.9
深灰文字
段落间距充分
```

正文中的品牌绿只用于：

- 超链接；
- 少量关键词；
- 重点标签；

不得把整句正文频繁改成绿色。

---

## 4.7 LeadText

导语应建立文章开场节奏。

推荐：

```text
17px
line-height: 1.85
font-weight: 500
```

可使用：

```text
左边细绿色线
或
浅绿色背景
```

但保持平面、正式。

---

## 4.8 Highlight

默认设计：

```text
不创建巨大卡片
不使用荧光笔式刺眼底色
```

优先方式：

```text
加粗
+
墨绿色 / 北理绿
+
极浅绿色背景（可选）
```

适合一句关键结论。

---

## 4.9 QuoteCard

建议：

```text
白色或极浅灰绿色底
左侧 3～4px 墨绿色线
16～17px 引用正文
较大的上下 padding
```

不要使用：

- 超大引号背景；
- 复杂图形；
- 大阴影。

---

## 4.10 InfoCard

默认：

```text
浅灰绿色背景
1px 边框
6～8px 圆角
```

适合：

- 时间；
- 地点；
- 事项；
- 关键信息；
- 说明。

信息结构应优先于装饰。

---

## 4.11 Note

Note 比 InfoCard 更轻。

建议：

```text
小字号
浅色背景
左侧小标签
```

用于：

- 注释；
- 来源；
- 补充说明；
- 编辑提示。

---

## 4.12 列表

BulletList：

```text
使用小圆点 / 小方点
品牌绿可用于 marker
正文保持深灰
```

NumberList：

```text
数字可使用北理绿
数字与正文分离清楚
```

StepList：

BIT Official 下应较正式：

```text
01
02
03
```

避免卡通步骤条。

---

## 4.13 Image

正式主题下图片：

```text
优先矩形
圆角 4 ～ 6px
```

也允许无圆角。

不要默认：

- 大阴影；
- 厚边框；
- 拍立得样式；
- 花哨蒙版。

---

## 4.14 ImageCaption

```text
13px
textSecondary
居中或左对齐
与图片距离 6 ～ 8px
```

不要抢夺正文注意力。

---

## 4.15 Divider

推荐：

```text
细线
短线
或非常简单的品牌色几何分隔
```

不要使用复杂花纹。

---

## 4.16 Ending

结尾适合：

```text
简洁留白
+
一句结束语
+
细分隔线
```

不得默认加入 Logo、二维码或关注引导。

这些应由正文素材决定。

---

## 4.17 CodeBlock

BIT Official 下的 `CodeBlock` 应服务于：

- 命令；
- 配置；
- 简短代码；
- 正式信息中的技术片段。

建议：

```text
浅灰 / 浅灰绿色背景
深色代码文字
轻边框
4～6px 圆角
清晰 caption / language 元信息
```

不要做黑底终端风，也不要通过高饱和语法色破坏正式气质。

---

## 4.18 Table

BIT Official 下的 `Table` 应像正式信息表，而不是 Excel 截图。

建议：

```text
清晰表头
低对比度边框
适度单元格 padding
白色 / 极浅灰绿色背景
```

优先保证扫描效率、信息对应关系和 375px 可用性。

---

## 4.19 BIT Official Variants

第一版只需少量 Variant。

### default

适合普通正式稿件。

### notice

用于通知 / 指南类。

变化：

```text
InfoCard 更突出
列表层级更清楚
重点信息更容易扫描
```

### honor

用于获奖 / 喜报。

变化：

```text
允许少量棕色 / 暖色强调
重点数字和荣誉名称更加突出
但避免俗艳“金色喜报模板”
```

### ceremonial

用于重大主题。

第一版不需要建立整套红色视觉系统。

只需允许主提示词未来传入额外 accent。

默认仍应保持北理官方视觉基础。

---

## 4.20 BIT Official 禁止项

禁止：

```text
大片绿色底
金色渐变大字
传统喜报边框
政务红黄模板
复杂纹章
PPT 风图标矩阵
大面积阴影
玻璃拟态
营销按钮
```

---

# 5. Theme B — BIT Innovation

```text
Theme ID: bit-innovation
中文名：北理·科创
英文名：BIT Innovation
```

---

## 5.1 Theme 定位

这是最能体现北理“工程科技高校”气质的一套主题。

关键词：

```text
科研
工程
理性
探索
学术
前沿
数据
创新
拔尖培养
实践
国际视野
清晰
克制的科技感
```

目标感觉：

> 高水平工科大学的科研、学术探索与拔尖培养内容：理性、清晰、前沿，有工程气质，也能承载学生从专业探索走向科研创新的成长过程，而不是商业科技公司的产品发布页。

---

## 5.2 适用内容

优先用于：

- 科研成果；
- 科技奖项；
- AI；
- 芯片；
- 航空航天；
- 智能制造；
- 信息技术；
- 工程项目；
- 实验室；
- 科研团队；
- 科研人物；
- 技术科普；
- 科创竞赛；
- 数据型成果文章；
- 创新人才培养；
- 拔尖人才培养；
- 学科专业体验；
- 专业探索；
- 学术论坛；
- 科研启蒙；
- 学生科研成长；
- 国际学术研学；
- 创新实践项目；
- 项目制 / 实践式人才培养。

---

## 5.3 不优先用于

- 纯生活化校园内容；
- 节日祝福；
- 以情感叙事为主的青春故事；
- 纯行政通知；
- 普通会议新闻。

注意：学生作为主角并不意味着一定使用 `bit-youth`。如果核心内容是专业探索、科研启蒙、创新项目、学术研学或拔尖培养，应优先使用 `bit-innovation`。

---

## 5.4 核心视觉判断

BIT Innovation **不是“蓝色赛博科技风”**。

禁止默认使用：

```text
霓虹蓝
发光线
星空背景
科技网格大背景
赛博渐变
玻璃拟态
黑底荧光
HUD
```

正确方向是：

```text
白色空间
+
北理绿
+
墨绿色
+
冷灰
+
精确的线条
+
信息结构
+
数据层级
```

科技感来自：

**信息组织和节奏。**

不是来自特效。

---

## 5.5 色彩策略

推荐：

```text
background        #FFFFFF
surface           #F4F8F6
surfaceStrong     #ECF4EF

primary           bitGreen
primaryStrong     bitDarkGreen

textStrong        #16231C
text              #2B3530
textSecondary     #657069

border            #D6E3DA
borderStrong      #B9CFC0
```

棕色在本 Theme 中只允许非常少量使用。

---

## 5.6 视觉结构

相比 BIT Official：

BIT Innovation 可以：

- 更明显地使用编号；
- 更强调数据；
- 更明显地使用细线；
- 更强地使用信息卡；
- 允许略紧凑的信息密度；
- 使用小型英文 / 数字标签；
- 使用简洁的技术元数据。

但必须保持：

```text
可读
干净
不炫技
```

---

## 5.7 ArticleTitle

建议：

```text
27 ～ 31px
font-weight: 700
```

可以搭配一个小型 Eyebrow：

```text
RESEARCH
INNOVATION
LAB
PROJECT
DATA
```

但这类文字只能作为点缀。

不能让英文标签比中文标题更突出。

---

## 5.8 SectionTitle

默认可以采用：

```text
01
标题文字
────
```

或：

```text
01 / 标题文字
```

其中：

- 编号使用北理绿；
- 标题使用深色；
- 线条使用浅绿色 / 灰绿色。

SectionTitle 应体现明显的工程秩序感。

### ChapterTitle

BIT Innovation 下的 ChapterTitle 适用于：

- 研学纪实的阶段；
- 学科体验季的模块；
- 项目流程的篇章；
- “课程—参访—实践—汇报”类长文结构。

推荐视觉：

```text
01 / EXPLORE
专业探索
```

或：

```text
PHASE 01
标题
```

英文只作为轻量元信息，不得压过中文主题。

---

## 5.9 BodyText

仍然以阅读为主：

```text
16px
line-height: 1.85 ～ 1.95
```

不要为了“科技感”：

- 减小正文字号；
- 使用等宽字体写中文；
- 使用高密度小字。

---

## 5.10 LeadText

导语可以比 Official 更“结论先行”。

视觉建议：

```text
浅灰绿色面板
+
一句核心判断
+
短标签
```

适合文章开头快速说明：

- 做了什么；
- 为什么重要；
- 取得什么成果。

---

## 5.11 Highlight

这是 BIT Innovation 的重点组件。

其中必须正式支持：

```text
Highlight.variant = metric
```

用于科研成果、竞赛成绩、实践规模、培养成效等“数字 + 说明”内容。

可采用：

```text
大数字
+
小单位 / 标签
+
一句说明
```

例如结构：

```text
12
项关键成果
```

或者：

```text
98.7%
关键指标
```

但 Highlight 组件不能假设所有 Highlight 都是数字。

文本结论也必须正常工作。

---

## 5.12 QuoteCard

科研文章的 QuoteCard 应更像：

```text
结论块 / 专家观点
```

而不是文学引用。

建议：

```text
浅色底
细边框
小标签
引用文字
```

标签可以是：

```text
观点
结论
专家说
```

标签文案来自内容，不由组件擅自生成。

---

## 5.13 InfoCard

BIT Innovation 中 InfoCard 可以更强。

适合：

- 研究背景；
- 技术路线；
- 项目简介；
- 核心参数；
- 成果摘要。

建议：

```text
8px 左右圆角
1px 边框
浅绿色 / 冷灰底
```

不得做成 Dashboard。

---

## 5.14 Note

用于：

- 名词解释；
- 技术补充；
- 数据来源；
- 论文信息；
- 编辑备注。

视觉保持轻量。

---

## 5.15 BulletList

marker 可以用：

```text
小型绿色方块
```

比圆点更有工程感。

---

## 5.16 NumberList

重点强化编号：

```text
01
02
03
```

数字使用品牌绿。

正文保持正常中文排版。

---

## 5.17 StepList

这是 BIT Innovation 的强组件之一。

适合：

```text
技术流程
研发步骤
实验过程
项目阶段
方法拆解
```

建议结构：

```text
01
步骤标题
步骤说明

02
步骤标题
步骤说明
```

可使用纵向细线，但不要让实现依赖复杂定位。

---

## 5.18 Image

科研图片可能包括：

- 人物照；
- 实验室；
- 设备；
- 图表；
- 技术示意图。

默认：

```text
4 ～ 8px 圆角
```

图表类图片优先：

```text
无阴影
浅边框
```

摄影类图片可无边框。

---

## 5.19 ImageCaption

比其他 Theme 更重要。

建议：

```text
13px
textSecondary
```

允许：

```text
图 1
Fig. 1
```

但编号必须来自内容数据。

组件不得自行发明编号。

---

## 5.20 Divider

推荐：

```text
细线
+
短绿色线段
```

可以稍微有技术感，但不得复杂。

---

## 5.21 Ending

可采用：

```text
一句总结
+
简洁绿色短线
+
较大留白
```

不做产品 CTA。

---

## 5.22 CodeBlock

BIT Innovation 是三套 Theme 中最适合承载 `CodeBlock` 的主题，但仍然坚持白底工科气质。

建议：

```text
冷灰 / 浅灰绿色背景
更明确的 language / caption 层级
细边框
紧凑但可读的内边距
```

禁止：

```text
黑底赛博
霓虹语法色
代码雨
终端发光效果
```

---

## 5.23 Table

BIT Innovation 下的 `Table` 可以更强调数据层级：

```text
更清楚的表头
北理绿 / 墨绿色的轻量强调
清晰的行列分隔
数字对齐尽量稳定
```

但不得演变为 Dashboard，也不得因为表格过宽导致整页横向溢出。

---

## 5.24 BIT Innovation Variants

### research

默认科研长文。

### data

强化：

- 大数字；
- Highlight；
- 信息摘要；
- NumberList。

但不要建立真正 Dashboard。

### profile

科研人物。

降低技术卡片密度，增加：

- 人物照片；
- 引语；
- 故事性段落；
- 留白。

### project

项目 / 实验室 / 平台介绍。

强化：

- StepList；
- InfoCard；
- 项目参数；
- 图片。

### explore

用于学科体验、国际研学、专业探索、科研启蒙和学生创新实践。

强化：

- ChapterTitle；
- 阶段式叙事；
- 图片；
- QuoteCard；
- StepList；
- 适度 Highlight.metric。

它应兼顾：

```text
学术感
+
青年成长
```

而不是做成纯科研报告。

---

## 5.25 BIT Innovation 禁止项

禁止：

```text
赛博蓝
荧光绿
黑底代码雨
HUD
科技粒子
背景网格铺满正文
3D 图标
霓虹边框
发光阴影
产品发布会风
Dashboard 化
```

---

# 6. Theme C — BIT Youth

```text
Theme ID: bit-youth
中文名：北理·青春
英文名：BIT Youth
```

---

## 6.1 Theme 定位

BIT Youth 用于学生、校园、集体活动和青年成长叙事。

关键词：

```text
年轻
昂扬
温暖
真诚
成长
集体
使命感
有活力
照片驱动
篇章叙事
校园感
```

它应该明显比前两套更亲近、更有情绪和现场感。

但它不是单纯“轻松校园风”。

结合特立书院实际内容，它经常需要同时承载：

```text
青春现场
+
成长叙事
+
集体荣誉
+
拔尖培养
+
家国使命
```

因此仍属于：

**学校官方新媒体中的青年叙事主题。**

不是：

- 小红书笔记；
- 饭圈；
- 儿童绘本；
- 商业活动 H5。

---

## 6.2 适用内容

优先用于：

- 学生人物；
- 校园故事；
- 体育比赛；
- 集体荣誉；
- 社团；
- 文艺活动；
- 校园活动；
- 志愿服务；
- 社会实践；
- 青年成长；
- 迎新；
- 毕业；
- 招生；
- 节日；
- 校园风景；
- 校园生活指南；
- 学生竞赛故事；
- 青年人物采访；
- 带有明显叙事结构的活动回顾。

---

## 6.3 不优先用于

- 严肃政策；
- 正式会议；
- 重科研论文式报道；
- 学校重要规划；
- 行政通告。

---

## 6.4 视觉方向

核心结构：

```text
白色
+
北理绿
+
温暖浅色
+
少量棕色
+
较大的图片
+
明确篇章层级
+
适度柔和圆角
+
昂扬但不过度娱乐化的标题节奏
```

比前两套允许更多：

- 图片驱动；
- 篇章结构；
- 留白变化；
- 适量卡片；
- 适量圆角；
- 图片组合感；
- 小标签；
- 活动 / 人物叙事的节奏变化。

但不应堆砌装饰，也不要把“青年”误解为“可爱”。

---

## 6.5 色彩策略

推荐：

```text
background        #FFFFFF
surface           #FAF8F3
surfaceGreen      #F1F7F3
surfaceWarm       #FAF4EC

primary           bitGreen
primaryStrong     bitDarkGreen
accentWarm        bitBrown

textStrong        #222824
text              #343A36
textSecondary     #6C736F

border            #E5E7E3
```

注意：

棕色不是用来把整篇做成复古风。

只用于：

- 小标签；
- 日期；
- 引语；
- 暖色重点。

---

## 6.6 ArticleTitle

可以比 Official 更有呼吸感。

建议：

```text
28 ～ 32px
font-weight: 700
line-height: 1.3 ～ 1.45
```

允许：

- 更明显换行；
- 小型主题标签；
- 简洁副标题。

不要：

- 手写字体；
- 艺术字；
- 彩虹字；
- 描边标题。

---

## 6.7 SectionTitle

可使用更轻松的结构，例如：

```text
01
一起看看校园里的这些瞬间
```

或：

```text
小标签
章节标题
```

允许：

```text
10 ～ 12px 圆角小标签
```

但标题本身仍保持清晰。

### ChapterTitle

这是 V1.1 中 `BIT Youth` 的重点能力之一。

适用于：

- 迎新晚会；
- 毕业季；
- 人物故事；
- 社会实践；
- 研学纪实；
- 活动回顾；
- 有明确叙事阶段的长文。

推荐结构可以是：

```text
第一篇章
初见 · 韶华如序
```

或：

```text
01
初见
```

或：

```text
CHAPTER 01
相知 · 同心而行
```

组件只负责视觉层级。

章节名称、编号、短句必须来自 Article / Layout 数据，禁止 Theme 擅自创作。

---

## 6.8 BodyText

正文：

```text
16px
line-height: 1.9 ～ 2.0
```

相比前两套：

可略增加段落之间的留白。

人物故事尤其需要呼吸感。

---

## 6.9 LeadText

BIT Youth 的 LeadText 可以具有轻叙事感。

推荐：

```text
17px
较舒展行距
浅暖色 / 浅绿色底
8 ～ 12px 圆角
```

用于文章开头建立情绪。

---

## 6.10 Highlight

可以更柔和，但不能只支持“情绪金句”。

对于运动会、社会实践、竞赛、集体荣誉等稿件，也允许使用：

```text
Highlight.variant = metric
```

例如表达：

```text
第 1 名
团体总分

379
支实践团队

2600+
师生参与
```

在 BIT Youth 中，metric 的视觉应比 Innovation 更有现场感，但仍保持克制，不能变成排行榜或数据看板。

普通文本 Highlight 推荐：

```text
浅暖色底
+
加粗关键句
```

或：

```text
品牌绿文字
+
轻量下划线 / 边框
```

不要做：

- 荧光黄马克笔满篇；
- 彩色渐变字。

---

## 6.11 QuoteCard

这是人物故事的重要组件。

适合：

- 学生原话；
- 老师寄语；
- 人物观点；
- 青春感受。

推荐：

```text
较大上下 padding
浅暖色 / 浅绿色底
10 ～ 12px 圆角
```

可以使用很小的引号符号作为装饰。

不要使用超大半透明引号铺背景。

---

## 6.12 InfoCard

适合：

- 活动时间；
- 活动地点；
- 报名方式；
- 校园攻略；
- 提示事项。

可以比 Official 更友好：

```text
圆角 10 ～ 12px
浅色背景
标题 + 正文
```

---

## 6.13 Note

可做成轻量“小贴士”。

但文案必须来自原始内容。

组件不得自动制造：

```text
Tips
温馨提示
小编说
```

除非 Layout AST 明确要求。

---

## 6.14 BulletList

使用：

- 简单小圆点；
- 绿色小点；
- 暖色小点；

均可。

但整篇 marker 规则必须统一。

---

## 6.15 NumberList

数字可以放在小型圆形 / 圆角矩形中。

例如：

```text
01
```

但不要做成巨大徽章。

---

## 6.16 StepList

适合：

- 新生指南；
- 活动流程；
- 报名流程；
- 校园攻略。

设计应比 Innovation 更亲切。

可以：

```text
数字标签
+
步骤标题
+
说明
```

---

## 6.17 Image

BIT Youth 是三套 Theme 中最重视图片的一套。

默认优先：

```text
大图
宽图
人物图
校园图
```

摄影图建议：

```text
8 ～ 12px 圆角
```

不要默认加：

- 厚白边；
- 拍立得旋转；
- 贴纸；
- 胶带；
- 手绘 doodle。

这些会降低自动排版稳定性。

---

## 6.18 ImageCaption

建议：

```text
13px
柔和灰色
```

人物 / 校园图允许略有编辑感。

但保持简洁。

---

## 6.19 Divider

BIT Youth 可以使用：

```text
三个小点
短线
简单小块
```

但不要使用 emoji 作为默认 Divider。

---

## 6.20 Ending

可以更温暖。

例如视觉上：

```text
短句
+
较大留白
+
小型品牌色分隔
```

但具体结束语必须来自内容。

Theme 不生成文案。

---

## 6.21 CodeBlock

BIT Youth 可以正常承载 `CodeBlock`，但不主动把代码做成视觉重点。

建议：

```text
浅色中性背景
适度圆角
低装饰
清晰可读
```

用于学生科创故事、教程或活动内容中确有代码 / 命令时的稳定展示。

---

## 6.22 Table

BIT Youth 下的 `Table` 可以比 Official 更柔和，但第一优先级仍是：

```text
可读
不爆宽
信息关系清楚
```

可采用浅暖色 / 浅绿色轻量表头，不做卡通表格或彩虹行列。

---

## 6.23 BIT Youth Variants

### story

人物 / 成长故事。

特点：

```text
图片优先
QuoteCard 更突出
ChapterTitle 可用
正文留白更舒展
成长线索更明确
```

### campus

校园生活 / 校园景色。

特点：

```text
大图
轻卡片
较自然节奏
```

### event

活动 / 体育 / 比赛 / 文艺晚会。

特点：

```text
节奏更紧
标题更有力量
图片占比更高
ChapterTitle 更突出
允许少量 Highlight.metric 展示成绩 / 规模
```

目标是“昂扬”，不是“娱乐化”。

### practice

社会实践 / 志愿服务 / 青年行动。

特点：

```text
ChapterTitle
Highlight.metric
CodeBlock
Table
团队 / 项目分段
图片
QuoteCard
```

既要展现青年行动，也要能够承载实践成果和育人价值。

### guide

攻略 / 通知 / 新生指南。

特点：

```text
InfoCard
StepList
NumberList
```

优先保证扫描效率。

### festival

节日主题。

第一版只允许：

```text
少量临时 accent
```

不得针对每个节日开发独立重型皮肤。

---

## 6.24 BIT Youth 禁止项

禁止：

```text
小红书化
大量 emoji
手账贴纸堆叠
卡通字体
彩虹色
高饱和糖果色
大量渐变
每段一个圆角卡片
拍立得乱旋转
网红营销 CTA
过度可爱
```

---

# 7. 三套 Theme 的明确区别

Codex 实现后，肉眼必须能够看出三套 Theme 是不同的。

但三套 Theme 仍属于同一个品牌系统。

---

## 7.1 BIT Official

核心：

```text
秩序
正式
白底
墨绿
克制
线条
```

视觉密度：

```text
中
```

圆角：

```text
低
```

卡片：

```text
少
```

图片：

```text
规整
```

---

## 7.2 BIT Innovation

核心：

```text
工程
科研
学术探索
拔尖培养
数据
编号
信息结构
理性前沿
```

视觉密度：

```text
中偏高
```

圆角：

```text
中低
```

卡片：

```text
中
```

图片：

```text
科研 / 图表友好
```

---

## 7.3 BIT Youth

核心：

```text
青年
校园
昂扬
温暖
成长
使命感
篇章
图片
```

视觉密度：

```text
中偏低
```

圆角：

```text
中
```

卡片：

```text
适量
```

图片：

```text
大图优先
```

---

# 8. Component × Theme 默认策略

第一版至少包含以下组件：

```text
ArticleTitle
Subtitle
SectionTitle
ChapterTitle
BodyText
LeadText
Highlight
QuoteCard
InfoCard
Note
BulletList
NumberList
StepList
Image
ImageCaption
Divider
Ending
CodeBlock
Table
```

三套 Theme 必须作用于同一套组件。

禁止复制三份完全独立组件：

```text
OfficialQuoteCard
InnovationQuoteCard
YouthQuoteCard
```

正确方向是：

```text
QuoteCard
+
theme / themeVariant
+
componentVariant
```

---

## 8.1 默认差异表

| Component | BIT Official | BIT Innovation | BIT Youth |
|---|---|---|---|
| ArticleTitle | 稳重正式 | 工程感、可带小标签 | 舒展、青年感 |
| Subtitle | 中性 | 偏信息型 | 偏叙事型 |
| SectionTitle | 绿线 / 正式层级 | 编号 / 技术线 | 清晰、青年化层级 |
| ChapterTitle | 正式阶段 / 部分 | 探索阶段 / 研学模块 | 强篇章叙事 / 活动章节 |
| BodyText | 稳定阅读 | 稳定阅读 | 更舒展 |
| LeadText | 正式导语 | 结论 / 探索摘要 | 青年故事 / 现场导语 |
| Highlight | 克制强调 / 荣誉数字 | 数据 / 结论 / metric | 金句 + 成绩 / 实践 metric |
| QuoteCard | 正式引用 | 专家观点 / 结论 | 人物原话 |
| InfoCard | 正式信息 | 技术信息 | 活动 / 指南信息 |
| Note | 注释 | 技术补充 | 小贴士 |
| BulletList | 正式 | 方点 / 工程感 | 柔和 |
| NumberList | 绿色数字 | 强编号 | 轻标签编号 |
| StepList | 正式流程 | 技术 / 探索流程 | 攻略 / 实践流程 |
| Image | 规整 | 图表 / 科研友好 | 大图 / 人物优先 |
| ImageCaption | 中性 | 图号 / 数据说明友好 | 柔和编辑感 |
| Divider | 细线 | 技术短线 | 轻量点 / 短线 |
| Ending | 克制 | 总结型 | 温暖昂扬型 |
| CodeBlock | 浅灰绿、信息型、克制 | 技术信息层级更明确，不做黑底赛博 | 轻量中性，不主动强化技术感 |
| Table | 正式、清晰边框、易扫描 | 数据层级更明确、表头更强 | 柔和但以可读性和防爆宽为先 |

---

## 8.2 V1.1～V1.2 累积重点能力

### ChapterTitle

`ChapterTitle` 是独立于普通 `SectionTitle` 的篇章级组件。

它用于表示文章叙事中的较大阶段，例如：

```text
第一篇章：初见
第二篇章：相知
第三篇章：共融
```

或：

```text
第一阶段：课程学习
第二阶段：实验室参访
第三阶段：成果汇报
```

要求：

- 必须使用原文 / Layout 提供的标题；
- 不得自动生成章节名称；
- 使用频率低于 SectionTitle；
- 只在文章确有篇章结构时使用；
- 三套 Theme 都支持，但 `bit-youth` 和 `bit-innovation` 更常用。

### Highlight.metric

`Highlight` 至少支持：

```text
default
metric
```

`metric` 用于：

- 科研成果数字；
- 获奖成绩；
- 体育成绩；
- 实践规模；
- 招生 / 培养数据；
- 项目关键指标。

建议数据语义：

```text
value
unit (optional)
label
note (optional)
```

不要为此新增 Dashboard 组件体系。


### CodeBlock

`CodeBlock` 在 V1.2 中正式进入 M1 基础语义组件集合。

最低语义：

```text
code: string
language?: string
caption?: string
```

要求：

- 稳定展示多行代码 / 命令 / 配置文本；
- 保留必要空白和换行；
- 375px 下不得撑破文章页面；
- 长行应采用安全的换行或组件内部横向处理策略，不能导致整页横向溢出；
- `language` / `caption` 只有数据传入时才展示；
- M1 不要求复杂语法高亮。

### Table

`Table` 在 V1.2 中正式进入 M1 基础语义组件集合。

最低语义：

```text
columns: string[]
rows: Array<string[]>
caption?: string
```

要求：

- 稳定展示普通二维表格；
- 375px 下不得导致整页爆宽；
- 优先保证表头、行列关系与文本可读性；
- 必须为较宽内容提供组件内部安全策略；
- 不做复杂单元格合并；
- 不做表格编辑器。

---

# 9. Variant 设计原则

V1.2 起，Variant 正式拆分为：

```text
ThemeVariantId
ComponentVariantId
```

其中：

```text
ThemeVariantId
→ 整篇 Theme 的轻量分支

ComponentVariantId
→ 单个组件的表现分支
```

例如：

```text
theme = bit-innovation
themeVariant = data

component = highlight
componentVariant = metric
```

禁止再用一个未限定语义的 `variant` 同时表达两者。

Variant 必须有限。

第一版不要出现：

```text
每个组件 8～10 个 Variant
```

建议：

```text
大部分组件：
1 个 default
+
最多 1～2 个有实际价值的 Variant
```

Variant 的作用是解决真实内容差异。

不是为了制造“模板数量”。

---

# 10. Theme 元数据

为了后续 M3 AI 自动选择 Theme，M1 可以给每个 Theme 保留简单元数据。

不需要实现 AI。

建议至少：

```text
id
name
description
keywords
recommendedFor
avoidFor
themeVariants
defaultVariant
```

例如：

```json
{
  "id": "bit-innovation",
  "name": "北理·科创",
  "description": "面向科研、工程、学术探索、拔尖培养、创新成果与科研成长的北理新媒体主题",
  "keywords": [
    "科研",
    "科技",
    "工程",
    "创新",
    "成果",
    "实验室",
    "AI",
    "项目",
    "学科体验",
    "研学",
    "拔尖培养"
  ],
  "themeVariants": ["research", "data", "profile", "project", "explore"],
  "defaultVariant": "research"
}
```

M1 只需要提供元数据。

`defaultVariant` 合同冻结为：

```text
defaultVariant: ThemeVariantId | null
```

正式值：

```text
bit-official    → "default"
bit-innovation  → "research"
bit-youth       → null
```

`defaultVariant` 非 `null` 时，必须引用该 Theme 已登记的合法 `ThemeVariantId`。

后续 M3 再由 AI 使用。

---

# 11. Theme 自动选择建议

此部分供后续 M3 使用。

M1 不需要实现自动分类。

---

## 11.1 优先选择 BIT Official

当文章重点是：

```text
学校 / 学院行为
官方信息
会议
政策
规划
通知
育人工作
重要新闻
重大事项
```

---

## 11.2 优先选择 BIT Innovation

当文章重点是：

```text
科研
技术
工程
实验
成果
数据
科研人物
项目
创新
专业探索
学科体验
科研启蒙
研学
拔尖培养
创新实践
```

---

## 11.3 优先选择 BIT Youth

当文章重点是：

```text
学生
校园
青春
活动
体育
故事
社会实践
志愿服务
集体荣誉
节日
生活
招生
毕业
```

---

## 11.4 无法判断时

默认：

```text
bit-official
```

不要随机选择 Theme。

---

# 12. Theme 实现规则

Codex 在 M1 实现时必须遵守：

1. 三套 Theme 使用同一套组件体系。
2. Theme 通过 Token 和组件默认配置改变视觉，不复制整套组件。
3. 品牌颜色必须集中管理。
4. 组件内部避免散落大量固定色值。
5. 所有 Theme 都必须能在 375px 下正常展示。
6. Theme 切换后页面不应重新定义文章结构。
7. Theme 不修改文章原文。
8. Theme 不生成新文案。
9. Theme 不自动插入 Logo。
10. Theme 不自动插入二维码。
11. Theme 不依赖复杂动画。
12. Theme 核心效果必须能为后续微信 Renderer 复现。
13. 优先完成整体视觉一致性，不追求复杂设计系统。
14. 不因为本附件额外建立重型测试框架。
15. 实现 Registry 时，以 Theme Registry / Component Registry 为单一事实源，Catalog 应派生而不是手工复制。

---

# 13. M1 Theme Demo 要求

M1 的组件展示页需要提供一个非常简单的 Theme Preview。

至少能够：

```text
选择：
BIT Official
BIT Innovation
BIT Youth
```

然后：

```text
同一组 Demo 内容
↓
切换 Theme
↓
观察全部组件视觉变化
```

建议同时展示：

```text
Desktop / normal preview
375px mobile preview
```

如果主项目暂时只有移动端 Demo，则只做 375px 也可以。

---

# 14. Demo 内容要求

不要为了展示 Theme 写三篇不同文章。

应优先使用：

**同一组组件 / 同一份 Demo 内容**

分别渲染：

```text
BIT Official
BIT Innovation
BIT Youth
```

这样能够直接判断 Theme 是否真的产生了视觉差异。

Demo 至少覆盖：

```text
ArticleTitle
Subtitle
SectionTitle
ChapterTitle
BodyText
LeadText
Highlight
QuoteCard
InfoCard
Note
BulletList
NumberList
StepList
Image
ImageCaption
Divider
Ending
CodeBlock
Table
```

---

# 15. 轻量验收与 Visual PASS Gate

本附件仍然不要求重型自动化测试体系。

但是从 V1.2 起，**M1 的最终 PASS 必须包含真实浏览器视觉验收证据**。

原因：本 Theme 规范本身已经要求：

- 三套 Theme 肉眼存在明确差异；
- 375px 不明显炸版；
- CodeBlock / Table 不导致页面爆宽；
- 项目正常 build。

因此完全没有实际浏览器渲染检查时，不得声明：

```text
M1_COMPONENT_THEME_PASS
```

## 15.1 正常 Visual Gate

当开发环境已有可用浏览器自动化能力时，应轻量执行：

```text
实现完成
↓
npm run build PASS
↓
启动 Demo
↓
真实 Chromium 375px 渲染
↓
三套 Theme 实测 + 截图
↓
Visual Gate PASS
↓
M1_COMPONENT_THEME_PASS
```

最低 Visual Gate：

```text
1. Chromium 成功打开 Demo
2. bit-official 正常加载
3. bit-innovation 正常加载
4. bit-youth 正常加载
5. ThemeVariant 可切换
6. 19 个基础组件均存在
7. ChapterTitle 正常
8. Highlight / metric 正常
9. CodeBlock 正常
10. Table 正常
11. 无 page error
12. 无明显 console error
13. 375px 无横向页面溢出
14. 长标题正常换行
15. metric 不撑破容器
16. Table / CodeBlock 不导致整页爆宽
17. 三套 Theme 各保存至少一张截图
18. 肉眼可确认三套 Theme 视觉语言明显不同
```

## 15.2 环境阻塞

只有实际浏览器能力因环境故障无法使用时，才允许：

```text
IMPLEMENTATION_RESULT=M1_IMPLEMENTATION_COMPLETE
VISUAL_CHECK=BLOCKED_BY_ENVIRONMENT
NEXT_STATE=READY_FOR_M1_VISUAL_ACCEPTANCE
```

此时不得报告：

```text
M1_COMPONENT_THEME_PASS
```

## 15.3 仍禁止重型测试

不要因为 Visual Gate 建立：

- Playwright Test 工程；
- 大量 snapshot test；
- 大量视觉回归；
- 大量 E2E；
- 复杂测试矩阵。

只需要轻量浏览器 smoke + 截图。

后续真正的微信公众号兼容校验仍由 Renderer / Validator 阶段承担。

---

# 16. 最终视觉判断

如果实现正确，三套 Theme 给人的第一印象应当分别是：

## BIT Official

> 这是北理学校 / 学院官方发布的一篇正式、现代、可信的文章，能够自然承载会议、制度、育人工作和重要新闻。

## BIT Innovation

> 这是北理发布的一篇科研 / 工程 / 学术探索 / 拔尖培养内容，理性、清晰、有探索感和技术气质，但不炫技。

## BIT Youth

> 这是北理面向青年学生的一篇新媒体文章，年轻、昂扬、温暖、有叙事感，能够表达成长、集体荣誉与使命感，同时保持学校官方账号的品质。

---

# 17. 最重要的错误方向

以下任何一种结果都不接受。

### 错误 A

```text
三套 Theme 只是换了一个主色
```

Theme 还应该在：

- 标题；
- 留白；
- 卡片；
- 分隔；
- 圆角；
- 图片；
- 编号；
- 信息密度；

上形成差异。

---

### 错误 B

```text
为了差异而设计三个完全不同的网站
```

三套 Theme 必须共享北理品牌基础和同一组件语言。

---

### 错误 C

```text
BIT Innovation = 蓝色赛博科技
```

错误。

它应该是：

```text
北理品牌
+
工程理性
+
信息秩序
```

---

### 错误 D

```text
BIT Youth = 小红书 / 卡通
```

错误。

它应该是：

```text
年轻
+
校园
+
昂扬
+
成长
+
使命感
+
学校官方品质
```

---

### 错误 E

```text
BIT Official = 公文模板
```

错误。

它应该：

```text
正式但现代
稳重但不老气
```

---

### 错误 F

```text
大量把学校 Logo 塞进组件
```

错误。

品牌感不能依赖 Logo 重复出现。

---

# 18. Codex 执行摘要

如果需要快速理解本文档，只需记住：

```text
M1 只做一套组件系统。

然后给这套组件系统实现三种北理主题：

1. bit-official
   正式、权威、白底、绿/墨绿、克制

2. bit-innovation
   科研、工程、学术探索、拔尖培养、数据、信息结构

3. bit-youth
   学生、校园、昂扬、温暖、成长、篇章叙事、图片

V1.1～V1.2 累积要求：
- 增加 ChapterTitle 篇章级组件；
- Highlight 支持 metric 数字成果型 Component Variant；
- 增加 CodeBlock 与 Table；
- 基础组件冻结为 19 个；
- ThemeVariant / ComponentVariant 正式拆分；
- defaultVariant 合同冻结；
- Youth 不做“小清新”，要有青年成长与使命感；
- Innovation 覆盖专业探索、研学和拔尖培养。

三套 Theme：
不是三套页面模板，
不是三套独立组件，
不是简单换色。

Theme = Tokens + Component Defaults + Limited Variants。

优先保证：
好看
稳定
375px 正常
以后能转微信 HTML

不要为了 M1 建重型测试。
```

---

# 19. 冻结项

M1 第一版正式 Theme ID 冻结为：

```text
bit-official
bit-innovation
bit-youth
```

中文显示名冻结为：

```text
北理·正式
北理·科创
北理·青春
```

若无新的产品级理由，不在 M1 中继续增加第四、第五套主题。

优先先把这三套做出明显、稳定、有北理辨识度的效果。

V1.2 冻结以下新增 / 重点能力：

```text
ChapterTitle
Highlight.metric
CodeBlock
Table
```

版本演进关系仅表达为：

```text
V1.1 新增 ChapterTitle。
V1.2 新增 CodeBlock 与 Table。
```

当前 M1 基础语义组件总数冻结为 **19 个**，具体组件集合与机器 ID 以正式组件清单为准。

`CodeBlock` / `Table` 已正式进入基础组件集合；`Highlight.metric` 是 Highlight 的 `ComponentVariantId`，不另建 Dashboard 系统。

V1.2 同时冻结：

```text
ThemeVariantId
ComponentVariantId
```

以及：

```text
defaultVariant: ThemeVariantId | null
```

正式默认值：

```text
bit-official    = "default"
bit-innovation  = "research"
bit-youth       = null
```

Visual Gate 未真实完成时，不得报告 `M1_COMPONENT_THEME_PASS`。

---

**文档版本：V1.2**  
**文档状态：THEME_SPEC_FROZEN_V1_2**  
**用途：M1_COMPONENT_THEME 主提示词附件**
