<template>
  <view class="page">
    <view class="doctor-card">
      <view class="doctor-name">{{ doctorInfo.doctorName || '未知医生' }}</view>
      <view class="doctor-meta">{{ doctorInfo.departmentName || '未知科室' }}</view>
      <view class="doctor-meta">{{ doctorInfo.scheduleDate }} {{ doctorInfo.timePeriodName }}</view>
    </view>

    <view class="section">
      <view class="section-title">评分</view>
      <view class="stars">
        <view
          v-for="star in stars"
          :key="star"
          class="star"
          :class="{ active: form.rating >= star }"
          @click="setRating(star)"
        >★</view>
      </view>
      <view class="score-hint">{{ ratingHint }}</view>
    </view>

    <view class="section">
      <view class="section-title">评价内容</view>
      <textarea
        class="comment"
        maxlength="300"
        placeholder="可填写就诊感受、建议等 (最多 300 字)"
        v-model="form.comment"
      />
    </view>

    <view class="section anon">
      <text>匿名评价</text>
      <switch :checked="form.anonymous" @change="onAnonChange" color="#4e9deb" />
    </view>

    <button class="submit" :loading="submitting" @click="handleSubmit">提交评价</button>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { submitDoctorReview } from '../../utils/api.js'
import { useUserStore } from '../../store/user.js'

const userStore = useUserStore()
const submitting = ref(false)
const stars = [1, 2, 3, 4, 5]
const form = reactive({
  registrationId: '',
  patientId: '',
  doctorId: '',
  rating: 0,
  comment: '',
  anonymous: false
})
const doctorInfo = reactive({
  doctorName: '',
  departmentName: '',
  scheduleDate: '',
  timePeriodName: ''
})

function updateNavTitle() {
  const baseTitle = doctorInfo.doctorName || doctorInfo.departmentName || '就诊记录'
  const timeInfo = [doctorInfo.scheduleDate, doctorInfo.timePeriodName].filter(Boolean).join(' ')
  const title = timeInfo ? `${baseTitle} ${timeInfo}` : `${baseTitle} 评价`
  uni.setNavigationBarTitle({ title })
}

const ratingHint = computed(() => {
  if (!form.rating) return '请选择 1-5 分'
  const labels = ['很差', '一般', '满意', '推荐', '强烈推荐']
  return labels[form.rating - 1]
})

function setRating(value) {
  form.rating = value
}
function onAnonChange(e) {
  form.anonymous = !!e.detail.value
}

function safeDecode(value) {
  if (typeof value !== 'string') return value || ''
  try {
    return decodeURIComponent(value)
  } catch (err) {
    return value
  }
}

onLoad(async (options) => {
  const decoded = Object.fromEntries(
    Object.entries(options || {}).map(([key, value]) => [key, safeDecode(value)])
  )
  if (decoded.registrationId) form.registrationId = decoded.registrationId
  if (decoded.doctorId) form.doctorId = decoded.doctorId
  if (decoded.patientId) form.patientId = decoded.patientId
  doctorInfo.doctorName = decoded.doctorName || ''
  doctorInfo.departmentName = decoded.departmentName || ''
  doctorInfo.scheduleDate = decoded.scheduleDate || ''
  doctorInfo.timePeriodName = decoded.timePeriodName || ''
  nextTick(() => {
    updateNavTitle()
  })

  if (!form.patientId) {
    const pid = await userStore.ensurePatientId()
    if (pid) {
      form.patientId = pid
    }
  }

  if (!form.registrationId || !form.doctorId) {
    uni.showToast({ title: '参数缺失，请从挂号记录进入', icon: 'none' })
    setTimeout(() => uni.navigateBack({ delta: 1 }), 1500)
  }
})

async function handleSubmit() {
  if (!form.registrationId || !form.patientId || !form.doctorId) {
    uni.showToast({ title: '参数不完整', icon: 'none' })
    return
  }
  if (!form.rating) {
    uni.showToast({ title: '请选择评分', icon: 'none' })
    return
  }
  if (form.comment.length > 300) {
    uni.showToast({ title: '评论太长', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await submitDoctorReview({
      registrationId: form.registrationId,
      patientId: form.patientId,
      doctorId: form.doctorId,
      rating: form.rating,
      comment: form.comment.trim(),
      anonymous: form.anonymous
    })
    setTimeout(() => {
      uni.navigateBack({ delta: 1 })
    }, 800)
  } catch (err) {
    // api 函数已处理 toast
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page { padding: 32rpx; display: flex; flex-direction: column; gap: 28rpx; }
.doctor-card { background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.05); }
.doctor-name { font-size: 34rpx; font-weight: 600; color: #222; }
.doctor-meta { margin-top: 8rpx; font-size: 26rpx; color: #666; }
.section { background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.04); }
.section-title { font-size: 28rpx; color: #333; margin-bottom: 16rpx; }
.stars { display: flex; gap: 16rpx; }
.star { font-size: 54rpx; color: #ddd; }
.star.active { color: #ffb300; }
.score-hint { margin-top: 12rpx; font-size: 24rpx; color: #888; }
.comment { width: 100%; min-height: 200rpx; border: 1px solid #eee; border-radius: 16rpx; padding: 16rpx; font-size: 26rpx; color: #333; background: #fafafa; }
.anon { display: flex; justify-content: space-between; align-items: center; font-size: 28rpx; color: #444; }
.submit { background: #4e9deb; color: #fff; border-radius: 999rpx; margin-top: 16rpx; }
</style>
