# 富内容完整性验收

开场同时包含 [北京理工大学](https://www.bit.edu.cn/ "北京理工大学")、**强语义**、*强调语义* 与 `inline-code`。

## 图文段落

正文中的链接、强调和代码必须经过 Canonical Layout AST 后原样进入最终 DOM。

![联合验收示意图](https://example.com/rich-content.png "图注也必须保留")

收束段落用于验证内容顺序和 exactly-once provenance。
