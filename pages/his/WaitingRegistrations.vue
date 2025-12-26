<template>
  <scroll-view class="container" scroll-y="true">
    <view class="card">
      <view class="header">
        <text class="title">候补记录</text>
      </view>
      <view class="status" v-if="loading">正在加载候补记录...</view>
      <view class="status error" v-else-if="error">{{ error }} <button size="mini" @click="loadList">重试</button></view>
      <view v-else>
        <view v-if="!list.length" class="empty">暂无候补记录</view>
        <view v-for="(item, idx) in list" :key="item.waitingId || item.id || idx" class="wait-card">
          <view class="row">
            <text class="label">候补编号：</text>
            <text class="value">{{ item.waitingId || item.id || '-' }}</text>
          </view>

          <view class="row">
            <text class="label">科室：</text>
            <text class="value">{{ item.departmentName || item.departmentId || '候补' }}</text>
          </view>

          <view class="row">
            <text class="label">医生：</text>
            <text class="value">{{ item.doctorName || item.doctorId || '待定' }}<text v-if="item.doctorTitle">（{{ item.doctorTitle }}）</text></text>
          </view>

          <view class="row">
            <text class="label">日期/班次：</text>
            <text class="value">{{ item.appointmentDate || item.scheduleDate || item.date || '-' }} {{ item.timePeriodName || item.period || '' }}</text>
          </view>

          <view class="row">
            <text class="label">状态：</text>
            <text class="value status-text">{{ item.status || '候补中' }}</text>
            <text class="spacer" />
            <text class="pos" v-if="item.position || item.waitingPosition">排队第 {{ item.position || item.waitingPosition }}</text>
          </view>

          <view class="actions">
            <button :plain="true" class="action-btn detail-btn" @click="viewDetail(item)">详情</button>
            <button class="action-btn cancel-btn" :disabled="cancelling[item.waitingId || item.id]" @click="confirmCancel(item)">
              {{ cancelling[item.waitingId || item.id] ? '取消中...' : '取消' }}
            </button>
          </view>
        </view>
      </view>
    </view>

    <!-- 删掉原来的刷新按钮 -->
  </scroll-view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user.js'
import { fetchWaitingRegistrations, cancelWaitingRegistration } from '../../utils/api.js'

const userStore = useUserStore()
const loading = ref(true)
const error = ref('')
const list = ref([])
const cancelling = reactive({})

onLoad(async () => {
  await loadList()
})

onPullDownRefresh(async () => {
  await loadList()
  uni.stopPullDownRefresh()
})

async function loadList() {
  loading.value = true
  error.value = ''
  list.value = []
  try {
    const patientId = await userStore.ensurePatientId()
    if (!patientId) {
      error.value = '请先登录'
      loading.value = false
      return
    }

    const res = await fetchWaitingRegistrations({ patientId })

    // 兼容多种返回结构：
    // 1) { list: [...] }
    // 2) { items: [...] }
    // 3) { raw: { data: { items: [...] } } }
    // 4) { raw: { data: { data: { items: [...] } } } }
    // 5) 直接后端返回的对象
    let items = []

    if (res) {
      if (Array.isArray(res.list) && res.list.length) {
        items = res.list
      } else if (Array.isArray(res.items) && res.items.length) {
        items = res.items
      } else {
        const raw = res.raw ?? res
        // payload could be raw.data, raw.data.data, etc.
        const payload = (raw && (raw.data?.data ?? raw.data)) ?? raw
        if (payload && Array.isArray(payload.items) && payload.items.length) {
          items = payload.items
        } else if (Array.isArray(payload)) {
          items = payload
        } else if (raw && Array.isArray(raw.data)) {
          items = raw.data
        }
      }
    }

    // 统一字段，确保有 status/position 等
    list.value = (items || []).map(it => ({
      ...it,
      status: it.status || it.state || '候补中',
      position: it.position ?? it.waitingPosition ?? 0
    }))
  } catch (e) {
    error.value = e?.message || '加载候补记录失败'
  } finally {
    loading.value = false
  }
}

function viewDetail(item) {
  // 目前没有详细页面，先弹窗展示关键字段
  const text = `候补ID: ${item.waitingId || item.id || '-'}\n医生: ${item.doctorName || '-'}\n科室: ${item.departmentName || item.departmentId || '-'}\n日期: ${item.appointmentDate || item.scheduleDate || item.date || '-'}\n状态: ${item.status || '候补中'}`
  uni.showModal({ title: '候补详情', content: text, showCancel: false })
}

function confirmCancel(item) {
  uni.showModal({
    title: '取消候补',
    content: '确定取消该候补记录吗？',
    success: async (res) => {
      if (res.confirm) {
        await doCancel(item)
      }
    }
  })
}

async function doCancel(item) {
  const id = item.waitingId || item.id
  if (!id) {
    uni.showToast({ title: '无效的候补记录', icon: 'none' })
    return
  }
  // 尽量使用本地缓存或通过 ensurePatientId 获取 patientId，避免直接依赖可能未更新的 store 字段
  let pid = userStore.patientId || null
  try {
    if (!pid) pid = uni.getStorageSync('patientId') || null
  } catch (_) { pid = pid }

  if (!pid) {
    // 确保从服务端获取并更新 store
    pid = await userStore.ensurePatientId()
  }

  if (!pid) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  cancelling[id] = true
  try {
    // 将本地解析到的 pid 传入 API，避免 race condition
    await cancelWaitingRegistration({ waitingId: id, patientId: pid })
    // remove from list
    list.value = list.value.filter(i => (i.waitingId || i.id) !== id)
  } catch (e) {
    uni.showToast({ title: e?.message || '取消失败', icon: 'none' })
  } finally {
    cancelling[id] = false
  }
}
</script>

<style scoped>
/* Layout and visual polish to match app style, eliminate horizontal overflow */
.container {
  padding: 36rpx;
  background: linear-gradient(135deg, #eaf6ff, #e3f2fd);
  min-height: 100vh;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 10rpx 30rpx rgba(78,157,235,0.06);
  overflow: hidden;
}

.header { margin-bottom: 14rpx }
.title {
  font-size: 36rpx;
  font-weight: 800;
  color: #0f4db6;
}

.status { padding: 20rpx; color: #666 }
.error { color: #e53935 }
.empty { text-align: center; padding: 48rpx 0; color: #9aa4b2 }

/* each record card */
.wait-card {
  border-radius: 14rpx;
  padding: 22rpx;
  background: #ffffff;
  margin-bottom: 14rpx;
  box-shadow: 0 6rpx 18rpx rgba(16,64,128,0.04);
  border: 1rpx solid rgba(15,77,182,0.04);
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 10rpx;
}

.label {
  width: 120rpx;
  flex: 0 0 120rpx;
  color: #6b7280;
  font-size: 28rpx;
}

.value {
  color: #111827;
  font-size: 28rpx;
  flex: 1 1 auto;
  min-width: 0; /* prevents flex item from overflowing container */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-text { color: #1976d2; font-weight: 700 }
.pos { color: #ff9800; font-weight: 700 }
.spacer { flex: 1 }

.actions {
  margin-top: 14rpx;
  display: flex;
  gap: 12rpx;
  justify-content: flex-end;
}

/* make action buttons equal width and smaller */
.action-btn {
  flex: 1 1 0;
  min-width: 0;
  padding: 8rpx 12rpx;
  font-size: 26rpx;
  border-radius: 10rpx;
  box-sizing: border-box;
}

.detail-btn {
  background: #fff;
  border: 1rpx solid #dbeafe;
  color: #0f4db6;
}

.cancel-btn {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
  color: #fff;
}
</style>
