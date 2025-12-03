<template>
	<scroll-view scroll-y class="container">
		
		<view class="banner">
			<view class="banner-title">🤖 智能问诊助手</view>
			<view class="banner-sub">根据症状快速获取健康建议</view>
		</view>

		
		<view class="card">
			<text class="card-title">🎯 开始问诊</text>
			<text class="card-content">
				请点击下方按钮进入问诊系统，我们将根据您的症状智能分析可能疾病并提供建议。
			</text>
			<view class="btn-group">
				<button class="main-btn" @click="startDiagnosis">立即问诊</button>
			</view>
		</view>

		
		<view class="card">
			<text class="card-title">🩺 常见症状</text>
			<view class="tag-list">
				<view v-for="item in symptoms" :key="item" class="tag">{{ item }}</view>
			</view>
		</view>
	</scroll-view>
</template>

<script setup>
	import {
		ref
	} from 'vue'

	const symptoms = ref([
		'头痛', '咳嗽', '腹泻', '发热', '皮疹', '胸闷', '失眠', '乏力', '恶心', '耳鸣'
	])

	const startDiagnosis = () => {
		uni.navigateTo({
			url: '/pages/ai/ChatBot'
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
		background: linear-gradient(135deg, #5ee7df, #b490ca);
		border-radius: 24rpx;
		padding: 40rpx 30rpx;
		margin-bottom: 40rpx;
		box-shadow: 0 8rpx 16rpx rgba(94, 231, 223, 0.3);
		text-align: center;
	}

	.banner-title {
		color: white;
		font-size: 36rpx;
		font-weight: bold;
		margin-bottom: 10rpx;
	}

	.banner-sub {
		color: #f0f8ff;
		font-size: 28rpx;
	}

	.card {
		background-color: white;
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.05);
	}

	.card-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 20rpx;
		display: block;
	}

	.card-content {
		font-size: 28rpx;
		color: #666;
		line-height: 1.8;
		margin-bottom: 20rpx;
	}

	.btn-group {
		display: flex;
		justify-content: flex-end;
		margin-top: 20rpx;
	}

	.main-btn {
		width: 100%;
		padding: 20rpx 0;
		font-size: 30rpx;
		color: #fff;
		border: none;
		border-radius: 100rpx;
		background: linear-gradient(to right, #36d1dc, #5b86e5);
		box-shadow: 0 10rpx 24rpx rgba(91, 134, 229, 0.3);
		transition: all 0.2s ease-in-out;
	}

	.main-btn:active {
		opacity: 0.8;
		transform: scale(0.98);
	}

	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: 20rpx;
	}

	.tag {
		background-color: #eef5ff;
		color: #3366cc;
		padding: 16rpx 30rpx;
		border-radius: 50rpx;
		font-size: 26rpx;
	}
</style>
