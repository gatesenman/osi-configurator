import type { OsiModel } from './osi-types'
import { uid } from './osi-types'

const STORAGE_KEY = 'osi:snapshots'
const MAX_SNAPSHOTS = 30

export interface OsiSnapshot {
  id: string
  name: string
  createdAt: number
  models: OsiModel[]
}

export function loadSnapshots(): OsiSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list.filter(
      (s): s is OsiSnapshot =>
        s !== null && typeof s === 'object' && typeof s.id === 'string' && Array.isArray(s.models),
    )
  } catch {
    return []
  }
}

function persist(list: OsiSnapshot[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 存储满：静默忽略
  }
}

export function saveSnapshot(name: string, models: OsiModel[]): OsiSnapshot[] {
  const list = loadSnapshots()
  const snap: OsiSnapshot = {
    id: uid(),
    name: name.trim() || `快照 ${new Date().toLocaleString('zh-CN')}`,
    createdAt: Date.now(),
    // 深拷贝：快照必须与后续编辑完全隔离
    models: JSON.parse(JSON.stringify(models)),
  }
  const next = [snap, ...list].slice(0, MAX_SNAPSHOTS)
  persist(next)
  return next
}

export function deleteSnapshot(id: string): OsiSnapshot[] {
  const next = loadSnapshots().filter((s) => s.id !== id)
  persist(next)
  return next
}

// ===== 行级 diff（LCS 最长公共子序列） =====

export interface DiffLine {
  type: 'same' | 'add' | 'del'
  text: string
}

/**
 * 行级文本对比：del = 快照中有而当前没有的行，add = 当前新增的行。
 * 超大文档退化为整体替换视图，避免 O(n*m) DP 卡顿。
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  if (a.length * b.length > 1_000_000) {
    return [
      ...a.map((text): DiffLine => ({ type: 'del', text })),
      ...b.map((text): DiffLine => ({ type: 'add', text })),
    ]
  }
  // LCS 动态规划
  const m = a.length
  const n = b.length
  const dp: Uint32Array[] = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: a[i] })
      i++
    } else {
      out.push({ type: 'add', text: b[j] })
      j++
    }
  }
  while (i < m) out.push({ type: 'del', text: a[i++] })
  while (j < n) out.push({ type: 'add', text: b[j++] })
  return out
}

/** diff 统计 */
export function diffStats(lines: DiffLine[]) {
  return {
    add: lines.filter((l) => l.type === 'add').length,
    del: lines.filter((l) => l.type === 'del').length,
  }
}
