'use client'

import { useMemo } from 'react'
import type { OsiModel } from '@/lib/osi-types'
import type { SelKey } from '@/lib/osi-serialize'

const W = 960
const H = 640
const NODE_W = 176
const NODE_H = 64

interface NodePos {
  x: number
  y: number
}

/** 椭圆布局：数据集均匀分布在画布椭圆上（1 个居中，2 个左右） */
function layout(count: number): NodePos[] {
  if (count === 0) return []
  if (count === 1) return [{ x: W / 2, y: H / 2 }]
  const rx = W / 2 - NODE_W / 2 - 48
  const ry = H / 2 - NODE_H / 2 - 56
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
    return { x: W / 2 + rx * Math.cos(angle), y: H / 2 + ry * Math.sin(angle) }
  })
}

/** 线段与节点矩形边界的交点：把边的端点从节点中心缩到边界外一点 */
function shrink(from: NodePos, to: NodePos): NodePos {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const tx = ux === 0 ? Number.POSITIVE_INFINITY : (NODE_W / 2 + 8) / Math.abs(ux)
  const ty = uy === 0 ? Number.POSITIVE_INFINITY : (NODE_H / 2 + 8) / Math.abs(uy)
  const t = Math.min(tx, ty)
  return { x: from.x + ux * t, y: from.y + uy * t }
}

/**
 * 本体关系图：数据集为节点、关系为有向边（from 多端 → to 一端）。
 * 点击节点 / 边可联动定位左侧表单与右侧规范。
 */
export function GraphView({
  model,
  selection,
  onSelect,
}: {
  model: OsiModel
  selection: SelKey | null
  onSelect: (sel: SelKey, y?: number) => void
}) {
  const positions = useMemo(() => layout(model.datasets.length), [model.datasets.length])
  const posById = useMemo(() => {
    const map = new Map<string, NodePos>()
    model.datasets.forEach((ds, i) => map.set(ds.id, positions[i]))
    return map
  }, [model.datasets, positions])

  /** 同一对数据集之间的多条关系：曲线错开 */
  const edgeOffsets = useMemo(() => {
    const groups = new Map<string, string[]>()
    for (const r of model.relationships) {
      const key = [r.fromDatasetId, r.toDatasetId].sort().join('|')
      groups.set(key, [...(groups.get(key) ?? []), r.id])
    }
    const offsets = new Map<string, number>()
    for (const ids of groups.values()) {
      ids.forEach((id, i) => offsets.set(id, (i - (ids.length - 1) / 2) * 36))
    }
    return offsets
  }, [model.relationships])

  const handleClick = (sel: SelKey, e: React.MouseEvent) => {
    onSelect(sel, e.clientY)
  }

  if (model.datasets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        暂无数据集。在「数据集」分区添加后，这里会展示本体关系图。
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 px-1 pb-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-border bg-card" />
          数据集
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="20" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="14" y2="4" className="stroke-primary" strokeWidth="1.5" />
            <path d="M14 1 L20 4 L14 7 Z" className="fill-primary" />
          </svg>
          关系（多端 → 一端）
        </span>
        <span className="ml-auto font-mono">
          {model.datasets.length} 节点 · {model.relationships.length} 边
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-sidebar">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-full min-h-[420px] w-full"
          role="img"
          aria-label={`本体关系图：${model.datasets.length} 个数据集，${model.relationships.length} 条关系`}
        >
          <defs>
            <marker
              id="graph-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary" />
            </marker>
          </defs>

          {/* 边（先画，压在节点下面） */}
          {model.relationships.map((r) => {
            const from = posById.get(r.fromDatasetId)
            const to = posById.get(r.toDatasetId)
            if (!from || !to) return null
            const sel: SelKey = `relationship:${r.id}`
            const active = selection === sel
            // 自关联：节点上方画环
            if (r.fromDatasetId === r.toDatasetId) {
              const cx = from.x
              const cy = from.y - NODE_H / 2
              return (
                <g
                  key={r.id}
                  onClick={(e) => handleClick(sel, e)}
                  className="cursor-pointer"
                  role="button"
                  aria-label={`自关联关系 ${r.name}`}
                >
                  <path
                    d={`M ${cx - 28} ${cy} C ${cx - 44} ${cy - 52}, ${cx + 44} ${cy - 52}, ${cx + 28} ${cy}`}
                    fill="none"
                    strokeWidth={active ? 2.5 : 1.5}
                    className={active ? 'stroke-primary' : 'stroke-muted-foreground/50'}
                    markerEnd="url(#graph-arrow)"
                  />
                  <text
                    x={cx}
                    y={cy - 44}
                    textAnchor="middle"
                    className={`font-mono text-[10px] ${active ? 'fill-primary' : 'fill-muted-foreground'}`}
                  >
                    {r.name}
                  </text>
                </g>
              )
            }
            const a = shrink(from, to)
            const b = shrink(to, from)
            const offset = edgeOffsets.get(r.id) ?? 0
            // 垂直方向偏移的控制点，错开平行边
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            const dx = b.x - a.x
            const dy = b.y - a.y
            const len = Math.hypot(dx, dy) || 1
            const cx = mx + (-dy / len) * offset
            const cy = my + (dx / len) * offset
            const labelX = (a.x + 2 * cx + b.x) / 4
            const labelY = (a.y + 2 * cy + b.y) / 4
            return (
              <g
                key={r.id}
                onClick={(e) => handleClick(sel, e)}
                className="cursor-pointer"
                role="button"
                aria-label={`关系 ${r.name}：${r.fromColumns.join(',')} → ${r.toColumns.join(',')}`}
              >
                <path
                  d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
                  fill="none"
                  strokeWidth={active ? 2.5 : 1.5}
                  className={active ? 'stroke-primary' : 'stroke-muted-foreground/50'}
                  markerEnd="url(#graph-arrow)"
                />
                {/* 命中区域加宽，方便点击 */}
                <path
                  d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
                  fill="none"
                  strokeWidth="14"
                  className="stroke-transparent"
                />
                <text
                  x={labelX}
                  y={labelY - 6}
                  textAnchor="middle"
                  className={`font-mono text-[10px] ${active ? 'fill-primary font-medium' : 'fill-muted-foreground'}`}
                >
                  {r.name}
                </text>
                <text
                  x={labelX}
                  y={labelY + 8}
                  textAnchor="middle"
                  className="fill-muted-foreground/70 font-mono text-[9px]"
                >
                  {r.fromColumns.join(',')} → {r.toColumns.join(',')}
                </text>
              </g>
            )
          })}

          {/* 节点 */}
          {model.datasets.map((ds, i) => {
            const pos = positions[i]
            const sel: SelKey = `dataset:${ds.id}`
            const active = selection !== null && (selection === sel || selection.startsWith(`${sel}.`))
            return (
              <g
                key={ds.id}
                transform={`translate(${pos.x - NODE_W / 2}, ${pos.y - NODE_H / 2})`}
                onClick={(e) => handleClick(sel, e)}
                className="cursor-pointer"
                role="button"
                aria-label={`数据集 ${ds.name}，${ds.fields.length} 个字段`}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx="8"
                  strokeWidth={active ? 2 : 1}
                  className={
                    active ? 'fill-card stroke-primary' : 'fill-card stroke-border hover:stroke-primary/50'
                  }
                />
                <text
                  x={NODE_W / 2}
                  y={24}
                  textAnchor="middle"
                  className={`font-mono text-xs font-medium ${active ? 'fill-primary' : 'fill-foreground'}`}
                >
                  {ds.name.length > 22 ? `${ds.name.slice(0, 21)}…` : ds.name || '未命名'}
                </text>
                <text
                  x={NODE_W / 2}
                  y={42}
                  textAnchor="middle"
                  className="fill-muted-foreground font-mono text-[10px]"
                >
                  {ds.fields.length} fields
                  {ds.primaryKey.length > 0 ? ` · PK ${ds.primaryKey.join(',')}` : ''}
                </text>
                <text
                  x={NODE_W / 2}
                  y={56}
                  textAnchor="middle"
                  className="fill-muted-foreground/60 font-mono text-[9px]"
                >
                  {ds.source.length > 28 ? `${ds.source.slice(0, 27)}…` : ds.source}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <p className="pt-2 text-xs text-muted-foreground">
        点击节点或边可定位到对应配置；关系方向为 from（多端）指向 to（一端）。
      </p>
    </div>
  )
}
