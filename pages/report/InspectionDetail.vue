<template>
	<scroll-view scroll-y class="container">
		<!-- 标题Banner -->
		<view class="banner">
			<text class="banner-title">📝 报告详情</text>
		</view>

		<!-- 报告基础信息 -->
		<view class="section">
			<text class="section-title">检查信息</text>
			<view class="info-item"><text>项目名称：</text><text>{{ report.name }}</text></view>
			<view class="info-item"><text>检查医生：</text><text>{{ report.doctor }}</text></view>
			<view class="info-item"><text>开单时间：</text><text>{{ report.applyDate }}</text></view>
			<view class="info-item"><text>报告时间：</text><text>{{ report.reportDate }}</text></view>
		</view>

		<!-- 检查结果 -->
		<view class="section">
			<text class="section-title">检查结果</text>
			<text class="section-content">{{ report.result }}</text>
		</view>

		<!-- 结论建议 -->
		<view class="section">
			<text class="section-title">医生结论</text>
			<text class="section-content">{{ report.conclusion }}</text>
		</view>

		<!-- 按钮 -->
		<view class="footer-btn">
			<button class="main-btn" @click="goBack">返回上一页</button>
		</view>
	</scroll-view>
</template>

<script setup>
	import {
		ref,
		onMounted
	} from 'vue'
	import {
		onLoad
	} from '@dcloudio/uni-app'

	const report = ref({
		id: null,
		name: '',
		doctor: '',
		applyDate: '',
		reportDate: '',
		result: '',
		conclusion: ''
	})

	onLoad((options) => {
		const reportId = options.id
		// 模拟数据加载，建议替换为后端接口请求
		if (reportId === '1') {
			report.value = {
				id: 1,
				name: '胸部CT检查',
				doctor: '张医生',
				applyDate: '2025-06-10 09:15',
				reportDate: '2025-06-10 17:30',
				result: '影像显示右肺下叶有小结节，建议定期复查。',
				conclusion: '建议每年复查一次，观察结节变化，保持良好作息。'
			}
		} else {
			report.value = {
				id: 2,
				name: '血常规检验',
				doctor: '李医生',
				applyDate: '2025-06-08 10:00',
				reportDate: '2025-06-08 13:40',
				result: '白细胞数量正常，红细胞轻微偏低，血红蛋白正常。',
				conclusion: '注意饮食营养，必要时补铁，定期复查。'
			}
		}
	})

	const goBack = () => {
		uni.navigateBack()
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
		background: linear-gradient(135deg, #2193b0, #6dd5ed);
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

	.section {
		background-color: #fff;
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.05);
	}

	.section-title {
		font-size: 32rpx;
		color: #333;
		font-weight: bold;
		margin-bottom: 20rpx;
		display: block;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		font-size: 28rpx;
		color: #666;
		margin-bottom: 18rpx;
	}

	.section-content {
		font-size: 28rpx;
		color: #444;
		line-height: 1.8;
		white-space: pre-line;
	}

	.footer-btn {
		margin-top: 40rpx;
		display: flex;
		justify-content: center;
	}

	.main-btn {
		width: 80%;
		padding: 28rpx 0;
		font-size: 30rpx;
		color: #fff;
		border: none;
		border-radius: 100rpx;
		background: linear-gradient(to right, #36d1dc, #5b86e5);
		box-shadow: 0 10rpx 24rpx rgba(91, 134, 229, 0.3);
	}
</style>