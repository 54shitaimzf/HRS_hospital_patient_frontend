<template>
	<scroll-view scroll-y class="container">
		<!-- Banner -->
		<view class="banner">
			<text class="banner-title">🧪 检查检验报告</text>
		</view>

		<!-- 检查报告卡片列表 -->
		<view v-if="reportList.length" class="card-list">
			<view class="card" v-for="item in reportList" :key="item.id">
				<view class="card-header">
					<image :src="item.icon" class="card-icon" />
					<view class="header-info">
						<text class="item-title">{{ item.name }}</text>
						<text class="item-status">{{ item.status }}</text>
					</view>
				</view>
				<view class="divider"></view>
				<view class="card-info">
					<text class="item-text">📅 开单时间：{{ item.applyDate }}</text>
					<text class="item-text">📝 报告时间：{{ item.reportDate }}</text>
				</view>
				<view class="btn-group">
					<button class="main-btn" @click="viewReport(item)">查看报告</button>
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<view v-else class="empty-card">
			<image src="/static/image/empty.png" class="empty-img" />
			<text class="empty-text">暂无检查检验记录</text>
		</view>
	</scroll-view>
</template>

<script setup>
	import {
		ref
	} from 'vue'

	const reportList = ref([{
			id: 1,
			name: '胸部CT检查',
			icon: '/static/icons/ct.png',
			status: '✅ 已出报告',
			applyDate: '2025-06-10 09:15',
			reportDate: '2025-06-10 17:30'
		},
		{
			id: 2,
			name: '血常规检验',
			icon: '/static/icons/blood.png',
			status: '✅ 已出报告',
			applyDate: '2025-06-08 10:00',
			reportDate: '2025-06-08 13:40'
		}
	])

	const viewReport = (item) => {
		uni.navigateTo({
			url: `/pages/inspection/ReportDetail?id=${item.id}`
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
		background: linear-gradient(135deg, #6dd5ed, #2193b0);
		border-radius: 24rpx;
		padding: 40rpx 30rpx;
		margin-bottom: 40rpx;
		box-shadow: 0 8rpx 16rpx rgba(33, 147, 176, 0.3);
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
		display: flex;
		flex-direction: column;
	}

	.card-header {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;
	}

	.card-icon {
		width: 64rpx;
		height: 64rpx;
		margin-right: 20rpx;
		border-radius: 12rpx;
		background-color: #eef5ff;
		padding: 10rpx;
	}

	.header-info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.item-title {
		font-size: 32rpx;
		color: #222;
		font-weight: bold;
	}

	.item-status {
		font-size: 28rpx;
		color: #43cea2;
		margin-top: 8rpx;
	}

	.divider {
		height: 1px;
		background-color: #eee;
		margin: 20rpx 0;
	}

	.card-info {
		font-size: 28rpx;
		color: #666;
		line-height: 1.6;
		display: flex;
		flex-direction: column;
		gap: 10rpx;
	}

	.btn-group {
		display: flex;
		justify-content: flex-end;
		margin-top: 20rpx;
	}

	.main-btn {
		font-size: 28rpx;
		color: white;
		border: none;
		border-radius: 100rpx;
		background: linear-gradient(to right, #36d1dc, #5b86e5);
		box-shadow: 0 6rpx 16rpx rgba(91, 134, 229, 0.3);
		transition: all 0.2s ease-in-out;
	}

	.main-btn:active {
		opacity: 0.9;
		transform: scale(0.98);
	}

	.empty-card {
		background-color: white;
		border-radius: 20rpx;
		padding: 60rpx 30rpx;
		box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.05);
		text-align: center;
		margin-top: 100rpx;
	}

	.empty-img {
		width: 180rpx;
		height: 180rpx;
		margin-bottom: 30rpx;
		opacity: 0.8;
	}

	.empty-text {
		font-size: 30rpx;
		color: #999;
	}
</style>