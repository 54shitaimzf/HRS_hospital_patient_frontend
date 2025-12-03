<template>
	<scroll-view scroll-y class="container">
		
		<view class="banner">
			<text class="banner-title">📄 我的电子处方</text>
		</view>

		
		<view v-if="prescriptions.length" class="card-list">
			<view class="card" v-for="item in prescriptions" :key="item.id">
				<view class="card-header">
					<text class="item-title">{{ item.medicine }}</text>
					<text class="item-status">{{ item.status }}</text>
				</view>
				<view class="card-info">
					<text class="item-text">剂量：{{ item.dosage }}</text>
					<text class="item-text">医生：{{ item.doctor }}</text>
				</view>
				<view class="card-info">
					<text class="item-text">开方日期：{{ item.date }}</text>
				</view>
				<view class="btn-group">
					<button class="btn-view" @click="viewDetail(item)">查看详情</button>
					<button class="btn-download" @click="download(item)">下载处方</button>
				</view>
			</view>
		</view>

		
		<view v-else class="empty">
			<image src="/static/image/empty.png" class="empty-img" />
			<text class="empty-text">暂无处方记录</text>
		</view>
	</scroll-view>
</template>

<script setup>
	import {
		ref
	} from 'vue'

	const prescriptions = ref([{
			id: 1,
			medicine: '头孢克肟片',
			dosage: '100mg × 2次/天',
			doctor: '李医生',
			date: '2025-06-15',
			status: '已开具'
		},
		{
			id: 2,
			medicine: '阿莫西林胶囊',
			dosage: '250mg × 3次/天',
			doctor: '王医生',
			date: '2025-06-12',
			status: '已开具'
		}
	])

	const viewDetail = (item) => {
		uni.navigateTo({
			url: `/pages/prescription/PrescriptionDetail?id=${item.id}`
		})
	}

	const download = (item) => {
		uni.showToast({
			title: `处方 ${item.id} 下载中...`,
			icon: 'none'
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
		background: linear-gradient(135deg, #7f7fd5, #86a8e7);
		border-radius: 24rpx;
		padding: 40rpx 30rpx;
		margin-bottom: 40rpx;
		box-shadow: 0 8rpx 16rpx rgba(127, 127, 213, 0.3);
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

	.item-status {
		font-size: 28rpx;
		color: #1890ff;
	}

	.card-info {
		display: flex;
		justify-content: space-between;
		color: #666;
		font-size: 28rpx;
		margin-bottom: 10rpx;
	}

	.btn-group {
		display: flex;
		justify-content: space-between;
		margin-top: 20rpx;
		gap: 20rpx;
	}

	.btn-view,
	.btn-download {
		flex: 1;
		padding: 20rpx 0;
		font-size: 28rpx;
		color: white;
		border: none;
		border-radius: 100rpx;
		box-shadow: 0 6rpx 16rpx rgba(24, 144, 255, 0.2);
	}

	.btn-view {
		background: linear-gradient(to right, #40a9ff, #1890ff);
	}

	.btn-download {
		background: linear-gradient(to right, #67b26f, #4ca2cd);
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
