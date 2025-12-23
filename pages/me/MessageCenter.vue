<template>
  <view class="message-page">
    <view class="hero-card">
      <view class="hero-header">
        <text class="hero-title">消息中心</text>
        <view class="hero-tag" :class="{ 'hero-tag--active': hasNew }">
          {{ hasNew ? '有新通知' : '最新' }}
        </view>
      </view>
      <view class="hero-body">
        <text class="hero-summary">{{ summaryText }}</text>
        <text class="hero-time" v-if="lastUpdated">上次同步 · {{ lastUpdated }}</text>
        <button class="refresh-btn" size="mini" @click="handleRefresh" :loading="refreshing" :disabled="loading">
          {{ refreshing ? '刷新中' : '立即刷新' }}
        </button>
      </view>
    </view>

    <!-- 新增筛选栏 -->
    <view class="filter-bar">
      <view
        v-for="opt in filters"
        :key="opt.key"
        class="filter-item"
        :class="{ 'filter-item--active': selectedFilter === opt.key }"
        @click="() => changeFilter(opt.key)"
      >
        {{ opt.label }}
      </view>
    </view>

    <view v-if="loading" class="state-card">
      <view class="skeleton" v-for="i in 3" :key="i">
        <view class="bone title"></view>
        <view class="bone text"></view>
        <view class="bone text short"></view>
      </view>
    </view>

    <view v-else-if="error" class="state-card error-card">
      <text class="state-title">加载失败</text>
      <text class="state-text">{{ error }}</text>
      <button class="retry-btn" size="mini" @click="handleRefresh">重新加载</button>
    </view>

    <view v-else-if="filteredMessages.length === 0" class="state-card empty-card">
      <image class="empty-icon" src="/static/images/tabbar/message.png" mode="aspectFit"></image>
      <text class="state-title">暂无消息</text>
      <text class="state-text">最近还没有新的通知，祝您生活愉快</text>
    </view>

    <view v-else>
      <view class="message-card" v-for="(msg, index) in filteredMessages" :key="msg.__localId || index">
        <view class="message-head">
          <text class="message-title">{{ msg.title }}</text>
          <text class="message-time">{{ msg.displayTime }}</text>
        </view>
        <text class="message-content">{{ msg.content }}</text>
        <view class="message-meta">
          <!-- 左侧显示已读/未读，右侧一直保留按钮的空间 -->
          <text class="meta-read" :class="{ 'meta-read--unread': !msg.isRead }">{{ msg.isRead ? '已读' : '未读' }}</text>

          <!-- 始终渲染按钮以保证布局一致：已读时用 visibility:hidden 保留空间，并 disabled 防止交互 -->
          <button
            class="confirm-btn"
            :class="{ 'confirm-btn--hidden': msg.isRead }"
            :disabled="msg.isRead"
            size="mini"
            @click="confirmMessage(msg)"
          >
            {{ msg.isRead ? '' : '确认' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user.js'
import { fetchUnreadMessages } from '../../utils/api.js'

const loading = ref(true)
const refreshing = ref(false)
const messages = ref([]) // 存储合并后的所有消息
const hasNew = ref(false)
const error = ref('')
const lastUpdated = ref('')
const userStore = useUserStore()

// 筛选相关
const filters = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'read', label: '已读' }
]
const selectedFilter = ref('all')

const summaryText = computed(() => hasNew.value ? '您有新的消息，请及时查看' : '暂无新消息，稍后再来看看吧')

const filteredMessages = computed(() => {
  if (selectedFilter.value === 'all') return messages.value
  if (selectedFilter.value === 'unread') return messages.value.filter(m => !m.isRead)
  if (selectedFilter.value === 'read') return messages.value.filter(m => m.isRead)
  return messages.value
})

function changeFilter(key) {
  selectedFilter.value = key
}

onLoad(async () => {
  uni.setNavigationBarTitle({ title: '消息中心' })
  await loadMessages()
})

onPullDownRefresh(async () => {
  await loadMessages({ silent: true })
  uni.stopPullDownRefresh()
})

async function handleRefresh() {
  if (refreshing.value) return
  await loadMessages({ silent: true })
}

// 尝试从 item 中提取唯一 id（尽量兼容后端字段）
function getMessageId(item = {}) {
  return item.id || item.messageId || item.msgId || item.uuid || item._id || null
}

function makeLocalId(item, idx) {
  // 保证在无 id 的情况下也能有一个稳定的 key
  const id = getMessageId(item)
  if (id) return String(id)
  // fallback: 使用 timestamp + index + 简短内容哈希
  const ts = item.timestamp || item.time || ''
  const snippet = (item.content || item.title || '').slice(0, 20)
  return `local_${ts}_${idx}_${snippet}`
}

function loadCache(pid) {
  try {
    const raw = uni.getStorageSync(`messages_cache_${pid}`)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

function saveCache(pid, data = []) {
  try {
    uni.setStorageSync(`messages_cache_${pid}`, JSON.stringify(data))
  } catch (e) {
    // ignore
  }
}

async function loadMessages({ silent = false } = {}) {
  if (!silent) loading.value = true
  error.value = ''
  refreshing.value = silent
  try {
    const pid = await userStore.ensurePatientId()
    if (!pid) {
      uni.showModal({
        title: '提示',
        content: '需要登录后才能查看消息，是否前往登录？',
        success: (res) => {
          if (res.confirm) uni.navigateTo({ url: '/pages/login/Login' })
        }
      })
      messages.value = []
      hasNew.value = false
      return
    }

    // 后端当前只提供未读接口：fetchUnreadMessages
    const { hasNew: status, messages: list } = await fetchUnreadMessages({ patientId: pid })
    hasNew.value = status

    // 标记后端返回的为未读
    const unreadList = Array.isArray(list) ? list.map((it, idx) => ({ ...it, isRead: false, __localId: makeLocalId(it, idx) })) : []

    // 读取本地缓存（之前已读或见过的消息）
    const cached = loadCache(pid) // 期望格式：[{...item, isRead: true, __localId}]

    // 合并：使用 map 保证按 id 去重，优先保留 server 的未读信息（它们是最新的）
    const map = new Map()

    // 先把缓存放进去（这些通常是已读或历史消息）
    for (let i = 0; i < cached.length; i++) {
      const it = cached[i]
      const lid = it.__localId || makeLocalId(it, i)
      it.__localId = lid
      // 确保有 isRead 字段
      if (typeof it.isRead !== 'boolean') it.isRead = true
      map.set(lid, it)
    }

    // 再把未读放入，覆盖同 id 的缓存（表示该消息现在为未读）
    for (let i = 0; i < unreadList.length; i++) {
      const it = unreadList[i]
      const lid = it.__localId || makeLocalId(it, i)
      it.__localId = lid
      // 如果缓存里存在并且已读，我们应该把 isRead 设置为 false（因为 server 返回未读）
      it.isRead = false
      map.set(lid, it)
    }

    // 最终数组按时间倒序（最新在前）
    const merged = Array.from(map.values()).sort((a, b) => {
      const ta = a.timestamp || a.time || 0
      const tb = b.timestamp || b.time || 0
      return Number(tb) - Number(ta)
    })

    messages.value = merged.map((item, idx) => normalizeMessage(item, idx))

    // 将合并后的消息缓存到本地（保存 isRead 与 __localId）
    saveCache(pid, messages.value)

    lastUpdated.value = formatTimestamp(Date.now())
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function normalizeMessage(item = {}, fallbackIndex = 0) {
  const title = item.title || `系统通知 ${fallbackIndex + 1}`
  const content = item.content || '暂无内容'
  const displayTime = formatTimestamp(item.timestamp)
  // 保证 isRead 和 __localId 存在
  const isRead = typeof item.isRead === 'boolean' ? item.isRead : Boolean(item.read) || false
  const localId = item.__localId || makeLocalId(item, fallbackIndex)
  return { ...item, title, content, displayTime, isRead, __localId: localId }
}

function formatTimestamp(input) {
  // 兼容各种输入：数字(ms)、Date 对象、以及不同格式的字符串（兼容 iOS WebView）
  try {
    if (!input) {
      const now = new Date()
      return formatDateObj(now)
    }
    // 如果已经是 Date
    if (input instanceof Date) {
      if (Number.isNaN(input.getTime())) return ''
      return formatDateObj(input)
    }
    // 如果是纯数字（时间戳字符串或数字）
    if (typeof input === 'number' || (/^\d+$/.test(String(input).trim()))) {
      const num = Number(input)
      const d = new Date(num)
      if (!Number.isNaN(d.getTime())) return formatDateObj(d)
    }
    // 如果是字符串，按兼容策略尝试解析
    if (typeof input === 'string') {
      const s = input.trim()
      // 1) 如果是 ISO 格式（含 T 或 Z 或 + 时区），直接尝试
      if (s.includes('T') || s.endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(s)) {
        const dIso = new Date(s)
        if (!Number.isNaN(dIso.getTime())) return formatDateObj(dIso)
      }
      // 2) 常见后端返回的 'YYYY-MM-DD HH:mm:ss'，iOS 可能解析失败 => 转成 'YYYY/MM/DD HH:mm:ss'
      // 也支持 'YYYY-MM-DD' -> 'YYYY/MM/DD'
      // 尝试把日期部分的 '-' 替换为 '/'
      const replaceDash = s.replace(/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})/, (m) => m.replace(/-/g, '/'))
      const d1 = new Date(replaceDash)
      if (!Number.isNaN(d1.getTime())) return formatDateObj(d1)
      // 3) 尝试把中间空格替换为 'T'（变成 ISO-like）
      const toT = s.replace(' ', 'T')
      const d2 = new Date(toT)
      if (!Number.isNaN(d2.getTime())) return formatDateObj(d2)
    }
  } catch (e) {
    // fallthrough
  }
  return ''
}

function formatDateObj(date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  const hh = `${date.getHours()}`.padStart(2, '0')
  const mm = `${date.getMinutes()}`.padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

// 新增：确认消息为已读（仅本地记录）
async function confirmMessage(item) {
  try {
    if (!item || item.isRead) return
    // 标记为已读
    item.isRead = true
    // 更新内存中的 messages 列表（保持引用更新以触发视图）
    const key = item.__localId || makeLocalId(item, 0)
    const idx = messages.value.findIndex(m => (m.__localId || makeLocalId(m, 0)) === key)
    if (idx !== -1) {
      // 保持其他字段的一致性
      messages.value.splice(idx, 1, normalizeMessage(item, idx))
    }
    // 保存到本地缓存
    const pid = await userStore.ensurePatientId()
    if (pid) saveCache(pid, messages.value)
    // 更新 hasNew 状态
    hasNew.value = messages.value.some(m => !m.isRead)
    uni.showToast({ title: '已标为已读', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}
</script>

<style scoped>
.message-page {
  min-height: 100vh;
  padding: 40rpx 32rpx 80rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6fb 60%, #ffffff 100%);
  box-sizing: border-box;
}

/* 筛选栏样式 */
.filter-bar {
  display: flex;
  gap: 18rpx;
  margin: 18rpx 0 28rpx;
  padding: 0 4rpx;
}
.filter-item {
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: #f4f7ff;
  color: #3b4b68;
  font-size: 26rpx;
}
.filter-item--active {
  background: linear-gradient(90deg, #4f8df9 0%, #7ac6ff 100%);
  color: #fff;
}

.hero-card {
  background: linear-gradient(135deg, #4f8df9 0%, #7ac6ff 100%);
  border-radius: 28rpx;
  padding: 36rpx;
  color: #fff;
  box-shadow: 0 20rpx 40rpx rgba(79, 141, 249, 0.35);
  margin-bottom: 32rpx;
}

.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hero-title {
  font-size: 40rpx;
  font-weight: 600;
}

.hero-tag {
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  background-color: rgba(255, 255, 255, 0.35);
  color: #f4f7ff;
}

.hero-tag--active {
  background-color: #ffe08a;
  color: #a14c00;
}

.hero-body {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.hero-summary {
  font-size: 30rpx;
}

.hero-time {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.refresh-btn {
  align-self: flex-start;
  margin-top: 12rpx;
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 999rpx;
  padding: 0 24rpx;
}

.state-card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 16rpx 40rpx rgba(31, 73, 125, 0.08);
  margin-bottom: 32rpx;
}

.skeleton {
  margin-bottom: 28rpx;
}

.bone {
  background: linear-gradient(90deg, #f1f4f8 0%, #e5ecf5 50%, #f1f4f8 100%);
  animation: pulse 1.4s infinite ease-in-out;
  border-radius: 12rpx;
}

.bone.title {
  height: 28rpx;
  width: 60%;
  margin-bottom: 14rpx;
}

.bone.text {
  height: 20rpx;
  width: 100%;
  margin-bottom: 12rpx;
}

.bone.text.short {
  width: 80%;
}

@keyframes pulse {
  0% { opacity: 0.85; }
  50% { opacity: 0.45; }
  100% { opacity: 0.85; }
}

.error-card {
  border: 2rpx solid #ff9b8a;
}

.empty-card {
  align-items: center;
  text-align: center;
}

.empty-icon {
  width: 220rpx;
  height: 220rpx;
  margin-bottom: 24rpx;
  opacity: 0.85;
}

.state-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2d3d;
  margin-bottom: 12rpx;
}

.state-text {
  font-size: 26rpx;
  color: #6b7b93;
}

.retry-btn {
  margin-top: 24rpx;
  align-self: flex-start;
  background-color: #ff6f61;
  color: #fff;
  border-radius: 999rpx;
  padding: 0 30rpx;
}

.message-card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 26rpx 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(15, 32, 68, 0.06);
  border: 1rpx solid rgba(79, 141, 249, 0.1);
}

.message-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  gap: 20rpx;
}

.message-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2d3d;
}

.message-time {
  font-size: 24rpx;
  color: #8ea0bf;
}

.message-content {
  font-size: 28rpx;
  color: #50627c;
  line-height: 1.6;
}

/* 将 meta 调整为左右两端排布：左侧状态，右侧确认按钮 */
.message-meta {
  margin-top: 12rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.meta-read {
  font-size: 22rpx;
  color: #8ea0bf;
  flex: 1; /* 左侧占满剩余空间，保证右侧按钮位置固定 */
  text-align: left;
}
.meta-read--unread {
  color: #ff6b6b;
  font-weight: 600;
}

/* 圆角矩形确认按钮：固定 min-width 保证布局一致 */
.confirm-btn {
  flex: 0 0 auto;
  min-width: 140rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 14rpx;
  background: linear-gradient(90deg, #4f8df9 0%, #7ac6ff 100%);
  color: #fff;
  font-size: 26rpx;
  border: none;
  padding: 0 22rpx;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 8rpx 20rpx rgba(79, 141, 249, 0.18);
}

/* 已读时保留空间但不可见 */
.confirm-btn--hidden {
  visibility: hidden;
  opacity: 0; /* 保持不可见 */
}

.confirm-btn:disabled {
  pointer-events: none;
}
</style>
