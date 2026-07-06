/**
 * OSI 配置器标识：语义互操作图记
 *
 * 设计语义：
 * - 中心节点 = 统一语义模型（单一事实来源）
 * - 三个外围节点 = 不同厂商 / 平台（Snowflake、dbt、BI 工具等）
 * - 连接线 = 语义在各方之间的无损互换（Interchange）
 * - 外圈六边形轮廓 = 规范约束（Schema），呼应结构化与稳定性
 */
export function OsiLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="OSI 配置器标识"
    >
      {/* 六边形外框：规范边界 */}
      <path
        d="M16 2.8 27.2 9.4v13.2L16 29.2 4.8 22.6V9.4L16 2.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.35"
      />
      {/* 互换连接线：中心到三方 */}
      <path
        d="M16 16 16 8.6M16 16l-6.4 3.7M16 16l6.4 3.7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* 三个厂商节点 */}
      <circle cx="16" cy="8.6" r="2.6" fill="currentColor" />
      <circle cx="9.6" cy="19.7" r="2.6" fill="currentColor" />
      <circle cx="22.4" cy="19.7" r="2.6" fill="currentColor" />
      {/* 中心语义模型节点：空心强调枢纽 */}
      <circle cx="16" cy="16" r="3.4" fill="var(--card, #fff)" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
