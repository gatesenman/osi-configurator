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

semantic_model:                      # 顶层数组，通常一个元素
  - name: 模型名（必填，snake_case 英文）
    description: 模型描述
    ai_context: 一段说明文字            # 或结构化 { instructions, synonyms: [], examples: [] }
    datasets:                        # 数据集数组
      - name: 数据集名（必填，snake_case）
        source: 物理表全名，如 db.schema.table（必填）
        primary_key: [主键列]
        unique_keys: [[唯一键列组]]     # 可选，二维数组
        description: 描述
        ai_context: 说明
        fields:                      # 行级字段
          - name: 字段名（必填）
            expression:              # 计算字段才需要；物理列可省略
              dialects:
                - dialect: ANSI_SQL   # 枚举：ANSI_SQL / SNOWFLAKE_SQL / DATABRICKS_SQL / BIGQUERY_SQL / REDSHIFT_SQL / POSTGRES_SQL / MYSQL_SQL / TSQL
                  expression: SQL 表达式
            dimension: {}            # 是维度时给 {}；时间维度给 { is_time: true }；非维度省略
            label: 展示名
            description: 描述
            ai_context: 说明
    relationships:                   # 数据集间关系
      - name: 关系名（必填）
        from: 来源数据集 name（多端）
        to: 目标数据集 name（一端）
        from_columns: [来源列]
        to_columns: [目标列]
    metrics:                         # 聚合指标
      - name: 指标名（必填）
        expression:
          dialects:
            - dialect: ANSI_SQL
              expression: 聚合 SQL，如 SUM(revenue)
        description: 描述
        ai_context: 说明

硬性要求：
1. 只输出一个 yaml 代码块，不要输出任何解释文字
2. 所有 name 用 snake_case 英文；label/description/ai_context 用中文
3. 每个 metric 和计算字段的 expression 至少包含一条 ANSI_SQL 方言
4. relationships 的 from/to 必须引用已定义数据集的 name，列必须存在于对应数据集
5. 为常用实体补充合理的 ai_context（同义词、口径说明），提升语义层可用性`

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

export function buildMessages(mode: AiMode, instruction: string, currentYaml?: string) {
  const system = `你是数据语义层建模专家，精通 OSI（Open Semantic Interchange）开放语义互操作标准。\n\n${OSI_SPEC_GUIDE}`
  const user =
    mode === 'generate'
      ? `请根据以下业务需求，从零生成一份完整的 OSI 语义模型 YAML：\n\n${instruction}`
      : `以下是当前的 OSI 语义模型 YAML：\n\n\`\`\`yaml\n${currentYaml}\n\`\`\`\n\n请只做局部调整并输出调整后的完整 YAML。严格遵守：\n1. 只修改、新增或删除调整要求中明确提及的实体\n2. 未提及的实体必须逐字保留原样——不要重命名、不要改描述、不要增删 ai_context、不要调整顺序\n3. 应用侧会按实体名称做局部合并，任何多余改动都会被视为用户变更\n\n调整要求：\n\n${instruction}`
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
