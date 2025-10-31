<template>
	<view class="forget-container">
		<view class="header">
			<image src="/static/logo.png" class="logo" />
			<text class="title">找回密码</text>
			<text class="tip">请输入注册手机号，我们将发送验证码</text>
		</view>

		<view class="form-container">
			<view class="input-group">
				<uni-icons type="phone" size="24" color="#409EFF" />
				<input v-model="phone" type="number" placeholder="请输入手机号" class="input" />
			</view>

			<view class="input-group code-group">
				<uni-icons type="chatbox-ellipses" size="24" color="#409EFF" />
				<input v-model="code" type="number" placeholder="请输入验证码" class="input code-input" />
				<button :disabled="countdown > 0 || !phone" class="send-code-btn" @click="sendCode">
					{{ countdown > 0 ? countdown + 's 后重发' : '获取验证码' }}
				</button>
			</view>

			<view class="input-group">
				<uni-icons type="locked" size="24" color="#409EFF" />
				<input v-model="newPassword" type="password" placeholder="请输入新密码" class="input" />
			</view>

			<button class="reset-btn" :class="{ active: phone && code && newPassword }" @click="handleReset"
				hover-class="button-hover">
				重置密码
			</button>
		</view>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue'
	import {
		onLoad
	} from '@dcloudio/uni-app'

	const phone = ref('')
	const code = ref('')
	const newPassword = ref('')
	const countdown = ref(0)
	let timer = null

	onLoad(() => {
		// 页面加载逻辑
	})

	const sendCode = () => {
		if (!phone.value) {
			uni.showToast({
				title: '请输入手机号',
				icon: 'none'
			})
			return
		}
		// 这里调用验证码发送接口
		uni.showToast({
			title: '验证码已发送',
			icon: 'success'
		})
		countdown.value = 60
		timer = setInterval(() => {
			countdown.value--
			if (countdown.value <= 0) {
				clearInterval(timer)
			}
		}, 1000)
	}

	const handleReset = () => {
		if (!phone.value || !code.value || !newPassword.value) {
			uni.showToast({
				title: '请填写完整信息',
				icon: 'none'
			})
			return
		}
		// 调用重置密码接口
		uni.showLoading({
			title: '提交中...'
		})
		setTimeout(() => {
			uni.hideLoading()
			uni.showToast({
				title: '密码重置成功',
				icon: 'success'
			})
			// 可跳转登录页
			uni.navigateBack()
		}, 1500)
	}
</script>

<style scoped>
	.forget-container {
		padding: 40rpx;
		background: linear-gradient(to bottom, #e6f7ff, #ffffff);
		height: 100vh;
		box-sizing: border-box;
	}

	.header {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 100rpx 0 60rpx;
	}

	.logo {
		width: 160rpx;
		height: 160rpx;
		border-radius: 50%;
		border: 3rpx solid #d6ecff;
		box-shadow: 0 6rpx 18rpx rgba(24, 144, 255, 0.3);
	}

	.title {
		font-size: 38rpx;
		font-weight: bold;
		color: #1890ff;
		margin-top: 24rpx;
		letter-spacing: 3rpx;
	}

	.tip {
		font-size: 26rpx;
		color: #999;
		margin-top: 12rpx;
	}

	.form-container {
		background: #ffffff;
		border-radius: 24rpx;
		padding: 50rpx;
		box-shadow: 0 8rpx 24rpx rgba(24, 144, 255, 0.1);
	}

	.input-group {
		display: flex;
		align-items: center;
		flex-direction: row;
		padding: 28rpx 0;
		border-bottom: 1rpx solid #f0f0f0;
		flex-wrap: nowrap;
	}

	.input {
		flex: 1;
		margin: 0 20rpx;
		font-size: 30rpx;
		color: #333;
		background: transparent;
	}

	.code-group {
		position: relative;
	}

	.code-input {
		flex: 1;
	}

	.send-code-btn {
		background: #409eff;
		color: white;
		border-radius: 40rpx;
		padding: 4rpx 30rpx;
		font-size: 26rpx;
		border: none;
		outline: none;
		cursor: pointer;
		user-select: none;
	}

	.send-code-btn:disabled {
		background: #a0cfff;
		cursor: not-allowed;
	}

	.reset-btn {
		margin-top: 60rpx;
		height: 90rpx;
		line-height: 90rpx;
		border-radius: 50rpx;
		font-size: 34rpx;
		border: none;
		color: white;
		background: #c0dfff;
		transition: all 0.3s ease;
	}

	.reset-btn.active {
		background: linear-gradient(to right, #40a9ff, #1890ff);
		box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.4);
	}

	.button-hover {
		opacity: 0.8;
	}
</style>