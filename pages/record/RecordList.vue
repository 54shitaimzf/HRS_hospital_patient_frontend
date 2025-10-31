<template>
	<scroll-view scroll-y class="container">
		<view class="record-card" v-for="item in records" :key="item.id">
			<view class="header-row">
				<text class="department">{{ item.department }}</text>
				<text class="status" :class="{'status-cancelled': item.status === '已取消'}">{{ item.status }}</text>
			</view>

			<view class="info-row">
				<text class="label">医生：</text>
				<text class="value">{{ item.doctor }}（{{ item.level }}）</text>
			</view>

			<view class="info-row">
				<text class="label">午别：</text>
				<text class="value">{{ item.period }}</text>
			</view>

			<view class="info-row">
				<text class="label">时间：</text>
				<text class="value">{{ item.date }}</text>
			</view>

			<view class="info-row">
				<text class="label">号序：</text>
				<text class="value">{{ item.serialNumber }}</text>
			</view>

			<view class="info-row">
				<text class="label">费用：</text>
				<text class="value fee">￥{{ item.fee.toFixed(2) }}</text>
			</view>

			<button class="cancel-btn" v-if="item.status !== '已取消'" @click="cancel(item.id)">
				取消挂号
			</button>
		</view>
	</scroll-view>
</template>

<script setup>
	import {
		ref
	} from 'vue'

	const records = ref([{
			id: 1,
			department: '心血管内科',
			doctor: '张三',
			level: '主任医师',
			period: '上午',
			date: '2025-06-05',
			serialNumber: 'A123',
			fee: 150,
			status: '已挂号',
		},
		{
			id: 2,
			department: '神经内科',
			doctor: '李四',
			level: '副主任医师',
			period: '下午',
			date: '2025-06-06',
			serialNumber: 'B045',
			fee: 120,
			status: '已挂号',
		},
	])

	const cancel = (id) => {
		const index = records.value.findIndex((r) => r.id === id)
		if (index !== -1) {
			records.value[index].status = '已取消'
			// 这里可以扩展调用接口逻辑
			uni.showToast({
				title: '挂号已取消',
				icon: 'success',
			})
		}
	}
</script>

<style scoped>
	.container {
		padding: 24rpx;
		background-color: #f0f4f8;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		gap: 24rpx;
		font-family: "PingFang SC", "Helvetica Neue", Helvetica, Arial, sans-serif;
	}

	/* 卡片整体 */
	.record-card {
		background: #ffffff;
		border-radius: 20rpx;
		padding: 24rpx 32rpx;
		box-shadow: 0 8rpx 15rpx rgba(0, 43, 92, 0.1);
		display: flex;
		flex-direction: column;
		gap: 16rpx;
		margin-bottom: 20rpx;
	}

	/* 头部：科室 和 状态 */
	.header-row {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
	}

	.department {
		font-size: 32rpx;
		font-weight: 700;
		color: #004a99;
	}

	.status {
		font-size: 28rpx;
		font-weight: 600;
		color: #1890ff;
		padding: 6rpx 18rpx;
		border-radius: 16rpx;
		background-color: #e6f7ff;
		user-select: none;
	}

	.status-cancelled {
		color: #ff4d4f;
		background-color: #fff1f0;
	}

	/* 信息行 */
	.info-row {
		display: flex;
		flex-direction: row;
		gap: 10rpx;
		font-size: 28rpx;
		color: #33475b;
		align-items: center;
	}

	.label {
		font-weight: 600;
		color: #102a43;
		min-width: 100rpx;
	}

	.value {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.fee {
		color: #fa541c;
		font-weight: 700;
	}

	/* 取消按钮 */
	.cancel-btn {
		align-self: flex-end;
		background-color: #ff4d4f;
		color: #fff;
		border: none;
		border-radius: 32rpx;
		padding: 5rpx 30rpx;
		font-size: 28rpx;
		font-weight: 700;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}

	.cancel-btn:hover {
		background-color: #d9363e;
	}

	.cancel-btn:active {
		background-color: #a93232;
	}
</style>