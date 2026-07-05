/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静态导出：产物为纯静态文件，供 Electron 桌面壳加载（同时兼容网页部署）
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
