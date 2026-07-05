/**
 * 应用通用设置：主题、预览默认格式、联动滚动等，保存在本机 localStorage。
 */

export interface AppSettings {
  /** 主题外观 */
  theme: 'system' | 'light' | 'dark'
  /** 右侧预览默认格式 */
  previewFormat: 'yaml' | 'json'
  /** 左右联动时自动滚动对齐（关闭后仅高亮不滚动） */
  linkScroll: boolean
  /** 表单联动时自动展开折叠的字段卡 */
  autoExpand: boolean
}

const KEY = 'osi-app-settings'

export function defaultAppSettings(): AppSettings {
  return { theme: 'system', previewFormat: 'yaml', linkScroll: true, autoExpand: true }
}

export function loadAppSettings(): AppSettings {
  if (typeof window === 'undefined') return defaultAppSettings()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultAppSettings()
    return { ...defaultAppSettings(), ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch {
    return defaultAppSettings()
  }
}

export function saveAppSettings(s: AppSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // 存储不可用时静默忽略
  }
}

/** 按设置切换 <html> 的 dark class（system 跟随操作系统偏好） */
export function applyTheme(theme: AppSettings['theme']) {
  if (typeof document === 'undefined') return
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}
