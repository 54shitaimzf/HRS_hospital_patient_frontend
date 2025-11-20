import App from './App'
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { useUserStore } from './store/user.js'
import { setServerMode, currentServerMode } from './utils/api.js'
import { DEFAULT_SERVER_MODE, FORCE_SERVER_MODE } from './config/mode.js'

function initServerMode() {
  try {
    // URL 参数覆盖（仅 H5 或支持 window.location 的平台）
    let override = ''
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search)
      const q = params.get('serverMode')
      if (q === 'mock' || q === 'prod') override = q
    }
    const stored = uni.getStorageSync('serverMode')
    if (override) {
      setServerMode(override)
    } else if (!stored || FORCE_SERVER_MODE) {
      setServerMode(DEFAULT_SERVER_MODE)
    }
    // 可选：在控制台输出当前模式
    console.log('[serverMode]', currentServerMode())
  } catch (e) {
    console.warn('initServerMode failed', e)
  }
}

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  // 启动时恢复登录态
  const userStore = useUserStore()
  userStore.hydrate()
  // 初始化服务器模式（宏式开关）
  initServerMode()
  return { app }
}
