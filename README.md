# wechat-ai-publisher

AI-powered workflow for WeChat Official Account content understanding, automatic layout, preview, draft generation and publishing.

当前项目规划与设计规范位于 docs/。

M1 当前提供 19 个共享语义组件，以及北理·正式、北理·科创、北理·青春三套 Theme 的 375px Demo。

M2 提供 Article AST V1、Markdown / 纯文本 Parser、图片素材摄取、运行时校验与 JSON 往返能力。正式合同见 `docs/M2_Article_AST与Parser规范_V1.0.md`。

```powershell
npm install
npm run dev
npm run build
npm run check:m1
npm run check:m2
```
