<template>
	<view class="forget-container">
		<view class="header">
			<image src="/static/logo.png" class="logo" />
			<text class="title">找回密码</text>
			<text class="tip">请输入注册邮箱，我们将发送验证码</text>
		</view>

		<view class="form-container">
			<view class="input-group">
				<uni-icons type="mail" size="24" color="#409EFF" />
				<input v-model="email" type="text" placeholder="请输入邮箱" class="input" />
			</view>

			<view class="input-group code-group">
				<uni-icons type="chatbox-ellipses" size="24" color="#409EFF" />
				<input v-model="code" type="number" placeholder="请输入验证码" class="input code-input" />
				<button :disabled="countdown > 0 || !email" class="send-code-btn" @click="sendCode">
					{{ countdown > 0 ? countdown + 's 后重发' : '获取验证码' }}
				</button>
			</view>

			<view class="input-group">
				<uni-icons type="locked" size="24" color="#409EFF" />
				<input v-model="newPassword" type="password" placeholder="请输入新密码" class="input" />
			</view>

			<button class="reset-btn" :class="{ active: email && code && newPassword }" @click="handleReset"
				hover-class="button-hover">
				重置密码
			</button>

			<!-- moved: 返回登录 放到表单底部 -->
			<text class="back-link bottom" @click="goLogin">返回登录</text>
		</view>
	</view>
</template>

<script setup>
	import { ref } from 'vue'
	import { onLoad } from '@dcloudio/uni-app'

	// 将手机号验证改为邮箱验证
	const email = ref('')
	const code = ref('')
	const newPassword = ref('')
	const countdown = ref(0)
	let timer = null

	onLoad(() => {

	})

	const isValidEmail = (str) => {
		return /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(str)
	}

	const sendCode = () => {
		if (!email.value) {
			uni.showToast({ title: '请输入邮箱', icon: 'none' })
			return
		}
		if (!isValidEmail(email.value)) {
			uni.showToast({ title: '请输入正确的邮箱格式', icon: 'none' })
			return
		}

		// 这里应该调用后端接口发送邮箱验证码；当前为本地模拟
		uni.showToast({ title: '验证码已发送（模拟）', icon: 'success' })
		countdown.value = 60
		if (timer) clearInterval(timer)
		timer = setInterval(() => {
			countdown.value--
			if (countdown.value <= 0) {
				clearInterval(timer)
				timer = null
			}
		}, 1000)
	}

	const handleReset = () => {
		if (!email.value || !code.value || !newPassword.value) {
			uni.showToast({ title: '请填写完整信息', icon: 'none' })
			return
		}
		if (!isValidEmail(email.value)) {
			uni.showToast({ title: '请输入正确的邮箱格式', icon: 'none' })
			return
		}

		uni.showLoading({ title: '提交中...' })
		setTimeout(() => {
			uni.hideLoading()
			uni.showToast({ title: '密码重置成功', icon: 'success' })

			uni.navigateBack()
		}, 1500)
	}

	const goLogin = () => {
		// 导航回登录页面（根据项目路由，使用 navigateTo 或 redirectTo 可微调）
		uni.navigateTo({ url: '/pages/login/Login' })
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

	/* 新增：返回登录链接样式，轻量不影响布局 */
	.back-link {
		margin-top: 10rpx;
		font-size: 26rpx;
		color: #409EFF;
	}

	/* 新增：底部返回登录的居中样式，靠近页面底部 */
	.back-link.bottom {
		display: block;
		text-align: center;
		margin-top: 30rpx;
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
