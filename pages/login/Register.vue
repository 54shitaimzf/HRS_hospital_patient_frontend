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
				<input v-model="form.identificationId" placeholder="请输入身份证号" class="input" />
			</view>
			<view class="input-group gender-group">
				<uni-icons type="staff" size="22" color="#999"></uni-icons>
				<text class="gender-label">性别</text>
				<radio-group @change="genderChange" class="radio-group">
					<label class="radio">
						<radio value="男" checked="true" /><text>男</text>
					</label>
					<label class="radio">
						<radio value="女" /><text>女</text>
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
		</view>
	</view>
</template>


<script setup>
	import {
		ref
	} from 'vue'

	const form = ref({
		userName: '',
		userPassword: '',
		confirm: '',
		userGender: '男',
		userAccount: '',
		identificationId: ''
	})

	const goBack = () => {
		uni.navigateBack();
	}

	const genderChange = (e) => {
		form.value.userGender = e.detail.value
	}

	const register = async () => {
		if (form.value.userPassword !== form.value.confirm) {
			return uni.showToast({
				title: '两次密码不一致',
				icon: 'none'
			})
		}
		const registerData = { ...form.value };
		delete registerData.confirm;
		try {
			const res = await uni.request({
				url: 'http://localhost:8082/user/register',
				method: 'POST',
				data: registerData
			});

			if (res && res.data) {
				if (res.data.code === '200' || res.data.code === 200) {
					uni.showToast({
						title: '注册成功',
						icon: 'success'
					});
					setTimeout(() => uni.redirectTo({
						url: '/pages/login/Login'
					}), 1000);
				} else {
					console.log('注册失败，后端返回数据:', res.data);
					uni.showToast({
						title: `${res.data.message || '注册失败'}(${res.data.code})`,
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
				title: '请求失败，请检查网络连接',
				icon: 'none'
			});
			console.error('Register request failed:', error);
		}
	}
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

	.register-btn:active {
		transform: scale(0.97);
		opacity: 0.9;
	}
</style>