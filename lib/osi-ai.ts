/**
 * AI 生成 OSI 规范：客户端直连各模型提供商的 OpenAI 兼容 Chat Completions 接口。
 * 应用是静态导出（Electron 桌面版 + 网页版），无服务端，API Key 仅保存在本地浏览器。
 */

export interface AiProvider {
  id: string
  label: string
  baseUrl: string
  defaultModel: string
  /** 常用模型建议列表（可手动输入任意模型 ID） */
  models: string[]
}

/** 内置提供商预设（全部走 OpenAI 兼容协议），默认硅基流动 */
export const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'siliconflow',
    label: '硅基流动 SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    models: [
      'deepseek-ai/DeepSeek-V3',
      'deepseek-ai/DeepSeek-R1',
      'Qwen/Qwen2.5-72B-Instruct',
      'moonshotai/Kimi-K2-Instruct',
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
  },
  {
    id: 'moonshot',
    label: '月之暗面 Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2-0711-preview',
    models: ['kimi-k2-0711-preview', 'moonshot-v1-8k', 'moonshot-v1-32k'],
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-plus', 'glm-4-air'],
  },
  {
    id: 'dashscope',
    label: '阿里云通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter（聚合全部提供商）',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat-v3-0324',
    models: [
      'deepseek/deepseek-chat-v3-0324',
      'anthropic/claude-sonnet-4',
      'google/gemini-2.5-flash',
      'openai/gpt-4o-mini',
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'qwen/qwen3-32b'],
  },
  {
    id: 'ollama',
    label: 'Ollama（本地）',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    models: ['llama3.1', 'qwen2.5', 'deepseek-r1'],
  },
  {
    id: 'custom',
    label: '自定义（OpenAI 兼容）',
    baseUrl: '',
    defaultModel: '',
    models: [],
  },
]

export interface AiSettings {
  providerId: string
  baseUrl: string
  model: string
  apiKey: string
  /** 采样温度 0-2，规范生成建议低温 */
  temperature: number
  /** 最大输出 tokens，0 表示交给提供商默认 */
  maxTokens: number
}

const SETTINGS_KEY = 'osi-ai-settings'

export function defaultAiSettings(): AiSettings {
  const p = AI_PROVIDERS[0]
  return {
    providerId: p.id,
    baseUrl: p.baseUrl,
    model: p.defaultModel,
    apiKey: '',
    temperature: 0.2,
    maxTokens: 0,
  }
}

export function loadAiSettings(): AiSettings {
  if (typeof window === 'undefined') return defaultAiSettings()
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultAiSettings()
    const parsed = JSON.parse(raw) as Partial<AiSettings>
    return { ...defaultAiSettings(), ...parsed }
  } catch {
    return defaultAiSettings()
  }
}

export function saveAiSettings(s: AiSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // 存储不可用时静默忽略（不影响本次会话使用）
  }
}

/** OSI 规范结构说明：注入系统提示词，约束模型输出符合官方 Schema 的 YAML */
const OSI_SPEC_GUIDE = `OSI (Open Semantic Interchange) 规范 YAML 结构（v0.2.0.dev0）：

version: 0.2.0.dev0                  # 顶层必填，固定值
semantic_model:                      # 顶层数组（必填），可含多个模型
  - name: 模型名（必填，snake_case 英文）
    description: 模型描述
    ai_context: 一段说明文字            # 或结构化 { instructions, synonyms: [], examples: [] }（结构化形态允许任意附加键）
    datasets:                        # 数据集数组（必填，至少 1 个）
      - name: 数据集名（必填，snake_case）
        source: 物理表全名，如 db.schema.table（必填）
        primary_key: [主键列]
        unique_keys: [[唯一键列组]]     # 可选，二维数组
        description: 描述
        ai_context: 说明
        fields:                      # 行级字段
          - name: 字段名（必填）
            expression:              # 必填；物理列直接写列名作为表达式
              dialects:
                - dialect: ANSI_SQL   # 官方枚举（仅这 6 个合法）：ANSI_SQL / SNOWFLAKE / MDX / TABLEAU / DATABRICKS / MAQL
                  expression: SQL 表达式或列名
            dimension: {}            # 维度给 {}；时间维度 { is_time: true }；明确非时间维度 { is_time: false }；非维度省略
            label: 展示名
            description: 描述
            ai_context: 说明
            custom_extensions:       # 可选，厂商私有扩展
              - vendor_name: COMMON   # 任意字符串，官方示例：COMMON / SNOWFLAKE / SALESFORCE / DBT / DATABRICKS / GOODDATA
                data: '{"key": "value"}'   # 必须是 JSON 字符串
    relationships:                   # 数据集间关系
      - name: 关系名（必填）
        from: 来源数据集 name（多端，必填）
        to: 目标数据集 name（一端，必填）
        from_columns: [来源列]         # 必填，至少 1 列
        to_columns: [目标列]           # 必填，至少 1 列
        ai_context: 说明
        custom_extensions: []        # 可选
    metrics:                         # 聚合指标
      - name: 指标名（必填）
        expression:                  # 必填
          dialects:
            - dialect: ANSI_SQL
              expression: 聚合 SQL，如 SUM(revenue)
        description: 描述
        ai_context: 说明
        custom_extensions: []        # 可选
    custom_extensions: []            # 可选（模型、数据集、字段、关系、指标均支持）

硬性要求：
1. 只输出一个 yaml 代码块，包含顶层 version 和 semantic_model，不要输出任何解释文字
2. 所有 name 用 snake_case 英文；label/description/ai_context 用中文
3. 每个 metric 和计算字段的 expression 至少包含一条 ANSI_SQL 方言
4. dialect 只能取官方枚举值 ANSI_SQL / SNOWFLAKE / MDX / TABLEAU / DATABRICKS / MAQL，禁止使用 SNOWFLAKE_SQL、BIGQUERY_SQL、POSTGRES_SQL 等不存在的值
5. relationships 的 from/to 必须引用已定义数据集的 name，列必须存在于对应数据集
6. custom_extensions 的 data 必须是 JSON 字符串（不是对象）
7. 为常用实体补充合理的 ai_context（同义词、口径说明），提升语义层可用性
8. 除以上属性外不要输出任何其他键（官方 Schema 为 additionalProperties: false）`

/** 测试提供商连通性：请求 /models 列表（多数 OpenAI 兼容服务支持） */
export async function testConnection(settings: AiSettings): Promise<{ ok: boolean; message: string }> {
  const base = settings.baseUrl.replace(/\/+$/, '')
  if (!base) return { ok: false, message: '请先填写 API 地址' }
  try {
    const res = await fetch(`${base}/models`, {
      headers: settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {},
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { data?: { id: string }[] } | null
      const count = data?.data?.length
      return { ok: true, message: `连接成功${typeof count === 'number' ? `，可用模型 ${count} 个` : ''}` }
    }
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'API Key 无效或无权限' }
    return { ok: false, message: `连接失败 HTTP ${res.status}` }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error && e.name === 'TimeoutError' ? '连接超时（10s）' : '网络错误，无法连接到该地址',
    }
  }
}

export type AiMode = 'generate' | 'adjust'

/** 局部调整的操作列表格式说明：AI 只输出补丁操作，本地逐条应用，未提及节点零触碰 */
const PATCH_GUIDE = `局部调整输出格式：只输出一个 yaml 代码块，顶层为 operations 操作数组，不要输出完整模型、不要输出解释文字。

支持的操作（op 取值）：
- set_model：修改模型级属性，只写需要改的键
    { op: set_model, description: 新描述 }
- upsert_dataset：新增数据集，或整体替换同名数据集（需给出该数据集完整定义）
    { op: upsert_dataset, dataset: { name, source, primary_key, fields, ... } }
- delete_dataset：删除数据集（引用它的关系会被级联删除）
    { op: delete_dataset, name: 数据集�� }
- upsert_field：在指定数据集中新增字段，或替换同名字段（只需给出该字段自身的完整定义）
    { op: upsert_field, dataset: 数据集名, field: { name, expression, dimension, label, ... } }
- delete_field：
    { op: delete_field, dataset: 数据集名, name: 字段名 }
- upsert_metric / delete_metric：
    { op: upsert_metric, metric: { name, expression, description, ... } }
    { op: delete_metric, name: 指标名 }
- upsert_relationship / delete_relationship：
    { op: upsert_relationship, relationship: { name, from, to, from_columns, to_columns } }
    { op: delete_relationship, name: 关系名 }

硬性要求：
1. 只生成调整要求明确涉及的操作，绝不触碰未提及的实体
2. 实体片段（dataset/field/metric/relationship）结构与 OSI 规范一致；field 和 metric 的 expression 必填且至少含一条 ANSI_SQL 方言
3. upsert 按 name 匹配：存在即替换、不存在即新增，所以修改某实体时必须给出该实体的完整定义（不能只给改动的键）
4. relationship 的 from/to 引用数据集 name

输出示例：
\`\`\`yaml
operations:
  - op: upsert_field
    dataset: ds_orders
    field:
      name: channel
      expression:
        dialects:
          - dialect: ANSI_SQL
            expression: channel
      dimension: {}
      label: 渠道
  - op: delete_metric
    name: old_metric
\`\`\``

export function buildMessages(mode: AiMode, instruction: string, currentYaml?: string) {
  const system =
    mode === 'generate'
      ? `你是数据语义层建模专家，精通 OSI（Open Semantic Interchange）开放语义互操作标准。\n\n${OSI_SPEC_GUIDE}`
      : `你是数据语义层建模专家，精通 OSI（Open Semantic Interchange）开放语义互操作标准。你的任务是对现有 OSI 模型做局部调整。\n\n${OSI_SPEC_GUIDE}\n\n${PATCH_GUIDE}`
  const user =
    mode === 'generate'
      ? `请根据以下业务需求，从零生成一份完整的 OSI 语义模型 YAML：\n\n${instruction}`
      : `以下是当前的 OSI 语义模型 YAML（仅供参考实体名称与结构，不要重新输出它）：\n\n\`\`\`yaml\n${currentYaml}\n\`\`\`\n\n请根据以下调整要求，输出 operations 操作列表：\n\n${instruction}`
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

/** 从模型回复中提取 YAML（优先 ```yaml 代码块，回退整段文本） */
export function extractYaml(text: string): string {
  const fence = text.match(/```(?:yaml|yml)?\s*\n([\s\S]*?)```/)
  if (fence) return fence[1].trim()
  return text.trim()
}

/**
 * 流式调用 OpenAI 兼容 Chat Completions。
 * onDelta 逐段回调增量文本；返回完整回复。可用 AbortSignal 取消。
 */
export async function streamChatCompletion(
  settings: AiSettings,
  messages: { role: string; content: string }[],
  onDelta: (delta: string, full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const base = settings.baseUrl.replace(/\/+$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      stream: true,
      temperature: settings.temperature ?? 0.2,
      ...(settings.maxTokens > 0 ? { max_tokens: settings.maxTokens } : {}),
    }),
    signal,
  })

  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.text()
      detail = body.slice(0, 300)
    } catch {
      // 忽略读取失败
    }
    throw new Error(`请求失败 HTTP ${res.status}${detail ? `：${detail}` : ''}`)
  }

  if (!res.body) throw new Error('响应无内容')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[]
        }
        const delta = json.choices?.[0]?.delta?.content ?? ''
        if (delta) {
          full += delta
          onDelta(delta, full)
        }
      } catch {
        // 跳过无法解析的 keep-alive 行
      }
    }
  }
  return full
}
