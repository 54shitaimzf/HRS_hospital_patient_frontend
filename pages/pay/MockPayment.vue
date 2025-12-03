<template>
  <view class="container">
    <view class="card">
      <view class="header">
        <text class="title">模拟支付</text>
      </view>

      <view class="order">
        <view class="row">
          <text class="label">订单号</text>
          <text class="value">{{ orderId || '-' }}</text>
        </view>
        <view class="row">
          <text class="label">项目</text>
          <text class="value">{{ title || '挂号费用' }}</text>
        </view>
        <view class="row amount">
          <text class="label">金额</text>
          <text class="value">¥{{ amount }}</text>
        </view>
      </view>

      <view class="methods">
        <text class="methods-title">支付方式</text>
        <view class="method" v-for="m in methods" :key="m.id" @click="selectMethod(m.id)">
          <radio :checked="m.id === selected" color="#4e9deb"></radio>
          <text class="method-name">{{ m.name }}</text>
        </view>
      </view>

      <button class="pay-btn" @click="pay" :disabled="processing">{{ processing ? '支付中...' : '立即支付' }}</button>

      <view class="hint">（这是一个独立的模拟支付页面，用于演示流程，支付不会实际发生）</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const orderId = ref('')
const amount = ref('0.00')
const title = ref('')
const processing = ref(false)

const methods = ref([
  { id: 'alipay', name: '支付宝' },
  { id: 'wechat', name: '微信支付' },
  { id: 'union', name: '银联' }
])
const selected = ref('wechat')

onLoad((options) => {

  orderId.value = options.orderId || options.query?.orderId || ('MOCK' + Date.now())
  amount.value = options.amount || options.query?.amount || '0.00'
  title.value = options.title || options.query?.title || '挂号费用'
  uni.setNavigationBarTitle({ title: '模拟支付' })
})

function selectMethod(id) {
  selected.value = id
}

function pay() {
  if (processing.value) return
  processing.value = true

  uni.showLoading({ title: '提交支付...' })
  setTimeout(() => {
    uni.hideLoading()
    processing.value = false
    uni.showToast({ title: '支付成功', icon: 'success', duration: 1200 })

    setTimeout(() => {
      uni.navigateBack()
    }, 1200)
  }, 1500)
}
</script>

<style scoped>
.container { padding: 30rpx; background-color: #f7f7f7; min-height: 100vh; }
.card { background-color: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 30rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05); }
.header { margin-bottom: 20rpx; }
.title { font-size: 36rpx; font-weight: bold; color: #333; }
.order .row { display:flex; align-items:center; justify-content:space-between; margin-top: 10rpx; }
.label { color:#888; font-size:28rpx; }
.value { color:#333; font-size:28rpx; }
.amount .value { color:#e94f4f; font-weight:700; }
.methods { margin-top: 24rpx; }
.methods-title { color:#666; margin-bottom: 10rpx; display:block }
.method { display:flex; align-items:center; gap: 12rpx; padding: 14rpx 10rpx; border-radius: 10rpx; border: 1rpx solid #f0f0f0; margin-bottom: 10rpx }
.method-name { font-size:28rpx; color:#333 }
.pay-btn { margin-top: 20rpx; background: #4e9deb; color: #fff; padding: 18rpx 0; border-radius: 12rpx; width:100%; font-size:30rpx }
.hint { margin-top: 12rpx; color:#999; font-size:24rpx; text-align:center }
</style>


