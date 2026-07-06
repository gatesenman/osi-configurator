'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { OsiModel } from './osi-types'

const STORAGE_KEY = 'osi:document'
/** 撤销栈最大深度 */
const MAX_HISTORY = 60
/** 连续输入合并窗口：窗口内的连续编辑合并为一个撤销步 */
const BURST_MS = 400

interface StoredDoc {
  models: OsiModel[]
  activeIdx: number
}

/** 轻量结构检查：防止旧版本 / 损坏数据导致崩溃 */
function isValidDoc(v: unknown): v is StoredDoc {
  if (v === null || typeof v !== 'object') return false
  const d = v as Record<string, unknown>
  return (
    Array.isArray(d.models) &&
    d.models.length > 0 &&
    d.models.every(
      (m) =>
        m !== null &&
        typeof m === 'object' &&
        Array.isArray((m as Record<string, unknown>).datasets) &&
        Array.isArray((m as Record<string, unknown>).relationships) &&
        Array.isArray((m as Record<string, unknown>).metrics),
    )
  )
}

function loadDocument(): StoredDoc | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const doc = JSON.parse(raw)
    if (!isValidDoc(doc)) return null
    const idx = typeof doc.activeIdx === 'number' ? doc.activeIdx : 0
    return { models: doc.models, activeIdx: Math.min(Math.max(0, idx), doc.models.length - 1) }
  } catch {
    return null
  }
}

/**
 * 文档状态管理：多语义模型数组 + 撤销重做 + 本机自动保存。
 * - 连续输入按 BURST_MS 合并为一个撤销步（逐字符撤销体验极差）
 * - 挂载后从 localStorage 恢复上次编辑（避免 SSR 水合不一致，故不在初始 state 恢复）
 * - 每次变更防抖持久化
 */
export function useOsiDocument(fallback: OsiModel[]) {
  const [models, setModelsRaw] = useState<OsiModel[]>(fallback)
  const [activeIdx, setActiveIdx] = useState(0)
  const [restored, setRestored] = useState(false)

  const past = useRef<OsiModel[][]>([])
  const future = useRef<OsiModel[][]>([])
  /** 当前输入合并窗口的起点状态（null 表示无待提交窗口） */
  const baseline = useRef<OsiModel[] | null>(null)
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const modelsRef = useRef(models)
  modelsRef.current = models
  /** 撤销栈变化时强制重渲染（canUndo/canRedo 是 ref 派生值） */
  const [, bump] = useState(0)

  // 挂载后恢复上次编辑的文档
  useEffect(() => {
    const doc = loadDocument()
    if (doc) {
      setModelsRaw(doc.models)
      setActiveIdx(doc.activeIdx)
    }
    setRestored(true)
  }, [])

  // 防抖持久化（恢复完成前不写，避免用 fallback 覆盖已存文档）
  useEffect(() => {
    if (!restored) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ models, activeIdx }))
      } catch {
        // 存储满 / 隐私模式：静默忽略，不影响编辑
      }
    }, 500)
    return () => clearTimeout(t)
  }, [models, activeIdx, restored])

  /** 立即提交当前输入合并窗口到撤销栈 */
  const flushBurst = useCallback(() => {
    if (burstTimer.current) {
      clearTimeout(burstTimer.current)
      burstTimer.current = null
    }
    if (baseline.current) {
      past.current.push(baseline.current)
      if (past.current.length > MAX_HISTORY) past.current.shift()
      baseline.current = null
    }
  }, [])

  const setModels = useCallback(
    (next: OsiModel[] | ((prev: OsiModel[]) => OsiModel[])) => {
      const resolved = typeof next === 'function' ? next(modelsRef.current) : next
      if (resolved === modelsRef.current) return
      // 新编辑到来：作废重做栈；记录合并窗口起点
      future.current = []
      if (baseline.current === null) baseline.current = modelsRef.current
      if (burstTimer.current) clearTimeout(burstTimer.current)
      burstTimer.current = setTimeout(() => {
        burstTimer.current = null
        flushBurst()
        bump((n) => n + 1)
      }, BURST_MS)
      setModelsRaw(resolved)
    },
    [flushBurst],
  )

  const undo = useCallback(() => {
    flushBurst()
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(modelsRef.current)
    setModelsRaw(prev)
    bump((n) => n + 1)
  }, [flushBurst])

  const redo = useCallback(() => {
    flushBurst()
    const next = future.current.pop()
    if (!next) return
    past.current.push(modelsRef.current)
    if (past.current.length > MAX_HISTORY) past.current.shift()
    setModelsRaw(next)
    bump((n) => n + 1)
  }, [flushBurst])

  /** 重置文档（清空历史与本机存储），用于「重置示例」 */
  const resetTo = useCallback((next: OsiModel[]) => {
    if (burstTimer.current) clearTimeout(burstTimer.current)
    baseline.current = null
    past.current = []
    future.current = []
    setModelsRaw(next)
    setActiveIdx(0)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // 忽略
    }
    bump((n) => n + 1)
  }, [])

  return {
    models,
    setModels,
    activeIdx,
    setActiveIdx,
    undo,
    redo,
    canUndo: past.current.length > 0 || baseline.current !== null,
    canRedo: future.current.length > 0,
    resetTo,
  }
}
