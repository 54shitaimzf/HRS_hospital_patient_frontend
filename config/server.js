// 服务器环境配置与切换工具
// 如果需要宏式全局切换，请在 config/mode.js 中设定 DEFAULT_SERVER_MODE，然后调用 setServerMode。
// 本文件提供最小封装供 utils/api.js 使用。

import { DEFAULT_SERVER_MODE } from './mode.js'

export const SERVER_PROD = 'https://your-real-server.example.com' // TODO: 替换为真实生产地址
export const SERVER_MOCK = 'http://localhost:8082'

export function getServerMode() {
  try {
    const m = uni.getStorageSync('serverMode')
    if (m === 'mock' || m === 'prod') return m
    return DEFAULT_SERVER_MODE || 'prod'
  } catch (_) {
    return DEFAULT_SERVER_MODE || 'prod'
  }
}

export function setServerMode(mode) {
  if (mode !== 'mock' && mode !== 'prod') return false
  try { uni.setStorageSync('serverMode', mode); return true } catch (_) { return false }
}

export function getBaseUrl() {
  const mode = getServerMode()
  return mode === 'mock' ? SERVER_MOCK : SERVER_PROD
}
