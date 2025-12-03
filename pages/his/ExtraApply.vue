<template>
	<view class="container">
		<view class="card">
			<view class="header">
				<text class="title">加号申请</text>
			</view>

			<view class="info-line">
				<text class="label">科室:</text>
				<text class="value">{{ departmentName || departmentId || '（由排班自动填充）' }}</text>
			</view>

			<view class="info-line">
				<text class="label">医生:</text>
				<text class="value">{{ doctorName || doctorId || '（由排班自动填充）' }}</text>
			</view>

			<view class="info-line">
				<text class="label">日期:</text>
				<text class="value">{{ appointmentDate }}</text>
			</view>

			<view class="note">注：科室与医生由排班页面自动填充，不可在此修改。</view>

			<view class="info-line reason-line">
				<text class="label">原因:</text>
			</view>
			<textarea class="reason-input" placeholder="请输入加号原因（必填）" v-model="reason" :maxlength="300"></textarea>
			<view class="hint">提示：加号仅限当日申请，填写真实合理的申请理由可提高通过率。</view>
		</view>

		<button class="submit-btn" :disabled="submitting" @click="submitApply">{{ submitting ? '提交中...' : '提交申请' }}</button>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user'
import { api } from '../../utils/api'

const departmentId = ref('')
const departmentName = ref('')
const doctorId = ref('')
const doctorName = ref('')
const appointmentDate = ref(new Date().toISOString().split('T')[0]) // 默认当天
const reason = ref('')
const submitting = ref(false)

const userStore = useUserStore()

onLoad((options) => {

	departmentId.value = options.deptId || options.departId || options.departmentId || ''
	departmentName.value = options.deptName ? decodeURIComponent(options.deptName) : (options.departmentName ? decodeURIComponent(options.departmentName) : '')
	doctorId.value = options.doctorId || options.doctor || ''
	doctorName.value = options.doctorName ? decodeURIComponent(options.doctorName) : (options.name ? decodeURIComponent(options.name) : '')
	appointmentDate.value = options.scheduleDate || appointmentDate.value
	uni.setNavigationBarTitle({ title: '加号申请' })
})

onShow(() => {

	try {
		const pages = (typeof getCurrentPages === 'function') ? getCurrentPages() : []
		if (pages && pages.length >= 2) {
			const prev = pages[pages.length - 2]
			if (prev && prev.options) {
				const o = prev.options
				departmentId.value = departmentId.value || (o.deptId || o.departId || o.departmentId || '')
				departmentName.value = departmentName.value || decodeURIComponent(o.deptName || o.departmentName || o.name || '')
				doctorId.value = doctorId.value || (o.doctorId || o.id || '')
				doctorName.value = doctorName.value || decodeURIComponent(o.doctorName || o.doctor || o.doctorName || '')
				appointmentDate.value = appointmentDate.value || (o.scheduleDate || '')
			}
		}
	} catch (e) {

	}
})

function isValidId(val) {
	return typeof val === 'string' && val.trim().length > 0
}

async function submitApply() {
	if (!isValidId(departmentId.value)) {
		uni.showToast({ title: '科室信息缺失，无法提交', icon: 'none' })
		return
	}
	if (!isValidId(doctorId.value)) {
		uni.showToast({ title: '医生信息缺失，无法提交', icon: 'none' })
		return
	}
	if (!reason.value || reason.value.trim().length < 5) {
		uni.showToast({ title: '请填写至少5个字的申请理由', icon: 'none' })
		return
	}
	const today = new Date().toISOString().split('T')[0]
	if (appointmentDate.value !== today) {
		uni.showToast({ title: '只能选择当天日期', icon: 'none' })
		return
	}

	submitting.value = true
	try {
		const patientId = await userStore.ensurePatientId()
		if (!patientId) {
			uni.showModal({ title: '请先登录', content: '提交加号申请需要先登录，是否前往登录？', success: (res) => { if (res.confirm) uni.navigateTo({ url: '/pages/login/Login' }) } })
			submitting.value = false
			return
		}

		const payload = {
			patientId,
			departmentId: departmentId.value,
			doctorId: doctorId.value,
			appointmentDate: appointmentDate.value,
			reason: reason.value.trim()
		}

		uni.showModal({
			title: '确认提交',
			content: `科室: ${departmentName.value || departmentId.value}\n医生: ${doctorName.value || doctorId.value}\n日期: ${appointmentDate.value}\n\n是否确认提交加号申请？`,
			success: async (res) => {
				if (!res.confirm) { submitting.value = false; return }
				try {
					const r = await api.post('/api/extra-apply', payload)
					if (r.statusCode === 201 || r.statusCode === 200) {
						uni.showToast({ title: '提交成功', icon: 'success' })
						setTimeout(() => uni.navigateBack(), 800)
					} else {
						const msg = r.data?.message || r.data?.msg || `提交失败(${r.statusCode})`
						uni.showToast({ title: msg, icon: 'none' })
					}
				} catch (err) {
					uni.showToast({ title: err?.message || '网络错误，提交失败', icon: 'none' })
				} finally {
					submitting.value = false
				}
			}
		})
	} catch (e) {
		uni.showToast({ title: '网络错误', icon: 'none' })
		submitting.value = false
	}
}
</script>

<style scoped>
.container { padding: 30rpx; background-color: #f7f7f7; min-height: 100vh; }
.card { background-color: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 30rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05); }
.header { margin-bottom: 20rpx; }
.title { font-size: 36rpx; font-weight: bold; color: #333; }
.info-line { display: flex; align-items: center; margin-top: 16rpx; }
.label { color: #888; width: 120rpx; }
.value { color: #333; flex: 1; }
.note { margin-top: 10rpx; color: #d32f2f; font-size: 24rpx; }
.reason-line { align-items: flex-start; }
.reason-input { width: 100%; height: 220rpx; margin-top: 12rpx; padding: 18rpx; box-sizing: border-box; border: 1rpx solid #e6e6e6; border-radius: 8rpx; background: #fff; font-size: 28rpx; color: #333; }
.hint { margin-top: 10rpx; color: #999; font-size: 24rpx; }
.submit-btn { background-color: #1890ff; color: #fff; font-size: 32rpx; border-radius: 50rpx; padding: 20rpx 0; width: 100%; box-sizing: border-box; }
.submit-btn[disabled] { background-color: #ccc; }
</style>

