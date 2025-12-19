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

    <view v-else-if="messages.length === 0" class="state-card empty-card">
      <image class="empty-icon" src="/static/images/tabbar/message.png" mode="aspectFit"></image>
      <text class="state-title">暂无消息</text>
      <text class="state-text">最近还没有新的通知，祝您生活愉快</text>
    </view>

    <view v-else>
      <view class="message-card" v-for="(msg, index) in messages" :key="index">
        <view class="message-head">
          <text class="message-title">{{ msg.title }}</text>
          <text class="message-time">{{ msg.displayTime }}</text>
        </view>
        <text class="message-content">{{ msg.content }}</text>
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
const messages = ref([])
const hasNew = ref(false)
const error = ref('')
const lastUpdated = ref('')
const userStore = useUserStore()

const summaryText = computed(() => hasNew.value ? '您有新的消息，请及时查看' : '暂无新消息，稍后再来看看吧')

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
    const { hasNew: status, messages: list } = await fetchUnreadMessages({ patientId: pid })
    hasNew.value = status
    messages.value = Array.isArray(list) ? list.map((item, idx) => normalizeMessage(item, idx)) : []
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
  return { ...item, title, content, displayTime }
}

function formatTimestamp(input) {
  const date = input ? new Date(input) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  const hh = `${date.getHours()}`.padStart(2, '0')
  const mm = `${date.getMinutes()}`.padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}
</script>

<style scoped>
.message-page {
  min-height: 100vh;
  padding: 40rpx 32rpx 80rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6fb 60%, #ffffff 100%);
  box-sizing: border-box;
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
</style>

