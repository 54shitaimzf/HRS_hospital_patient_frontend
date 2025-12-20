<template>
	<view class="container">
		<view class="header">
			<text class="title">个人资料</text>
			<view v-if="!isEditing" class="edit-btn" @click="enableEdit">
				<uni-icons type="compose" size="20" color="#5b86e5" />
				<text class="edit-text">编辑</text>
			</view>
		</view>

		<view v-if="loading" class="loading-container">
			<uni-icons type="spinner-cycle" size="40" color="#5b86e5" />
			<text class="loading-text">加载中...</text>
		</view>

		<view v-else class="profile-card">
			<view class="form-item">
				<view class="label-row">
					<uni-icons type="person" size="18" color="#666" />
					<text class="label">用户账号</text>
				</view>
				<view class="info-value">{{ userAccount || '未设置' }}</view>
			</view>

			<view class="form-item">
				<view class="label-row">
					<uni-icons type="contact" size="18" color="#666" />
					<text class="label">真实姓名</text>
				</view>
				<input
					v-if="isEditing"
					v-model="name"
					class="input-field"
					placeholder="请输入姓名"
				/>
				<view v-else class="info-value">{{ name || '未设置' }}</view>
			</view>

			<view class="form-item">
				<view class="label-row">
					<uni-icons type="phone" size="18" color="#666" />
					<text class="label">手机号</text>
				</view>
				<input
					v-if="isEditing"
					v-model="phone"
					class="input-field"
					placeholder="请输入手机号"
					type="number"
				/>
				<view v-else class="info-value">{{ phone || '未设置' }}</view>
			</view>

		<view class="form-item">
			<view class="label-row">
				<uni-icons type="email" size="18" color="#666" />
				<text class="label">邮箱</text>
				<view v-if="!isEditing && email" class="verify-badge" :class="{ verified: isEmailVerified }">
					<uni-icons :type="isEmailVerified ? 'checkmarkempty' : 'info'" size="14" :color="isEmailVerified ? '#4cd964' : '#f0ad4e'" />
					<text class="badge-text">{{ isEmailVerified ? '已验证' : '未验证' }}</text>
				</view>
			</view>
			<view v-if="isEditing" class="input-with-button">
				<input
					v-model="email"
					class="input-field-inline"
					placeholder="请输入邮箱"
					type="email"
				/>
				<button class="verify-btn" :disabled="countDown>0" @click="verifyEmail">{{ countDown>0 ? (countDown + 's') : '验证' }}</button>
			</view>
			<view v-else class="info-value">{{ email || '未设置' }}</view>

			<!-- Compact code row shown after clicking 验证; keeps layout minimal -->
			<view v-if="isEditing && showCodeInput" class="code-row">
				<input v-model="verificationCode" class="input-code" placeholder="请输入验证码" />
				<button class="code-btn" @click="submitVerification">确认</button>
				<text class="resend-text" v-if="countDown===0" @click="verifyEmail">重发</text>
				<text class="resend-text" v-else>{{ countDown }}s后可重发</text>
			</view>

			</view>


		<view v-if="isEditing" class="button-group">
					<!-- 保存在上，使用醒目的绿色样式；取消在下，使用低调灰色 -->
					<button class="btn-save" @click="saveProfile">保存</button>
					<button class="btn-cancel" @click="cancelEdit">取消</button>
				</view>
		</view>
	</view>
</template>

<script setup>
	import { ref, onMounted, onUnmounted } from 'vue'
	import { useUserStore } from '../../store/user.js'
	import { api } from '../../utils/api.js'

	const userStore = useUserStore()

	const loading = ref(true)
	const isEditing = ref(false)
	const userAccount = ref('')
	const patientId = ref('')
	const name = ref('')
	const phone = ref('')
	const email = ref('')
	const isEmailVerified = ref(false) // 邮箱验证状态

	// 保存原始数据用于取消编辑
	const originalData = ref({})

	// 新增：验证码相关
	const showCodeInput = ref(false)
	const verificationCode = ref('')
	const countDown = ref(0)
	let countDownInterval = null

	const loadUserProfile = async () => {
		loading.value = true
		try {
			// 确保用户信息已加载
			await userStore.hydrate()
			await userStore.ensurePatientId()

			// 从 userStore 获取基本信息
			userAccount.value = userStore.userInfo?.account || ''
			patientId.value = userStore.userInfo?.patientId || userStore.patientId || ''

			// 尝试从后端获取完整患者信息
			if (patientId.value) {
				try {
					const res = await api.get(`/api/patients/${patientId.value}`)
					if (res.statusCode === 200 && res.data) {
						const patientData = res.data.data || res.data
						name.value = patientData.name || patientData.patientName || ''
						phone.value = patientData.phone || patientData.mobile || patientData.phoneNumber || ''
						email.value = patientData.email || ''
					}
				} catch (err) {
					console.log('从后端获取患者信息失败，使用本地数据:', err)
					// 使用本地存储的数据作为后备
					name.value = userStore.userInfo?.name || userStore.userInfo?.patientName || ''
					phone.value = userStore.userInfo?.phone || userStore.userInfo?.mobile || ''
					email.value = userStore.userInfo?.email || ''
				}
			} else {
				// 如果没有 patientId，使用本地数据
				name.value = userStore.userInfo?.name || userStore.userInfo?.patientName || ''
				phone.value = userStore.userInfo?.phone || userStore.userInfo?.mobile || ''
				email.value = userStore.userInfo?.email || ''
			}

			// 保存原始数据
			saveOriginalData()
		} catch (error) {
			console.error('加载用户资料失败:', error)
			uni.showToast({ title: '加载失败', icon: 'none' })
		} finally {
			loading.value = false
		}
	}

	const saveOriginalData = () => {
		originalData.value = {
			name: name.value,
			phone: phone.value,
			email: email.value
		}
	}

	const enableEdit = () => {
		isEditing.value = true
		saveOriginalData()
	}

	const cancelEdit = () => {
		// 恢复原始数据
		name.value = originalData.value.name
		phone.value = originalData.value.phone
		email.value = originalData.value.email
		isEditing.value = false
		// 清除验证码相关
		showCodeInput.value = false
		verificationCode.value = ''
		countDown.value = 0
		if (countDownInterval) {
			clearInterval(countDownInterval)
			countDownInterval = null
		}
	}

	const verifyEmail = () => {
		// 校验邮箱格式
		if (!email.value) {
			return uni.showToast({ title: '请先输入邮箱', icon: 'none' })
		}
		if (!/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(email.value)) {
			return uni.showToast({ title: '请输入正确的邮箱格式', icon: 'none' })
		}

		// 模拟发送验证码：显示输入框并启动倒计时，保持界面紧凑
		showCodeInput.value = true
		verificationCode.value = ''
		countDown.value = 60
		if (countDownInterval) clearInterval(countDownInterval)
		countDownInterval = setInterval(() => {
			if (countDown.value > 0) {
				countDown.value -= 1
			} else {
				clearInterval(countDownInterval)
				countDownInterval = null
			}
		}, 1000)

		uni.showToast({ title: '验证码已发送（模拟）', icon: 'none' })
	}

	const submitVerification = async () => {
		if (!verificationCode.value.trim()) {
			return uni.showToast({ title: '请输入验证码', icon: 'none' })
		}

		// 这里应调用后端接口校验验证码；当前模拟成功
		try {
			uni.showLoading({ title: '验证中...' })
			// 模拟网络延迟
			await new Promise((r) => setTimeout(r, 700))
			uni.hideLoading()
			isEmailVerified.value = true
			showCodeInput.value = false
			verificationCode.value = ''
			countDown.value = 0
			if (countDownInterval) {
				clearInterval(countDownInterval)
				countDownInterval = null
			}
			uni.showToast({ title: '验证成功', icon: 'success' })
		} catch (err) {
			uni.hideLoading()
			console.error('验证失败', err)
			uni.showToast({ title: '验证失败', icon: 'none' })
		}
	}

	const saveProfile = async () => {
		// 验证数据
		if (!name.value.trim()) {
			return uni.showToast({ title: '请输入姓名', icon: 'none' })
		}
		if (phone.value && !/^1[3-9]\d{9}$/.test(phone.value)) {
			return uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
		}
		if (email.value && !/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(email.value)) {
			return uni.showToast({ title: '请输入正确的邮箱', icon: 'none' })
		}

		try {
			uni.showLoading({ title: '保存中...' })

			// 尝试更新到后端
			if (patientId.value) {
				try {
					const updateData = {
						name: name.value,
						phone: phone.value,
						email: email.value
					}
					await api.put(`/api/patients/${patientId.value}`, updateData)
				} catch (err) {
					console.log('后端更新失败，仅更新本地:', err)
				}
			}

			// 更新本地 userStore
			userStore.setUser({
				...userStore.userInfo,
				name: name.value,
				phone: phone.value,
				email: email.value
			})

			uni.hideLoading()
			uni.showToast({ title: '保存成功', icon: 'success' })

			isEditing.value = false
			saveOriginalData()
		} catch (error) {
			uni.hideLoading()
			console.error('保存失败:', error)
			uni.showToast({ title: '保存失败', icon: 'none' })
		}
	}

	onMounted(() => {
		loadUserProfile()
	})

	onUnmounted(() => {
		if (countDownInterval) {
			clearInterval(countDownInterval)
			countDownInterval = null
		}
	})
</script>

<style scoped>
	.container {
		min-height: 100vh;
		background: linear-gradient(135deg, #e3f2fd, #bbdefb);
		padding: 40rpx 30rpx;
		box-sizing: border-box;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30rpx;
	}

	.title {
		font-size: 40rpx;
		font-weight: 700;
		color: #2c3e50;
		text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.1);
		letter-spacing: 1rpx;
	}

	.edit-btn {
		display: flex;
		align-items: center;
		padding: 12rpx 24rpx;
		background: #fff;
		border-radius: 50rpx;
		box-shadow: 0 4rpx 12rpx rgba(91, 134, 229, 0.3);
		transition: all 0.25s ease;
	}

	.edit-btn:active {
		transform: scale(0.95);
		box-shadow: 0 2rpx 8rpx rgba(91, 134, 229, 0.2);
	}

	.edit-text {
		margin-left: 8rpx;
		font-size: 28rpx;
		color: #5b86e5;
		font-weight: 600;
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 120rpx 0;
		background: #fff;
		border-radius: 24rpx;
	}

	.loading-text {
		margin-top: 20rpx;
		font-size: 28rpx;
		color: #999;
	}

	.profile-card {
		background: #fff;
		border-radius: 24rpx;
		padding: 40rpx 32rpx;
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.07);
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.form-item {
		margin-bottom: 36rpx;
		padding-bottom: 32rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.form-item:last-of-type {
		border-bottom: none;
		margin-bottom: 0;
		padding-bottom: 0;
	}

	.label-row {
		display: flex;
		align-items: center;
		margin-bottom: 16rpx;
	}

	.label {
		margin-left: 12rpx;
		font-size: 28rpx;
		color: #666;
		font-weight: 600;
	}

	.info-value {
		font-size: 32rpx;
		color: #333;
		padding: 20rpx 0;
		min-height: 48rpx;
		line-height: 48rpx;
	}

	.input-field {
		width: 100%;
		padding: 20rpx 24rpx;
		font-size: 30rpx;
		color: #333;
		border: 2rpx solid #e0e0e0;
		border-radius: 12rpx;
		box-sizing: border-box;
		background: #fafafa;
		transition: all 0.3s;
		line-height: 1.6;
		min-height: 88rpx;
	}

	.input-field:focus {
		border-color: #5b86e5;
		background: #fff;
	}

	.input-with-button {
		display: flex;
		align-items: center;
		gap: 12rpx;
	}

	.input-field-inline {
		flex: 1;
		padding: 20rpx 24rpx;
		font-size: 30rpx;
		color: #333;
		border: 2rpx solid #e0e0e0;
		border-radius: 12rpx;
		box-sizing: border-box;
		background: #fafafa;
		transition: all 0.3s;
		line-height: 1.6;
		min-height: 88rpx;
	}

	.input-field-inline:focus {
		border-color: #5b86e5;
		background: #fff;
	}

	.verify-btn {
		padding: 20rpx 28rpx;
		font-size: 26rpx;
		color: #fff;
		background: linear-gradient(to right, #36d1dc, #5b86e5);
		border: none;
		border-radius: 12rpx;
		white-space: nowrap;
		box-shadow: 0 4rpx 12rpx rgba(91, 134, 229, 0.3);
		transition: all 0.25s ease;
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.verify-btn:active {
		opacity: 0.8;
		transform: scale(0.95);
	}

	/* 新增：验证码行，保持页面紧凑 */
	.code-row {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-top: 12rpx;
	}

	.input-code {
		flex: 1;
		padding: 14rpx 18rpx;
		font-size: 28rpx;
		color: #333;
		border: 2rpx solid #e0e0e0;
		border-radius: 10rpx;
		box-sizing: border-box;
		background: #fafafa;
		min-height: 64rpx;
	}

	.input-code:focus {
		border-color: #5b86e5;
		background: #fff;
	}

	.code-btn {
		padding: 14rpx 20rpx;
		font-size: 26rpx;
		color: #fff;
		background: linear-gradient(to right, #36d1dc, #5b86e5);
		border: none;
		border-radius: 10rpx;
		height: 64rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.resend-text {
		font-size: 24rpx;
		color: #5b86e5;
		margin-left: 6rpx;
	}

	/* 按钮组：横向排列，左右填充整行，各占一半；保持按钮高度不变 */
	.button-group {
		display: flex;
		flex-direction: row;
		gap: 20rpx;
		margin-top: 8rpx;
	}

	/* 两个按钮各自占据一半宽度，保持原有高度与视觉样式 */
	.button-group > button {
		flex: 1 1 0;
		min-width: 0; /* 防止内容撑开 */
	}

	.btn-save {
		padding: 22rpx 0;
		font-size: 30rpx;
		color: #fff;
		background: linear-gradient(90deg, #26c281, #4cd964);
		border: none;
		border-radius: 14rpx;
		box-shadow: 0 6rpx 18rpx rgba(76, 217, 100, 0.2);
		height: 96rpx; /* 保持原有高度 */
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	.btn-save:active {
		transform: translateY(2rpx) scale(0.995);
		opacity: 0.95;
	}

	.btn-cancel {
		padding: 20rpx 0;
		font-size: 28rpx;
		color: #666;
		background: #f7f7f8;
		border: 1rpx solid #e6e6e6;
		border-radius: 12rpx;
		height: 88rpx; /* 保持原有高度 */
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
	}

	.btn-cancel:active {
		transform: translateY(2rpx);
		opacity: 0.9;
	}
</style>
