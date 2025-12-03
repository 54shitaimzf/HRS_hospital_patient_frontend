<template>
	<scroll-view scroll-y class="container">
		
		<view class="banner">
			<text class="banner-title">💳 门诊缴费中心</text>
		</view>

		
		<view v-if="paymentList.length" class="card-list">
			<view class="card" v-for="item in paymentList" :key="item.id">
				<view class="card-header">
					<text class="item-title">{{ item.project }}</text>
					<text class="item-price">¥{{ item.amount }}</text>
				</view>
				<view class="card-info">
					<text class="item-text">科室：{{ item.department }}</text>
					<text class="item-text">医生：{{ item.doctor }}</text>
				</view>
				<button class="main-btn" @click="pay(item)">去缴费</button>
			</view>
		</view>

		
		<view v-else class="empty">
			<image src="/static/image/empty.png" class="empty-img" />
			<text class="empty-text">暂无待缴费用项目</text>
		</view>
	</scroll-view>
</template>

<script setup>
	import {
		ref
	} from 'vue'


	const paymentList = ref([{
			id: 1,
			project: '心电图检查费',
			amount: '35.00',
			department: '心内科',
			doctor: '张三'
		},
		{
			id: 2,
			project: '药品费 - 阿司匹林',
			amount: '12.50',
			department: '药房',
			doctor: '开药医生'
		}
	])

	const pay = (item) => {
		uni.navigateTo({
			url: `/pages/payment/PayDetail?id=${item.id}`
		})
	}
</script>

<style scoped>
	.container {
		padding: 40rpx;
		background-color: #f5f7fa;
		min-height: 100vh;
		box-sizing: border-box;
	}

	.banner {
		background: linear-gradient(135deg, #36d1dc, #5b86e5);
		border-radius: 24rpx;
		padding: 40rpx 30rpx;
		margin-bottom: 40rpx;
		box-shadow: 0 8rpx 16rpx rgba(91, 134, 229, 0.3);
	}

	.banner-title {
		color: white;
		font-size: 36rpx;
		font-weight: bold;
		text-align: center;
	}

	.card-list {
		display: flex;
		flex-direction: column;
		gap: 30rpx;
	}

	.card {
		background-color: white;
		border-radius: 20rpx;
		padding: 30rpx;
		box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.05);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
	}

	.item-title {
		font-size: 32rpx;
		color: #333;
		font-weight: bold;
	}

	.item-price {
		font-size: 30rpx;
		color: #e53935;
		font-weight: 600;
	}

	.card-info {
		display: flex;
		justify-content: space-between;
		color: #666;
		font-size: 28rpx;
		margin-bottom: 20rpx;
	}

	.main-btn {
		width: 100%;
		padding: 20rpx 0;
		font-size: 30rpx;
		color: #fff;
		border: none;
		border-radius: 100rpx;
		background: linear-gradient(to right, #40a9ff, #1890ff);
		box-shadow: 0 10rpx 24rpx rgba(24, 144, 255, 0.3);
		transition: all 0.2s ease-in-out;
	}

	.main-btn:active {
		opacity: 0.8;
		transform: scale(0.98);
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin-top: 120rpx;
		color: #aaa;
	}

	.empty-img {
		width: 200rpx;
		height: 200rpx;
		margin-bottom: 30rpx;
		opacity: 0.8;
	}

	.empty-text {
		font-size: 30rpx;
		color: #999;
	}
</style>
