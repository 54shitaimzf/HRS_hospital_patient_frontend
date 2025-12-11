<template>
  <view class="container">
    <view class="card">
      <view class="header">
        <text class="title">我的加号申请</text>
      </view>
      <view v-if="loading" class="empty">正在加载...</view>
      <view v-else>
        <view v-if="items.length === 0" class="empty">暂无加号申请记录</view>
        <view v-else>
          <view class="item" v-for="it in items" :key="it.id || it._id" @click="openDetail(it.id || it._id)">
            <view class="row">
              <text class="label">科室</text>
              <text class="value">{{ it.departmentName || it.departmentId || '—' }}</text>
            </view>
            <view class="row">
              <text class="label">医生</text>
              <text class="value">{{ it.doctorName || it.doctorId || '—' }}</text>
            </view>
            <view class="row">
              <text class="label">日期</text>
              <text class="value">{{ it.appointmentDate || it.scheduleDate || '—' }}</text>
            </view>
            <view class="row">
              <text class="label">状态</text>
              <text class="value status">{{ it.status || it.state || '未处理' }}</text>
            </view>
            <view class="row reason-row">
              <text class="label">理由</text>
              <text class="value reason">{{ it.reason || '-' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user.js'
import { fetchExtraApplyList } from '../../utils/api.js'

const items = ref([])
const loading = ref(true)
const error = ref('')
const userStore = useUserStore()

onLoad(() => {
  uni.setNavigationBarTitle({ title: '我的加号申请' })
  fetchList()
})

async function fetchList() {
  loading.value = true
  error.value = ''
  items.value = []
  try {
    const pid = await userStore.ensurePatientId()
    if (!pid) {
      uni.showModal({ title: '请先登录', content: '查看加号记录需要登录，是否前往登录？', success: (res) => { if (res.confirm) uni.navigateTo({ url: '/pages/login/Login' }) } })
      loading.value = false
      return
    }
    const { list } = await fetchExtraApplyList({ patientId: pid })
    items.value = Array.isArray(list) ? list : []
  } catch (e) {
    error.value = e?.message || '加载失败'
    uni.showToast({ title: error.value, icon: 'none' })
  } finally {
    loading.value = false
  }
}


function openDetail(id) {
  if (!id) return
  uni.navigateTo({ url: `/pages/his/ExtraApplyDetail?id=${encodeURIComponent(id)}` })
}
</script>

<style scoped>
.container { padding: 30rpx; background-color: #f7f7f7; min-height: 100vh; }
.card { background-color: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 30rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05); }
.header { margin-bottom: 20rpx; }
.title { font-size: 36rpx; font-weight: bold; color: #333; }
.empty { text-align: center; color: #999; padding: 40rpx 0; font-size: 28rpx; }
.item { border-bottom: 1rpx solid #f0f0f0; padding: 18rpx 0; }
.item { cursor: pointer; }
.row { display:flex; align-items:flex-start; margin-top: 10rpx; }
.label { color:#888; width:120rpx; font-size:28rpx; }
.value { color:#333; font-size:28rpx; flex:1; }
.reason-row .value { color:#666; line-height:34rpx; }
.status { color:#1a73e8; font-weight:600 }
.reason { color:#666 }
</style>
