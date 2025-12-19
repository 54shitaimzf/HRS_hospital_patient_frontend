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
				</view>
				<input
					v-if="isEditing"
					v-model="email"
					class="input-field"
					placeholder="请输入邮箱"
					type="email"
				/>
				<view v-else class="info-value">{{ email || '未设置' }}</view>
			</view>


			<view v-if="isEditing" class="button-group">
				<button class="btn-cancel" @click="cancelEdit">取消</button>
				<button class="btn-save" @click="saveProfile">保存</button>
			</view>
		</view>
	</view>
</template>

<script setup>
	import { ref, onMounted } from 'vue'
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

	// 保存原始数据用于取消编辑
	const originalData = ref({})

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
</script>

<style scoped>
	.container {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 40rpx 30rpx;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30rpx;
	}

	.title {
		font-size: 40rpx;
		font-weight: bold;
		color: #fff;
	}

	.edit-btn {
		display: flex;
		align-items: center;
		padding: 12rpx 24rpx;
		background: #fff;
		border-radius: 50rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
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
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
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
		padding: 24rpx 20rpx;
		font-size: 32rpx;
		color: #333;
		border: 2rpx solid #e0e0e0;
		border-radius: 12rpx;
		box-sizing: border-box;
		background: #fafafa;
		transition: all 0.3s;
	}

	.input-field:focus {
		border-color: #5b86e5;
		background: #fff;
	}

	.button-group {
		display: flex;
		gap: 20rpx;
		margin-top: 48rpx;
	}

	.btn-cancel {
		flex: 1;
		padding: 28rpx 0;
		background: #f5f5f5;
		color: #666;
		font-size: 32rpx;
		font-weight: 600;
		border-radius: 16rpx;
		border: none;
	}

	.btn-save {
		flex: 1;
		padding: 28rpx 0;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: #fff;
		font-weight: 600;
		font-size: 32rpx;
		border-radius: 16rpx;
		box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.4);
		border: none;
	}

	.btn-save:active {
		transform: scale(0.98);
	}

	.btn-cancel:active {
		background: #e8e8e8;
	}
</style>
