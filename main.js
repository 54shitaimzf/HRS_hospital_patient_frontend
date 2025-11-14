import App from './App'
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { useUserStore } from './store/user.js'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  // 启动时恢复登录态
  const userStore = useUserStore()
  userStore.hydrate()
  return { app }
}
