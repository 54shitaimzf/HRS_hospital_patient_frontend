<template>
  <view class="container">
    <view class="card">
      <view class="header">
        <text class="title">加号申请详情</text>
      </view>

      <view v-if="loading" class="empty">正在加载...</view>
      <view v-else-if="error" class="empty">{{ error }}</view>
      <view v-else>
        <view class="row">
          <text class="label">申请ID</text>
          <text class="value">{{ item.id || '-' }}</text>
        </view>
        <view class="row">
          <text class="label">科室</text>
          <text class="value">{{ item.departmentName || item.departmentId || '-' }}</text>
        </view>
        <view class="row">
          <text class="label">医生</text>
          <text class="value">{{ item.doctorName || item.doctorId || '-' }}</text>
        </view>
        <view class="row">
          <text class="label">就诊日期</text>
          <text class="value">{{ item.appointmentDate || item.scheduleDate || '-' }}</text>
        </view>
        <view class="row">
          <text class="label">状态</text>
          <text class="value status">{{ item.status || '-' }}</text>
        </view>
        <view class="row reason-row">
          <text class="label">理由</text>
          <text class="value reason">{{ item.reason || '-' }}</text>
        </view>
        <view class="row">
          <text class="label">创建时间</text>
          <text class="value">{{ item.createTime || '-' }}</text>
        </view>
      </view>

      <button class="back-btn" @click="goBack">返回</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '../../utils/api'

const item = ref({})
const loading = ref(true)
const error = ref('')

onLoad((options) => {
  uni.setNavigationBarTitle({ title: '加号申请详情' })
  const id = options.id || options.query?.id
  if (!id) {
    error.value = '未提供记录ID'
    loading.value = false
    return
  }
  fetchDetail(id)
})

async function fetchDetail(id) {
  loading.value = true
  try {
    const res = await api.get(`/api/extra-apply/${encodeURIComponent(id)}`)
    if (res.statusCode === 200 || res.status === 200) {

      item.value = res.data?.data || res.data || res
    } else {
      error.value = res.data?.message || '加载失败'
    }
  } catch (e) {
    error.value = e?.message || '网络错误'
  } finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.container { padding: 30rpx; background-color: #f7f7f7; min-height: 100vh; }
.card { background-color: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 30rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05); }
.header { margin-bottom: 20rpx; }
.title { font-size: 36rpx; font-weight: bold; color: #333; }
.empty { text-align: center; color: #999; padding: 40rpx 0; font-size: 28rpx; }
.row { display:flex; align-items:flex-start; margin-top: 10rpx; }
.label { color:#888; width:120rpx; font-size:28rpx; }
.value { color:#333; font-size:28rpx; flex:1; }
.reason-row .value { color:#666; line-height:34rpx; }
.status { color:#1a73e8; font-weight:600 }
.reason { color:#666 }
.back-btn { margin-top: 24rpx; background:#eee; color:#333; padding: 16rpx 0; border-radius: 8rpx; width:100% }
</style>


