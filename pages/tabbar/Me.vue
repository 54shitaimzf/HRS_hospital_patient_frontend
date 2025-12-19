<template>
	<scroll-view scroll-y="true" class="container">
		
		<view class="profile-header">
			<image class="avatar" :src="avatarUrl" mode="aspectFill" />
			<text class="username">{{ username }}</text>
		</view>

		
		<view class="card" @click="goToProfileEdit">
			<text class="card-title">个人资料</text>
			<text class="card-desc">查看和编辑个人信息</text>
		</view>

		<view class="card" @click="goToRegistrations">
			<text class="card-title">我的挂号</text>
			<text class="card-desc">查看预约/已取消等挂号记录</text>
		</view>

		
		<view class="card" @click="goToExtraApplyList">
			<text class="card-title">我的加号</text>
			<text class="card-desc">查看加号申请记录</text>
		</view>

		<view class="card" @click="goToMyOrders">
			<text class="card-title">我的订单</text>
			<text class="card-desc">查看支付订单记录</text>
		</view>

		<view class="card" @click="goToOrders">
			<text class="card-title">就诊记录</text>
			<text class="card-desc">查看就诊记录与详情</text>
		</view>

		<view class="card" @click="goToSettings">
			<text class="card-title">账号设置</text>
			<text class="card-desc">账号安全及应用设置</text>
		</view>

		<button class="logout-btn" @click="logout">退出登录</button>
	</scroll-view>
</template>

<script setup>
	import {
		ref,
		computed,
		onMounted
	} from 'vue'
	import { useUserStore } from '../../store/user.js'

	const userStore = useUserStore()
	const avatarUrl = ref('https://cdn-icons-png.flaticon.com/512/147/147144.png') // 示例头像

	// 从 userStore 获取用户账号名
	const username = computed(() => {
		return userStore.userInfo?.account ||
		       userStore.userInfo?.username ||
		       userStore.userInfo?.userAccount ||
		       '未登录'
	})

	onMounted(() => {
		// 确保从本地存储恢复用户信息
		userStore.hydrate()
	})

	const goToProfileEdit = () => {
		uni.navigateTo({
			url: '/pages/me/ProfileEdit'
		})
	}
	const goToRegistrations = () => {
		uni.navigateTo({
			url: '/pages/me/RegistrationList'
		})
	}

	const goToExtraApplyList = () => {
		uni.navigateTo({ url: '/pages/his/ExtraApplyList' })
	}
	const goToMyOrders = () => {
		uni.navigateTo({
			url: '/pages/me/OrderList'
		})
	}
	const goToOrders = () => {
		uni.navigateTo({
			url: '/pages/record/RecordList'
		})
	}
	const goToSettings = () => {
		uni.navigateTo({
			url: '/pages/me/SettingList'
		})
	}
	const logout = () => {
		uni.showModal({
			title: '退出登录',
			content: '确定退出登录吗？',
			success(res) {
				if (res.confirm) {
					uni.reLaunch({
						url: '/pages/login/Login'
					})
				}
			}
		})
	}
</script>

<style scoped>
	.container {
		padding: 40rpx;
		background: linear-gradient(135deg, #e3f2fd, #bbdefb);
		min-height: 100vh;
		box-sizing: border-box;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}

	.profile-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 60rpx;
		padding-top: 40rpx;
		
		animation: float 4s ease-in-out infinite;
	}

	@keyframes float {

		0%,
		100% {
			transform: translateY(0);
		}

		50% {
			transform: translateY(-10rpx);
		}
	}

	.avatar {
		width: 140rpx;
		height: 140rpx;
		border-radius: 70rpx;
		border: 3rpx solid #5b86e5;
		box-shadow: 0 8rpx 20rpx rgba(91, 134, 229, 0.4);
		margin-bottom: 20rpx;
		background-color: white;
	}

	.username {
		font-size: 38rpx;
		font-weight: 700;
		color: #2c3e50;
		text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.1);
		letter-spacing: 1rpx;
	}

	
	.card {
		background-color: white;
		border-radius: 24rpx;
		padding: 35rpx 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.07);
		cursor: pointer;
		user-select: none;
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		border: 1rpx solid transparent;
	}

	.card:hover {
		box-shadow: 0 12rpx 36rpx rgba(91, 134, 229, 0.25);
		border-color: #5b86e5;
		transform: translateY(-4rpx);
	}

	.card:active {
		transform: translateY(-2rpx);
	}

	.card-title {
		font-size: 34rpx;
		font-weight: 700;
		color: #34495e;
	}

	.card-desc {
		font-size: 26rpx;
		color: #7f8c8d;
		margin-top: 8rpx;
		line-height: 1.4;
		margin-left: 10rpx;
	}

	
	.logout-btn {
		width: 100%;
		padding: 20rpx 0;
		font-size: 34rpx;
		font-weight: 600;
		color: #fff;
		border: none;
		border-radius: 100rpx;
		background: linear-gradient(90deg, #e74c3c, #c0392b);
		transition: all 0.25s ease-in-out;
		user-select: none;
	}

	.logout-btn:hover {
		transform: scale(1.03);
	}

	.logout-btn:active {
		opacity: 0.85;
		transform: scale(0.97);
	}
</style>
