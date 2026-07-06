# OSI 可视化配置器 Wiki

Open Semantic Interchange（OSI）标准的可视化配置器——左侧表单配置语义模型，右侧实时生成符合官方 JSON Schema（v0.2.0.dev0）的 YAML / JSON 规范文件。

![主界面](../screenshots/overview.png)

## 页面导航

| 页面 | 内容 |
| --- | --- |
| [快速上手](快速上手.md) | 安装、启动、第一个语义模型 |
| [OSI 规范对齐](OSI-规范对齐.md) | 与官方 Schema 的 1:1 对照表、方言与厂商枚举 |
| [AI 生成与局部调整](AI-生成与局部调整.md) | AI 提供商配置、生成新模型、补丁式局部调整 |
| [功能指南](功能指南.md) | 双向联动、语义 Lint、版本快照、关系图、厂商扩展 |

## 核心特性一览

- **1:1 官方规范覆盖**：SemanticModel / Dataset / Field / Relationship / Metric / AIContext / CustomExtension 全部配置点
- **实时校验**：Ajv 官方 Schema 校验 + 十余条语义级 Lint 规则
- **AI 辅助**：从业务描述生成模型；补丁式局部调整（未提及节点零触碰）
- **工程能力**：撤销重做、本机自动保存、版本快照 diff、本体关系图
- **开放扩展**：六大厂商 custom_extensions 预设 + 任意自定义厂商
- **跨平台**：Web 版 + Windows / macOS / Linux 桌面安装包

## 相关链接

- 仓库：[gatesenman/osi-configurator](https://github.com/gatesenman/osi-configurator)
- 桌面版下载：[Releases](https://github.com/gatesenman/osi-configurator/releases)
- OSI 官方规范：[open-semantic-interchange/OSI](https://github.com/open-semantic-interchange/OSI)
