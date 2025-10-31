<template>
	<view class="login-container">
		<view class="header">
			<image src="/static/logo.png" class="logo" />
			<text class="hospital-name">医院智慧平台</text>
		</view>

		<view class="form-container">
			<view class="input-group">
				<uni-icons type="person" size="24" color="#409EFF" />
				<input v-model="account" placeholder="请输入账号" class="input" />
			</view>

			<view class="input-group">
				<uni-icons type="locked" size="24" color="#409EFF" />
				<input v-model="password" :password="!showPassword" placeholder="请输入密码" class="input" />
				<uni-icons :type="showPassword ? 'eye' : 'eye-slash'" size="22" color="#999"
					@click="showPassword = !showPassword" />
			</view>

			<button class="login-btn" :class="{ active: account && password }" @click="handleLogin"
				hover-class="button-hover">
				登录
			</button>

			<view class="footer-links">
				<view @click="gotoRegister">注册账号</view>
				<view @click="gotoForgetPassword">忘记密码</view>
			</view>
		</view>
	</view>
</template>


<script setup>
	import { ref } from 'vue' 
	import { onLoad } from '@dcloudio/uni-app'
	const account = ref('');
	const password = ref('');
	const showPassword = ref(false);
	const isHarmonyOS = ref(false);

	onLoad(() => {
		// 检测是否鸿蒙系统
		// #ifdef HARMONY
		isHarmonyOS.value = true;
		// #endif
	});

	const handleLogin = async () => {
		if (!account.value || !password.value) {
			return uni.showToast({
				title: '请输入账户名和密码',
				icon: 'none'
			});
		}

		try {
			const res = await uni.request({
				url: 'http://localhost:8082/user/login', // 请确保这是您后端服务的正确地址
				method: 'POST',
				data: {
					account: account.value,
					password: password.value
				}
			});

			if (res && res.data) {
				if (res.data.code === '200' || res.data.code === 200) {
					uni.showToast({
						title: '登录成功',
						icon: 'success'
					});
					// 存储用户信息到本地
					uni.setStorageSync('user', res.data.data);
					// 跳转到首页
					setTimeout(() => {
						uni.switchTab({
							url: '/pages/tabbar/HomePage'
						});
					}, 1000);
				} else {
					uni.showToast({
						title: res.data.message || '登录失败，请检查您的账户或密码',
						icon: 'none'
					});
				}
			} else {
				uni.showToast({
					title: '网络错误或服务器响应异常',
					icon: 'none'
				});
			}
		} catch (error) {
			uni.showToast({
				title: '网络请求失败',
				icon: 'none'
			});
			console.error('Login request failed:', error);
		}
	};

	const gotoRegister = () => {
		uni.navigateTo({
			url: '/pages/login/Register'
		});
	};



	const gotoForgetPassword = () => {
		uni.navigateTo({
			url: '/pages/login/ForgetPwd'
		})
	}

	const appleLogin = () => {
		uni.showToast({
			title: '暂未开通 Apple 登录',
			icon: 'none'
		})
	}

	const harmonyLogin = () => {
		// 调用鸿蒙登录插件
		// #ifdef HARMONY
		const harmonyAuth = uni.requireNativePlugin('Harmony-Auth');
		harmonyAuth.login(result => {
			console.log('鸿蒙登录结果:', result);
		});
		// #endif
	};
</script>

<style scoped>
	.login-container {
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

	.hospital-name {
		font-size: 38rpx;
		font-weight: bold;
		color: #1890ff;
		margin-top: 24rpx;
		letter-spacing: 3rpx;
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

	.login-btn {
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

	.login-btn.active {
		background: linear-gradient(to right, #40a9ff, #1890ff);
		box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.4);
	}

	.button-hover {
		opacity: 0.8;
	}

	.footer-links {
	  display: flex;
	  flex-direction: row; 
	  justify-content: space-between;
	  text-align: center;
	  margin-top: 30rpx;
	  color: #1890ff;
	  font-size: 28rpx;
	  width: 100%;
	}
	
</style>