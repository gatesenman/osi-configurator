# OSI 可视化配置器

Open Semantic Interchange（OSI）标准的可视化配置器：左侧表单配置语义模型，右侧实时生成符合官方 JSON Schema（v0.2.0.dev0）的 YAML / JSON 规范文件。适用于为 BI、AI 分析工具定义统一的语义层（数据集、维度、指标、关系与 AI 上下文）。

![主界面：左侧表单编辑，右侧实时生成 OSI 规范](docs/screenshots/overview.png)

## 功能

### 1:1 覆盖官方 OSI 规范全部配置点

严格对齐官方 [open-semantic-interchange/OSI](https://github.com/open-semantic-interchange/OSI) 仓库的 `osi-schema.json`，不多不少：

| 配置对象 | 支持的配置点 |
| --- | --- |
| SemanticModel | name / description / ai_context / datasets / relationships / metrics / custom_extensions |
| Dataset | name / source / primary_key / unique_keys（多组复合键）/ description / ai_context / fields / custom_extensions |
| Field | name / expression（多方言 dialects）/ dimension 三态（非维度 · `{}` · is_time）/ label / description / ai_context / custom_extensions |
| Relationship | name / from / to / from_columns / to_columns（复合键）/ ai_context / custom_extensions |
| Metric | name / expression（多方言）/ description / ai_context / custom_extensions |
| AIContext | 官方 oneOf 两种形态：结构化对象（instructions + synonyms + examples）或纯字符串 |
| CustomExtension | vendor_name + JSON data，任意层级均可挂载 |

### 字段级双向高亮联动

点击或聚焦左侧任意输入项（如某个数据集的 `source`），右侧 YAML/JSON 中对应的行立即高亮并滚动定位；反过来点击右侧规范中的任意一行，自动切换到对应分区、展开折叠的卡片并精确高亮到具体输入框。改了什么配置、生成了什么规范，一目了然。

![字段级双向联动：聚焦 source 输入框，右侧对应行即时高亮](docs/screenshots/field-level-sync.png)

### 官方 JSON Schema 实时校验

内置 Ajv 按官方 `osi-schema.json`（draft 2020-12）实时校验，右下角显示校验状态；出错时列出 JSON 指针路径与中文错误说明，点击错误直接跳转到对应表单项。

### 多方言表达式与 YAML / JSON 双格式

指标与字段的 expression 支持按 SQL 方言（ANSI_SQL、Snowflake、Databricks 等）分别定义表达式；右侧预览可在 YAML 与 JSON 间一键切换，带语法高亮和行号。

![指标多方言表达式与 JSON 视图](docs/screenshots/metrics-json.png)

### 导入 / 导出

- **导入**：顶栏「导入」按钮，支持 `.yaml` / `.yml` / `.json` / `.osi` 规范文件，反向解析回表单继续编辑（与导出互为逆操作，round-trip 无损）
- **导出**：右侧预览的复制 / 下载按钮，输出 `<模型名>.osi.yaml` 或 `.osi.json`

## 桌面版下载（Windows / macOS / Linux）

到 [Releases](https://github.com/gatesenman/osi-configurator/releases) 页面下载对应平台安装包：

| 平台 | 文件 | 说明 |
| --- | --- | --- |
| Windows | `OSI.Configurator.Setup.x.x.x.exe` | NSIS 安装器 |
| macOS | `OSI.Configurator-x.x.x-universal.dmg` | Intel / Apple Silicon 通用 |
| Linux | `OSI.Configurator-x.x.x.AppImage` | 免安装，`chmod +x` 后直接运行 |

> 安装包未做代码签名：Windows 首次运行需在 SmartScreen 中点「仍要运行」；macOS 首次打开需右键 →「打开」（或在 系统设置 → 隐私与安全性 中允许）。

推送 `v*` 标签（如 `v0.2.0`）会由 GitHub Actions 自动在三平台云端矩阵构建并发布新 Release。

## 本地开发

环境要求（Windows / macOS / Linux 通用）：Node.js >= 20，pnpm 10（`npm install -g pnpm` 或 `corepack enable`）。

```bash
# 安装依赖
pnpm install

# 启动开发服务器（http://localhost:3000）
pnpm dev

# 构建 Web 版（静态导出，产物在 out/）
pnpm build

# 构建当前平台桌面安装包（产物在 dist/）
pnpm desktop:build
```

> macOS 安装包只能在 Mac 上构建，Windows 安装包建议在 Windows 上构建——三平台安装包由 GitHub Actions 云端矩阵统一构建。

## 跨平台说明

- 所有 npm scripts 仅使用 Next.js / Electron CLI，无 shell 特定语法，三平台直接可用
- `.gitattributes` 统一仓库内换行符为 LF，Windows 上 clone / commit 不会产生 CRLF 差异
- `package.json` 的 `engines` 与 `packageManager` 字段锁定 Node / pnpm 版本，配合 `corepack enable` 三平台行为一致

## 技术栈

- **框架**：Next.js 16（静态导出）+ React 19 + TypeScript
- **UI**：Tailwind CSS v4 + shadcn/ui
- **校验**：Ajv（JSON Schema draft 2020-12）
- **解析**：yaml（导入 YAML 规范）
- **桌面**：Electron + electron-builder，GitHub Actions 三平台矩阵构建

## 目录结构

```
app/                    # Next.js 页面与全局样式
components/osi/         # 配置器组件（各分区面板、规范预览、共享编辑器）
lib/
  osi-types.ts          # 编辑器内部模型类型
  osi-schema.json       # 官方 OSI JSON Schema（v0.2.0.dev0）
  osi-serialize.ts      # 模型 → 规范序列化（含字段级选择键）
  osi-import.ts         # 规范 → 模型反向解析
  osi-validate.ts       # Ajv 官方 Schema 校验
  osi-defaults.ts       # 内置销售域示例模型
electron/               # Electron 主进程
.github/workflows/      # 三平台桌面构建工作流
docs/screenshots/       # README 截图
```

## 许可

本项目基于 OSI 开放规范构建，规范本身版权归 [Open Semantic Interchange](https://github.com/open-semantic-interchange) 项目所有。
