<template>
	<view class="container">
		<text class="title">设置</text>
		<view class="setting-item" @click="changePassword">
			<text>修改密码</text>
			<text class="arrow">></text>
		</view>
		<view class="setting-item" @click="clearCache">
			<text>清除缓存</text>
			<text class="arrow">></text>
		</view>
		<view class="setting-item" @click="about">
			<text>关于我们</text>
			<text class="arrow">></text>
		</view>
	</view>
</template>

<script setup>
	const changePassword = () => {
		uni.showToast({
			title: '修改密码功能未实现',
			icon: 'none'
		})
	}

	const clearCache = () => {
		uni.clearStorageSync()
		uni.showToast({
			title: '缓存已清除',
			icon: 'success'
		})
	}

	const about = () => {
		uni.navigateTo({
			url: '/pages/about/index'
		})
	}
</script>

<style scoped>
	.container {
		padding: 40rpx;
		background: #fff;
		min-height: 100vh;
	}

	.title {
		font-size: 36rpx;
		font-weight: bold;
		margin-bottom: 40rpx;
		color: #333;
	}

	.setting-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30rpx 24rpx;
		border-bottom: 1rpx solid #eee;
		font-size: 28rpx;
		color: #555;
		cursor: pointer;
		user-select: none;
	}

	.arrow {
		color: #ccc;
		font-weight: 700;
		font-size: 32rpx;
	}

	.setting-item:active {
		background-color: #f3f6fb;
	}
</style>