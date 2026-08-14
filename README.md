# wechat-ai-publisher

AI-powered workflow for WeChat Official Account content understanding, automatic layout, preview, draft generation and publishing.

当前项目规划与设计规范位于 docs/。

M1 当前提供 19 个共享语义组件，以及北理·正式、北理·科创、北理·青春三套 Theme 的 375px Demo。

M2 提供 Article AST V1、Markdown / 纯文本 Parser、图片素材摄取、运行时校验与 JSON 往返能力。正式合同见 `docs/M2_Article_AST与Parser规范_V1.0.md`。

M3–M5 提供 Canonical Layout AST、离线可测 Layout Planner、确定性微信 HTML fragment、外置资产解析、parser-backed Validator 与 sandboxed 375px Preview。正式合同见 `docs/M3-M5_Layout_Render_Preview规范_V1.0.md`。

M3 另提供真实 DeepSeek Layout Provider 与 7 篇 Live A/B Acceptance。Live 测试只从 Git 忽略的项目本地 `.env.local` 读取 `DEEPSEEK_API_KEY`；报告与 artifacts 不保存凭据。验收方法与当前基线见 `docs/M3_DeepSeek_Live_AI_Acceptance_V1.0.md`。

M3–M5 最终视觉收敛增加全篇连续章节号、长段展示分段、Pattern 克制/显著度门禁与 3 篇合法授权实拍压力集；规范与最新 17 张对照/实拍截图索引见 `docs/M3-M5_Final_Visual_Direction_Refinement_V1.0.md`。

```powershell
npm install
npm run dev
npm run build
npm run check:m1
npm run check:m2
npm run check:m3
npm run check:m4
npm run check:m5
npm run check:m3-m5
npm run check:m5:browser
```

真实 Provider 验收会发起付费公网请求，需显式执行：

```powershell
npm run check:m3:live
npm run check:m3:live:browser
```

`check:m3:live` 使用当前 Node 原生 `--env-file=.env.local` 注入凭据；`check:m3:live:browser` 只复核已有结果并生成 375 × 812 Chromium A/B 截图，不再次调用 Provider。
