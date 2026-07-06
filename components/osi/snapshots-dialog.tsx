'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Camera, GitCompareArrows, History, RotateCcw, Trash2, X } from 'lucide-react'
import type { OsiModel } from '@/lib/osi-types'
import { toYaml } from '@/lib/osi-serialize'
import type { OsiSnapshot } from '@/lib/osi-snapshots'
import {
  deleteSnapshot,
  diffLines,
  diffStats,
  loadSnapshots,
  saveSnapshot,
} from '@/lib/osi-snapshots'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SnapshotsDialog({
  open,
  models,
  onClose,
  onRestore,
}: {
  open: boolean
  models: OsiModel[]
  onClose: () => void
  /** 恢复快照（通过带历史的 setModels 应用，可撤销） */
  onRestore: (models: OsiModel[]) => void
}) {
  const [snapshots, setSnapshots] = useState<OsiSnapshot[]>([])
  const [name, setName] = useState('')
  /** 对比目标快照（进入 diff 视图） */
  const [diffTarget, setDiffTarget] = useState<OsiSnapshot | null>(null)

  useEffect(() => {
    if (open) {
      setSnapshots(loadSnapshots())
      setDiffTarget(null)
      setName('')
    }
  }, [open])

  const diff = useMemo(() => {
    if (!diffTarget) return null
    return diffLines(toYaml(diffTarget.models), toYaml(models))
  }, [diffTarget, models])

  if (!open) return null

  const save = () => {
    setSnapshots(saveSnapshot(name, models))
    setName('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="版本快照"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-lg border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            {diffTarget ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => setDiffTarget(null)}
                  aria-label="返回快照列表"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <GitCompareArrows className="size-4 shrink-0 text-primary" />
                <h2 className="truncate text-sm font-semibold">
                  对比：{diffTarget.name} → 当前
                </h2>
              </>
            ) : (
              <>
                <History className="size-4 shrink-0 text-primary" />
                <h2 className="text-sm font-semibold">版本快照</h2>
                <span className="text-xs text-muted-foreground">保存在本机浏览器</span>
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose} aria-label="关闭">
            <X className="size-4" />
          </Button>
        </div>

        {diffTarget && diff ? (
          <DiffView diff={diff} />
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="快照名称，如：上线前基线"
                className="h-8 flex-1 text-sm"
                aria-label="快照名称"
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    e.keyCode !== 229
                  ) {
                    save()
                  }
                }}
              />
              <Button size="sm" className="h-8 gap-1.5" onClick={save}>
                <Camera className="size-3.5" />
                保存当前
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {snapshots.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  还没有快照。保存当前状态后，可随时恢复或与当前版本做规范对比。
                </p>
              ) : (
                snapshots.map((s) => {
                  const dsCount = s.models.reduce((n, m) => n + m.datasets.length, 0)
                  const metricCount = s.models.reduce((n, m) => n + m.metrics.length, 0)
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {new Date(s.createdAt).toLocaleString('zh-CN')} ·{' '}
                          {s.models.length} models · {dsCount} datasets · {metricCount} metrics
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 bg-transparent px-2 text-xs"
                        onClick={() => setDiffTarget(s)}
                      >
                        <GitCompareArrows className="size-3" />
                        对比
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 bg-transparent px-2 text-xs"
                        onClick={() => {
                          onRestore(JSON.parse(JSON.stringify(s.models)))
                          onClose()
                        }}
                      >
                        <RotateCcw className="size-3" />
                        恢复
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setSnapshots(deleteSnapshot(s.id))}
                        aria-label={`删除快照 ${s.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DiffView({ diff }: { diff: ReturnType<typeof diffLines> }) {
  const stats = diffStats(diff)
  const unchanged = stats.add === 0 && stats.del === 0
  return (
    <>
      <div className="flex items-center gap-3 border-b border-border px-4 py-2 font-mono text-xs">
        {unchanged ? (
          <span className="text-muted-foreground">两个版本的规范完全一致</span>
        ) : (
          <>
            <span className="text-success">+{stats.add} 新增</span>
            <span className="text-destructive">-{stats.del} 删除</span>
            <span className="ml-auto text-muted-foreground">快照 → 当前</span>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <pre className="p-3 font-mono text-xs leading-relaxed">
          <code>
            {diff.map((l, i) => (
              <div
                key={i}
                className={
                  l.type === 'add'
                    ? 'bg-success/10 text-success'
                    : l.type === 'del'
                      ? 'bg-destructive/10 text-destructive line-through decoration-destructive/40'
                      : 'text-muted-foreground'
                }
              >
                <span className="inline-block w-5 select-none">
                  {l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' '}
                </span>
                <span className="whitespace-pre">{l.text}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </>
  )
}
