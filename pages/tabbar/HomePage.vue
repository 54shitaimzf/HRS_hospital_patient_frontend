<template>
	<scroll-view scroll-y class="container">
		<!-- 轮播图 -->
		<swiper indicator-dots autoplay interval="3000" class="swiper-container">
			<swiper-item v-for="(banner, index) in banners" :key="index">
				<image :src="banner" class="banner-image" mode="aspectFill" />
			</swiper-item>
		</swiper>

		<!-- 消息滚动 -->
		<view class="marquee-wrapper">
			<view class="marquee-content" :style="{ animationDuration: animationDuration + 's' }">
				{{ marqueeMsg }}
			</view>
		</view>

		<!-- 宫格功能 -->
		<view class="grid-container">
			<view class="grid-item" v-for="(item, index) in gridList" :key="index" @click="item.action">
				<image :src="item.icon" class="grid-icon" mode="aspectFit" />
				<text class="grid-text">{{ item.text }}</text>
			</view>
		</view>

		<!-- 医院简介卡片 -->
		<view class="card">
			<text class="card-title">🏨 医院简介</text>
			<text class="card-content">
				本医院是一所集医疗、教学、科研于一体的三级甲等综合性医院，拥有先进的设备与专业团队。
			</text>
		</view>

		<!-- 特色科室卡片 -->
		<view class="card">
			<text class="card-title">⭐ 特色科室</text>
			<view class="card-content">
				本院设有肿瘤科、心血管科、神经内科、儿科、眼科等重点科室，提供高质量的专科服务。
			</view>
			<button class="main-btn" @click="goDepartments">查看科室</button>
		</view>
	</scroll-view>
</template>

<script setup>
	import {
		ref,
		onMounted,
		getCurrentInstance
	} from 'vue';

	const banners = [
		'/static/images/home/lb1.jpg',
		'/static/images/home/lb1.jpg',
		'/static/images/home/lb1.jpg',
	];

	const marqueeMsg = '【智慧医院】欢迎您！请注意佩戴口罩，保持安全距离。';
	const animationDuration = ref(10); // 默认10秒

	onMounted(() => {
		// #ifdef MP-WEIXIN
		const { proxy } = getCurrentInstance();
		const query = uni.createSelectorQuery().in(proxy);
		query.select('.marquee-wrapper').boundingClientRect();
		query.select('.marquee-content').boundingClientRect();
		query.exec(res => {
			if (res && res[0] && res[1]) {
				const containerWidth = res[0].width;
				const contentWidth = res[1].width;
				if (contentWidth > 0) {
					animationDuration.value = ((contentWidth + containerWidth) / 100) * 4;
				}
			}
		});
		// #endif
	});

	const gridList = [{
			icon: '/static/images/home/yygh.png',
			text: '预约挂号',
			action: () => uni.navigateTo({
				url: '/pages/his/Departments'
			}),
		},
		{
			icon: '/static/images/home/mzjf.png',
			text: '门诊缴费',
			action: () => uni.navigateTo({
				url: '/pages/outpatient/OutpatientPayment'
			}),
		},
		{
			icon: '/static/images/home/dzcf.png',
			text: '电子处方',
			action: () => uni.navigateTo({
				url: '/pages/pre/PrescriptionList'
			}),
		},
		{
			icon: '/static/images/home/jcjy.png',
			text: '检查检验',
			action: () => uni.navigateTo({
				url: '/pages/report/InspectionList'
			}),
		},
		{
			icon: '/static/images/home/znwd.png',
			text: '智能问诊',
			action: () => uni.navigateTo({
				url: '/pages/ai/SmartDiagnosis'
			}),
		},
		{
			icon: '/static/images/home/ypyj.png',
			text: '药品邮寄',
			action: () => uni.navigateTo({
				url: '/pages/drug/DrugMailing'
			}),
		},
	];

	const goDepartments = () => {
		uni.navigateTo({
			url: '/pages/his/Departments'
		});
	};

	const handleFunc = (item) => {
		if (item.route) {
			uni.navigateTo({
				url: item.route
			});
		} else {
			uni.showToast({
				title: '功能暂未开放',
				icon: 'none'
			});
		}
	};
</script>

<style scoped>
	.container {
		padding: 20rpx;
		background-color: #f5f7fa;
		min-height: 100vh;
		box-sizing: border-box;
	}

	/* 轮播图 */
	.swiper-container {
		height: 280rpx;
		border-radius: 24rpx;
		margin-bottom: 40rpx;
		overflow: hidden;
		box-shadow: 0 10rpx 24rpx rgba(91, 134, 229, 0.25);
	}

	.banner-image {
		width: 100%;
		height: 280rpx;
		object-fit: cover;
	}

	/* 消息滚动 */
	.marquee-wrapper {
		width: 100%;
		overflow: hidden;
		white-space: nowrap;
		background: linear-gradient(90deg, #ffaa7f, #f57b66);
		border-radius: 20rpx;
		height: 50rpx;
		display: flex;
		align-items: center;
		padding: 10rpx 30rpx;
		box-shadow: 0 6rpx 12rpx rgba(66, 165, 245, 0.4);
		user-select: none;
		margin-bottom: 20rpx;
	}

	.marquee-content {
		display: inline-block;
		padding-left: 100%;
		color: white;
		font-size: 28rpx;
		animation-name: marqueeAnim;
		animation-timing-function: linear;
		animation-iteration-count: infinite;
		animation-fill-mode: forwards;
	}

	@keyframes marqueeAnim {
		0% {
			transform: translateX(0%);
		}

		100% {
			transform: translateX(-100%);
		}
	}

	/* 宫格功能 */
	.grid-container {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		margin-top: 40rpx;
	}

	.grid-item {
		width: 30%;
		margin-bottom: 40rpx;
		background: #fff;
		border-radius: 20rpx;
		box-shadow: 0 8rpx 20rpx rgba(24, 144, 255, 0.15);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 30rpx 0;
		cursor: pointer;
		transition: box-shadow 0.3s ease;
	}

	.grid-item:hover {
		box-shadow: 0 12rpx 28rpx rgba(24, 144, 255, 0.3);
	}

	.grid-icon {
		width: 90rpx;
		height: 90rpx;
		margin-bottom: 18rpx;
	}

	.grid-text {
		font-size: 28rpx;
		color: #1890ff;
		font-weight: 600;
		text-align: center;
		user-select: none;
	}

	/* 医院简介卡片 */
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

	/* 特色科室按钮 */
	.main-btn {
		width: 100%;
		padding: 28rpx 0;
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
</style>