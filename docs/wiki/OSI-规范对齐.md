# OSI 规范对齐

本工具严格对齐官方 [open-semantic-interchange/OSI](https://github.com/open-semantic-interchange/OSI) 仓库的 `core-spec/osi-schema.json`（v0.2.0.dev0），内置副本与官方逐字段语义一致，并经 29 项 round-trip 认证测试验证。

## 配置点对照表

| 官方 $defs | 必填项 | 本工具支持 |
| --- | --- | --- |
| SemanticModel | name, datasets | name / description / ai_context / datasets / relationships / metrics / custom_extensions |
| Dataset | name, source | 全部，含 unique_keys 多组复合键 |
| Field | name, expression | 全部，含 dimension 三态（非维度 / `{}` / is_time） |
| Relationship | name, from, to, from_columns, to_columns | 全部（from_columns / to_columns 复合键，minItems: 1） |
| Metric | name, expression | 全部 |
| Expression | dialects（minItems: 1） | 多方言并存 |
| AIContext | oneOf 双形态 | 结构化对象（instructions + synonyms + examples + 任意附加键）或纯字符串 |
| CustomExtension | vendor_name, data | data 严格存为 JSON 字符串，任意层级可挂载 |

## Dialect 官方枚举（仅 6 个合法）

```
ANSI_SQL / SNOWFLAKE / MDX / TABLEAU / DATABRICKS / MAQL
```

注意官方枚举是**产品名**而非 SQL 后缀——`SNOWFLAKE_SQL`、`BIGQUERY_SQL`、`POSTGRES_SQL` 等均不存在。导入外部文件时工具会把这类常见变体自动归一到官方枚举（如 `SNOWFLAKE_SQL → SNOWFLAKE`），未知值回退 `ANSI_SQL`。

## Vendor 说明

官方 Schema 对 `vendor_name` 是开放字符串（官方示例：COMMON / SNOWFLAKE / SALESFORCE / DBT / DATABRICKS / GOODDATA）。工具为这六家内置常用键预设，同时接受任意自定义厂商名。详见 [功能指南](功能指南.md) 的厂商扩展一节。

## 校验层次

1. **官方 Schema 校验**（Ajv, draft 2020-12）：结构、required、枚举、additionalProperties: false、minItems 等硬约束，错误带 JSON 指针路径，点击跳转到对应表单项
2. **语义级 Lint**：Schema 无法表达的业务约束——实体重名、关系引用的数据集/列必须存在、自引用关系、snake_case 命名、描述覆盖率、指标缺 ANSI_SQL 方言等

## Round-trip 保证

导出的规范文件重新导入后与原模型语义等价（字段级一致），导入 → 校验 → 导出 → 再导入的循环无损。
