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
          <!-- 已支付的订单不可取消 -->
          <button v-if="item.payStatus !== '已取消' && item.payStatus !== '已支付'" size="mini" class="cancel-btn" @click="cancel(item)">取消订单</button>
          <!-- 新增：已支付订单显示详情按钮 -->
          <button v-if="item.payStatus === '已支付'" size="mini" class="detail-btn" @click="openDetail(item)">详情</button>
        </view>
      </view>

      <!-- 浮窗：费用预览与费用明细 -->
      <view v-if="showDetailModal" class="modal-overlay">
        <view class="modal-card">
          <view class="modal-header">
            <text class="modal-title">费用详情</text>
            <button class="modal-close" @click="closeDetail">×</button>
          </view>

          <scroll-view class="modal-body" scroll-y="true" style="max-height: 70vh;">
            <view v-if="detailLoading" class="loading-initial">加载中...</view>

            <view v-else>
              <!-- 费用汇总视图（根据提供的 JSON 格式展示） -->
              <view v-if="feeInfo" class="fee-summary">
                <view class="summary-row"><text class="summary-label">医生:</text><text class="summary-value">{{ feeInfo.doctorName || '—' }} {{ feeInfo.doctorTitle || '' }}</text></view>
                <view class="summary-row"><text class="summary-label">科室:</text><text class="summary-value">{{ feeInfo.departmentName || '—' }}</text></view>
                <view class="summary-row"><text class="summary-label">排班:</text><text class="summary-value">{{ feeInfo.scheduleDate || '—' }} {{ feeInfo.timePeriod || '' }}</text></view>
                <view class="summary-row"><text class="summary-label">挂号费:</text><text class="summary-value price">¥{{ formatAmount(feeInfo.registrationFee) }}</text></view>
                <view class="summary-row"><text class="summary-label">报销类型:</text><text class="summary-value">{{ feeInfo.reimburseType || '—' }} ({{ feeInfo.reimbursePercent || 0 }}%)</text></view>
                <view class="summary-row"><text class="summary-label">已报销:</text><text class="summary-value">¥{{ formatAmount(feeInfo.reimbursedAmount) }}</text></view>
                <view class="summary-row"><text class="summary-label">实付:</text><text class="summary-value price">¥{{ formatAmount(feeInfo.actualPayAmount) }}</text></view>
                <view class="summary-row"><text class="summary-label">医保余额:</text><text class="summary-value">¥{{ formatAmount(feeInfo.medicalInsuranceBalance) }}</text></view>
                <view class="summary-row"><text class="summary-label">可承担:</text><text :class="['summary-value', feeInfo.canAfford ? 'afford-yes' : 'afford-no']">{{ feeInfo.canAfford ? '是' : '否' }}</text></view>
              </view>

              <view v-if="feePreview">
                <view class="section-title">费用预览</view>
                <view class="line" v-for="(it, idx) in previewItems" :key="it.code || idx">
                  <text class="label">{{ it.name || it.title || '项目' }}</text>
                  <text class="value">¥{{ formatAmount(it.amount) }}</text>
                </view>
                <view class="line"><text class="label">实付:</text><text class="value price">¥{{ formatAmount(feePreview.actualPayAmount || feePreview.actualPay || feePreview.actualPayAmount) }}</text></view>
              </view>

              <view v-if="!feePreview && !feeInfo" class="empty"><text class="empty-text">未获取到费用信息</text></view>
            </view>
          </scroll-view>

          <!-- 浮窗底部操作区（支付/关闭） -->
          <view class="modal-footer">
            <button v-if="feeInfo && currentOrderForModal && currentOrderForModal.payStatus === '待支付'" :disabled="!feeInfo.canAfford" class="modal-pay-btn" @click="modalPay">去支付</button>
            <button v-else-if="feeInfo && !currentOrderForModal" :disabled="!feeInfo.canAfford" class="modal-pay-btn" @click="modalPay">去支付</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user.js'
import { fetchPayments, cancelOrder, fetchRegistrationFeePreview } from '../../utils/api.js'

const userStore = useUserStore()
const orders = ref([])
const loading = ref(false)

// 详情浮窗相关
const showDetailModal = ref(false)
const detailLoading = ref(false)
const feePreview = ref(null)
const currentOrderForModal = ref(null)

function formatAmount(a) {
  const n = Number(a || 0)
  return isNaN(n) ? '0.00' : n.toFixed(2)
}

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
  // Prevent cancelling paid orders here as an extra guard
  if (item?.payStatus === '已支付') {
    uni.showToast({ title: '已支付订单无法取消', icon: 'none' })
    return
  }

  const res = await new Promise((resolve) => {
    uni.showModal({
      title: '确认取消',
      content: '确定要取消该订单吗？',
      confirmColor: '#ff4d4f',
      success: (r) => resolve(r),
      fail: () => resolve({ confirm: false })
    })
  })

  if (res && res.confirm) {
    try {
      await cancelOrder(item.paymentId)
      loadOrders() // 刷新列表
    } catch (e) {
      // error handled in api
    }
  }
}

// 打开详情浮窗：调用 fee preview 接口（feedetail 已移除）
async function openDetail(item) {
  currentOrderForModal.value = item
  // 需要 patientId 与 scheduleRecordId
  const pid = item.patientId || userStore.userInfo.patientId
  const sched = item.scheduleRecordId || item.scheduleId || ''
  if (!pid || !sched) {
    uni.showToast({ title: '缺少患者或排班信息，无法获取费用详情', icon: 'none' })
    return
  }

  showDetailModal.value = true
  detailLoading.value = true
  feePreview.value = null

  try {
    const previewRes = await fetchRegistrationFeePreview({ patientId: pid, scheduleRecordId: sched })
    feePreview.value = previewRes?.feePreview ?? previewRes
  } catch (e) {
    console.error('费用预览失败', e)
    uni.showToast({ title: '获取费用信息失败', icon: 'none' })
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  showDetailModal.value = false
  feePreview.value = null
  currentOrderForModal.value = null
}

// 根据 feePreview 提取汇总信息
const feeInfo = computed(() => {
  const src = feePreview.value || null
  if (!src) return null
  // 兼容不同字段命名
  return {
    scheduleRecordId: src.scheduleRecordId || src.scheduleId || src.data?.scheduleRecordId || src.data?.scheduleId || '',
    doctorId: src.doctorId || src.data?.doctorId || '',
    doctorName: src.doctorName || src.data?.doctorName || src.doctor || '',
    doctorTitle: src.doctorTitle || src.data?.doctorTitle || '',
    departmentName: src.departmentName || src.data?.departmentName || '',
    scheduleDate: src.scheduleDate || src.data?.scheduleDate || '',
    timePeriod: src.timePeriod || src.data?.timePeriod || '',
    registrationFee: src.registrationFee ?? src.data?.registrationFee ?? src.fee ?? src.amount ?? 0,
    reimburseType: src.reimburseType || src.data?.reimburseType || '',
    reimbursePercent: src.reimbursePercent ?? src.data?.reimbursePercent ?? 0,
    reimbursedAmount: src.reimbursedAmount ?? src.data?.reimbursedAmount ?? src.reimbursed ?? 0,
    actualPayAmount: src.actualPayAmount ?? src.data?.actualPayAmount ?? src.actualPay ?? 0,
    medicalInsuranceBalance: src.medicalInsuranceBalance ?? src.data?.medicalInsuranceBalance ?? 0,
    canAfford: typeof src.canAfford !== 'undefined' ? src.canAfford : (src.data?.canAfford ?? true)
  }
})

// 组合渲染用的数组（仅来自 preview）
const previewItems = computed(() => {
  if (!feePreview.value) return []
  const p = feePreview.value
  const list = p.items || p.feeItems || p.feeDetail || p.feeList || []
  return Array.isArray(list) ? list.map(i => ({ name: i.name || i.title || i.itemName || i.feeName, amount: Number(i.amount) || Number(i.price) || Number(i.feeAmount) || 0, code: i.code || i.itemCode })) : []
})

// 在浮窗内直接发起支付（优先使用已有 paymentId）
function modalPay() {
  const order = currentOrderForModal.value || {}
  if (order.paymentId) {
    goToPay(order)
    return
  }
  // 如果没有 paymentId，尝试使用 scheduleRecordId + patientId 跳转到支付页
  const pid = order.patientId || userStore.userInfo.patientId
  const sched = (feeInfo.value && feeInfo.value.scheduleRecordId) || order.scheduleRecordId || order.scheduleId || ''
  const amount = feeInfo.value ? feeInfo.value.actualPayAmount : (order.askPayAmount || 0)
  if (!sched || !pid) {
    uni.showToast({ title: '无法跳转到支付页面，缺少排班或患者信息', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pages/pay/Payment?scheduleRecordId=${sched}&patientId=${pid}&amount=${amount}` })
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
.detail-btn {
  background-color: #fff;
  color: #1890ff;
  border: 1rpx solid #1890ff;
}

/* 浮窗样式 */
.modal-overlay {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}
.modal-card {
  width: 86%;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.2);
  position: relative; /* enable absolute positioning for close button */
}
.modal-header { display:flex; justify-content:flex-start; align-items:center; margin-bottom:12rpx; padding-right: 70rpx; }
.modal-title { font-size:30rpx; font-weight:600 }
/* 改为右上角的红色边线关闭按钮 */
.modal-close {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  height: 40rpx;
  line-height: 40rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 10rpx; /* 圆角矩形 */
  border: 2rpx solid #ff4d4f;
  color: #ff4d4f;
  font-size: 26rpx;
  padding: 0 14rpx; /* 左右内边距，变成矩形 */
  min-width: 44rpx; /* 保证足够点击区域 */
}
.modal-body { padding-top:8rpx }
.section-title { font-size:28rpx; font-weight:600; margin-top:12rpx; margin-bottom:8rpx }

/* 费用汇总样式 */
.fee-summary { background: #fff; border-radius: 12rpx; padding: 12rpx; margin-bottom: 12rpx; border: 1rpx solid #f0f0f0 }
.summary-row { display:flex; justify-content:space-between; padding: 8rpx 0; border-bottom: 1rpx dashed #f5f5f5 }
.summary-row:last-child { border-bottom: none }
.summary-label { color:#888; font-size:26rpx }
.summary-value { color:#333; font-size:26rpx }
.afford-yes { color: #52c41a; font-weight: 600 }
.afford-no { color: #ff4d4f; font-weight: 600 }

/* 浮窗底部 */
.modal-footer { display:flex; justify-content:flex-end; gap: 16rpx; padding-top: 12rpx; border-top: 1rpx solid #f0f0f0; margin-top: 12rpx }
.modal-pay-btn { background:#1890ff; color:#fff; padding: 8rpx 18rpx; border-radius:8rpx; border:none }
.modal-pay-btn:disabled { background:#c0dffd; color:#fff }

</style>
