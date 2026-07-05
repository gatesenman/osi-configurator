# OSI 可视化配置器

Open Semantic Interchange（OSI）标准的可视化配置器：左侧表单配置语义模型，右侧实时生成符合官方 JSON Schema（v0.2.0.dev0）的 YAML / JSON 规范，支持字段级双向高亮联动、官方 Schema 校验、规范文件导入与导出。

## 功能

- 1:1 覆盖官方 `osi-schema.json` 全部配置点（SemanticModel / Dataset / Field / Relationship / Metric / AIContext / CustomExtension）
- 表单与 YAML/JSON 预览字段级双向高亮：点击或聚焦任意输入项定位到对应规范行，点击规范行反向定位并自动展开表单
- 内置 Ajv 实时校验，错误可点击跳转到对应表单项
- 导入 `.yaml` / `.yml` / `.json` / `.osi` 规范文件，导出 YAML / JSON（复制或下载）

## 环境要求（Windows / macOS / Linux 通用）

- Node.js >= 20（[nodejs.org](https://nodejs.org) 各平台安装包均可）
- pnpm 10（安装：`npm install -g pnpm` 或 `corepack enable`）

## 快速开始

以下命令在 Windows（PowerShell / CMD）、macOS 与 Linux 终端中完全一致：

```bash
# 安装依赖
pnpm install

# 启动开发服务器（http://localhost:3000）
pnpm dev

# 生产构建与启动
pnpm build
pnpm start
```

## 跨平台说明

- 所有 npm scripts 仅使用 Next.js CLI，无 shell 特定语法，三平台直接可用
- `.gitattributes` 统一仓库内换行符为 LF，Windows 上 clone / commit 不会产生 CRLF 差异
- 代码中无硬编码路径分隔符、无平台特定 API
- `package.json` 的 `engines` 与 `packageManager` 字段锁定 Node / pnpm 版本，配合 `corepack enable` 三平台行为一致

## 桌面版（Windows .exe / macOS .dmg / Linux .AppImage）

推送到 `main` 分支后，GitHub Actions 会自动在三平台云端机器上构建安装包：

1. 打开仓库的 **Actions** 页 → 选择最近一次 **Build Desktop Apps** 运行
2. 在页面底部 **Artifacts** 下载：`windows-exe`（NSIS 安装器）、`macos-dmg`（Universal，Intel/Apple Silicon 通用）、`linux-appimage`
3. 推送 `v*` 标签（如 `v0.1.0`）会自动创建 GitHub Release 并附带三平台安装包

> 安装包未做代码签名：Windows 首次运行需在 SmartScreen 中点「仍要运行」；macOS 首次打开需右键 →「打开」（或在 系统设置 → 隐私与安全性 中允许）。

本地构建当前平台安装包：

```bash
pnpm desktop:build   # 产物在 dist/
```

> 注意：macOS 安装包只能在 Mac 上构建，Windows 安装包建议在 Windows 上构建——这正是交给 GitHub Actions 云端矩阵构建的原因。

## 技术栈

- Next.js 16（App Router）+ React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Ajv（JSON Schema 2020-12 校验）+ yaml（规范导入解析）

## 目录结构

```
app/                  # Next.js 页面与全局样式
components/osi/       # 配置器 UI（面板、预览、共享编辑器）
lib/
  osi-types.ts        # 编辑器内部模型类型
  osi-schema.json     # 官方 OSI JSON Schema
  osi-serialize.ts    # 模型 → 规范（YAML/JSON，带选择键）
  osi-import.ts       # 规范 → 模型（导入解析）
  osi-validate.ts     # Ajv 官方 Schema 校验
```
