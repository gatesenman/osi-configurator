import { app, BrowserWindow, protocol, net, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 打包后静态资源位于 asar 内的 out/ 目录
const OUT_DIR = path.join(__dirname, '..', 'out')
const DEV_URL = process.env.ELECTRON_DEV_URL ?? 'http://localhost:3000'

// app:// 自定义协议：以标准安全协议加载 Next.js 静态导出产物
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
])

/** 将 app:// 请求映射到 out/ 下的静态文件 */
function resolveStatic(requestUrl) {
  const { pathname } = new URL(requestUrl)
  let rel = decodeURIComponent(pathname)
  if (rel === '/' || rel === '') rel = '/index.html'
  let target = path.normalize(path.join(OUT_DIR, rel))
  // 防目录穿越
  if (!target.startsWith(OUT_DIR)) return path.join(OUT_DIR, 'index.html')
  // 无扩展名的路由回退到 <route>.html，再回退单页入口
  if (!path.extname(target)) {
    if (fs.existsSync(`${target}.html`)) return `${target}.html`
    if (!fs.existsSync(target)) return path.join(OUT_DIR, 'index.html')
  }
  return target
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#fafafa',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // 外部链接用系统浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (app.isPackaged) {
    win.loadURL('app://osi/')
  } else {
    win.loadURL(DEV_URL)
  }
}

app.whenReady().then(() => {
  if (app.isPackaged) {
    protocol.handle('app', (request) =>
      net.fetch(pathToFileURL(resolveStatic(request.url)).toString()),
    )
  }
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // macOS 惯例：关闭全部窗口后应用常驻 Dock
  if (process.platform !== 'darwin') app.quit()
})
