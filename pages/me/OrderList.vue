<template>
  <view class="page-container">
    <view class="list">
      <view v-if="loading" class="loading-initial">加载中...</view>
      <view v-else-if="!loading && orders.length === 0" class="empty">
        <text class="empty-text">暂无订单记录</text>
      </view>

      <view v-for="item in orders" :key="item.paymentId" class="card">
        <view class="card-header">
          <text class="date">{{ formatTime(item.payTime) }}</text>
          <text class="status" :class="statusClass(item.payStatus)">{{ item.payStatus }}</text>
        </view>
        <view class="line"><text class="label">科室:</text><text class="value">{{ item.departmentName || '—' }}</text></view>
        <view class="line"><text class="label">医生:</text><text class="value">{{ item.doctorName || '—' }}</text></view>
        <view class="line"><text class="label">金额:</text><text class="value price">¥{{ item.askPayAmount }}</text></view>
        <view class="line" v-if="item.reimburseType"><text class="label">报销:</text><text class="value">{{ item.reimburseType }} ({{ item.reimbursePercent }}%)</text></view>

        <view class="actions">
          <button v-if="item.payStatus === '待支付'" size="mini" class="pay-btn" @click="goToPay(item)">去支付</button>
          <button v-if="item.payStatus !== '已取消'" size="mini" class="cancel-btn" @click="cancel(item)">取消订单</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user.js'
import { fetchPayments, cancelOrder } from '../../utils/api.js'

const userStore = useUserStore()
const orders = ref([])
const loading = ref(false)

onShow(() => {
  loadOrders()
})

async function loadOrders() {
  if (!userStore.userInfo.patientId) {
    uni.showToast({ title: '未找到患者信息', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const res = await fetchPayments({ patientId: userStore.userInfo.patientId })
    orders.value = res.list
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function formatTime(t) {
  if (!t) return '—'
  return t.replace('T', ' ').substring(0, 19)
}

function statusClass(status) {
  if (status === '已支付') return 'st-paid'
  if (status === '待支付') return 'st-pending'
  if (status === '已取消') return 'st-cancel'
  return ''
}

function goToPay(item) {
  uni.navigateTo({
    url: `/pages/pay/Payment?paymentId=${item.paymentId}`
  })
}

async function cancel(item) {
  const res = await uni.showModal({
    title: '确认取消',
    content: '确定要取消该订单吗？' + (item.payStatus === '已支付' ? ' (已支付订单取消后将退回号源)' : ''),
    confirmColor: '#ff4d4f'
  })
  if (res.confirm) {
    try {
      await cancelOrder(item.paymentId)
      loadOrders() // 刷新列表
    } catch (e) {
      // error handled in api
    }
  }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 20rpx;
}
.loading-initial, .empty {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 28rpx;
}
.card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.date {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}
.status {
  font-size: 26rpx;
}
.st-paid { color: #52c41a; }
.st-pending { color: #faad14; }
.st-cancel { color: #999; }

.line {
  display: flex;
  margin-bottom: 12rpx;
  font-size: 28rpx;
}
.label {
  color: #888;
  width: 120rpx;
}
.value {
  color: #333;
  flex: 1;
}
.price {
  color: #ff4d4f;
  font-weight: bold;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}
.pay-btn {
  background-color: #1890ff;
  color: #fff;
  border: none;
}
.cancel-btn {
  background-color: #fff;
  color: #666;
  border: 1rpx solid #ddd;
}
</style>
