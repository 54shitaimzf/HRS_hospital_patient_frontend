<template>
	<view class="container">
		<view class="form-box">
			<view class="header">
				<view class="back-btn" @click="goBack">
					<uni-icons type="left" size="22" color="#666"></uni-icons>
				</view>
				<view class="form-title">用户注册</view>
			</view>

			<view class="input-group">
				<uni-icons type="auth" size="22" color="#999"></uni-icons>
				<input v-model="form.userAccount" placeholder="请输入账号" class="input" />
			</view>
			<view class="input-group">
				<uni-icons type="person" size="22" color="#999"></uni-icons>
				<input v-model="form.userName" placeholder="请输入姓名" class="input" />
			</view>
			<view class="input-group">
				<uni-icons type="contact" size="22" color="#999"></uni-icons>
				<input v-model="form.identificationId" placeholder="请输入身份证号(18位)" class="input" />
			</view>

			<!-- 邮箱 + 发送验证码 -->
			<view class="input-group">
				<uni-icons type="email" size="22" color="#999"></uni-icons>
				<input v-model="form.userEmail" placeholder="请输入邮箱" class="input" />
				<button class="small-btn send-code-btn" :disabled="sendDisabled" @click="sendCode">
					{{ countdown > 0 ? `重新发送(${countdown}s)` : (sending ? '发送中...' : '发送验证码') }}
				</button>
			</view>

			<!-- 验证码输入与校验 -->
			<view class="input-group">
				<uni-icons type="locked" size="22" color="#999"></uni-icons>
				<input v-model="emailCode" placeholder="请输入邮箱验证码" class="input" />
				<button class="small-btn verify-code-btn" :class="{ verified: emailVerified }" @click="verifyCode">
					{{ emailVerified ? '已验证' : '验证' }}
				</button>
			</view>

			<view class="input-group">
				<uni-icons type="phone" size="22" color="#999"></uni-icons>
				<input v-model="form.userPhone" placeholder="请输入手机号" class="input" />
			</view>
			<view class="input-group">
				<uni-icons type="calendar" size="22" color="#999"></uni-icons>
				<picker mode="date" :value="form.birthday" @change="onBirthdayChange" class="input">
					<view>{{ form.birthday || '请选择生日' }}</view>
				</picker>
			</view>
			<view class="input-group gender-group">
				<uni-icons type="staff" size="22" color="#999"></uni-icons>
				<text class="gender-label">性别</text>
				<radio-group @change="genderChange" class="radio-group">
					<label class="radio">
						<radio value="男" :checked="form.userGender==='男'" /><text>男</text>
					</label>
					<label class="radio">
						<radio value="女" :checked="form.userGender==='女'" /><text>女</text>
					</label>
				</radio-group>
			</view>
			<view class="input-group">
				<uni-icons type="locked" size="22" color="#999"></uni-icons>
				<input v-model="form.userPassword" type="password" placeholder="请输入密码" class="input" />
			</view>
			<view class="input-group">
				<uni-icons type="locked" size="22" color="#999"></uni-icons>
				<input v-model="form.confirm" type="password" placeholder="确认密码" class="input" />
			</view>
			<button class="register-btn" @click="register">注 册</button>
			<!-- 新增：返回登录 链接，位于表单底部，居中显示 -->
			<text class="back-link" @click="goLogin">返回登录</text>
		</view>
	</view>
</template>


<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { registerUser, sendEmailVerification, verifyEmailCode } from '../../utils/api.js'

const form = ref({
	userName: '',
	userPassword: '',
	confirm: '',
	userGender: '男',
	userAccount: '',
	identificationId: '',
	userEmail: '',
	userPhone: '',
	birthday: ''
})

const emailCode = ref('')
const countdown = ref(0)
let timerId = null
const sending = ref(false)
const emailVerified = ref(false)

const sendDisabled = () => {
	return sending.value || countdown.value > 0 || !form.value.userEmail
}

const startCountdown = (seconds = 60) => {
	countdown.value = seconds
	clearTimer()
	timerId = setInterval(() => {
		countdown.value -= 1
		if (countdown.value <= 0) {
			clearTimer()
		}
	}, 1000)
}

const clearTimer = () => {
	if (timerId) {
		clearInterval(timerId)
		timerId = null
	}
}

const sendCode = async () => {
	const email = (form.value.userEmail || '').trim()
	if (!email) return uni.showToast({ title: '请输入邮箱', icon: 'none' })
	// 简单邮箱格式校验
	if (!/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(email)) {
		return uni.showToast({ title: '请输入正确的邮箱地址', icon: 'none' })
	}
	sending.value = true
	try {
		const res = await sendEmailVerification({ email, scene: 'REGISTER' })
		const expire = res?.expireSeconds || 60
		startCountdown(expire)
		// 发送后需要重新验证
		emailVerified.value = false
		uni.showToast({ title: '验证码已发送，请注意查收', icon: 'success' })
	} catch (err) {
		console.error('发送验证码失败', err)
	} finally {
		sending.value = false
	}
}

const verifyCode = async () => {
	const email = (form.value.userEmail || '').trim()
	const code = (emailCode.value || '').trim()
	if (!email) return uni.showToast({ title: '请输入邮箱', icon: 'none' })
	if (!code) return uni.showToast({ title: '请输入验证码', icon: 'none' })
	try {
		const res = await verifyEmailCode({ email, code, scene: 'REGISTER' })
		if (res && res.verified) {
			emailVerified.value = true
			uni.showToast({ title: '邮箱验证成功', icon: 'success' })
		}
	} catch (err) {
		console.error('验证失败', err)
		// verifyEmailCode 已经会展示错误提示
	}
}

// 用户修改邮箱时，重置验证状态
watch(() => form.value.userEmail, (newVal, oldVal) => {
	emailVerified.value = false
})

const goBack = () => { uni.navigateBack() }
const genderChange = (e) => { form.value.userGender = e.detail.value }
const onBirthdayChange = (e) => { form.value.birthday = e.detail.value }

// 新增：返回登录导航函数
const goLogin = () => { uni.navigateTo({ url: '/pages/login/Login' }) }

const register = async () => {
	if (form.value.userPassword !== form.value.confirm) {
		return uni.showToast({ title: '两次密码不一致', icon: 'none' })
	}
	if (!form.value.identificationId || form.value.identificationId.length !== 18) {
		return uni.showToast({ title: '身份证号必须为18位', icon: 'none' })
	}
	if (!form.value.userEmail) return uni.showToast({ title: '请输入邮箱并验证', icon: 'none' })
	if (!emailVerified.value) return uni.showToast({ title: '请先完成邮箱验证', icon: 'none' })

	const { confirm, ...registerData } = form.value
	try {
		await registerUser(registerData)
		uni.showToast({ title: '注册成功', icon: 'success' })
		setTimeout(() => uni.redirectTo({ url: '/pages/login/Login' }), 600)
	} catch (error) {
	 	console.error('Register request failed:', error)

		// 调试用：显示详细错误信息
		let content = error?.message || '注册失败';
		if (error?.raw?.data) {
			// 尝试提取后端返回的具体错误信息
			const rd = error.raw.data;
			const backendMsg = rd.msg || rd.message || JSON.stringify(rd);
			content += `\n后端返回: ${backendMsg}`;
		}
		uni.showModal({
			title: '注册失败详情',
			content: content,
			showCancel: false
		});
	}
}

onUnmounted(() => {
	clearTimer()
})
</script>


<style scoped>
	.container {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		background: #f5f6fa;
		padding: 20rpx;
		box-sizing: border-box;
	}

	.form-box {
		width: 100%;
		max-width: 700rpx;
		background-color: #fff;
		padding: 40rpx;
		border-radius: 24rpx;
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		margin-bottom: 50rpx;
	}

	.back-btn {
		position: absolute;
		left: 10rpx;
		top: 50%;
		transform: translateY(-50%);
		padding: 10rpx;
	}

	.form-title {
		font-size: 40rpx;
		font-weight: bold;
		color: #333;
	}

	.input-group {
		display: flex;
		align-items: center;
		background-color: #f5f6fa;
		border-radius: 16rpx;
		padding: 0 30rpx;
		margin-bottom: 32rpx;
		border: 1rpx solid #f5f6fa;
		transition: border-color 0.3s;
	}

	.input-group:focus-within {
		border-color: #409eff;
	}

	.input {
		flex: 1;
		padding: 25rpx 20rpx;
		font-size: 30rpx;
		background-color: transparent;
		border: none;
		outline: none;
	}

	.gender-group {
		background-color: transparent;
		padding: 0;
	}

	.gender-label {
		margin-left: 20rpx;
	}

	.radio-group {
		display: flex;
		margin-left: 40rpx;
	}

	.radio {
		margin-right: 40rpx;
		transform: scale(0.9);
	}

	.register-btn {
		width: 100%;
		padding: 25rpx 0;
		font-size: 32rpx;
		color: #fff;
		background: linear-gradient(to right, #409eff, #6bbaff);
		border: none;
		border-radius: 50rpx;
		box-shadow: 0 8rpx 20rpx rgba(64, 158, 255, 0.3);
		transition: all 0.2s ease-in-out;
		margin-top: 20rpx;
	}

	/* 新增：表单底部的返回登录链接，居中显示，轻量风格 */
	.back-link {
		display: block;
		text-align: center;
		margin-top: 18rpx;
		font-size: 28rpx;
		color: #409EFF;
		cursor: pointer;
	}

	.register-btn:active {
		transform: scale(0.97);
		opacity: 0.9;
	}

	/* 小按钮：发送验证码 / 验证 */
	.small-btn {
		margin-left: 12rpx;
		display: inline-flex; /* center content vertically */
		align-items: center;
		justify-content: center;
		padding: 0 20rpx; /* vertical centering done via height */
		font-size: 28rpx;
		border-radius: 12rpx;
		background: linear-gradient(90deg, #409eff, #6bbaff);
		color: #fff;
		border: none;
		height: 72rpx;
		min-width: 180rpx;
		box-shadow: 0 6rpx 16rpx rgba(64,158,255,0.18);
		line-height: 1; /* avoid baseline shift */
		box-sizing: border-box;
		vertical-align: middle;
	}
	.small-btn:disabled {
		opacity: 0.6;
		background: linear-gradient(90deg, #a0cfff, #cfe8ff);
	}
	.verify-code-btn.verified {
		background: linear-gradient(90deg, #26c281, #4cd964) !important;
	}

	/* 在较小屏幕上让输入框和按钮更好地适配 */
	@media (max-width: 420px) {
		.small-btn { min-width: 140rpx; padding: 0 12rpx; height: 64rpx; font-size: 26rpx; }
	}
</style>
