<template>
	<view class="page">
		<scroll-view class="container" scroll-y>
			<view class="content">
				<!-- 顶部横幅 -->
				<view class="banner">
					<text class="banner-title">人民医院</text>
					<text class="banner-subtitle">守护您的健康，共创美好未来</text>
				</view>
						
				<!-- 医院简介 -->
				<view class="section">
					<text class="section-title">医院简介</text>
					<text class="section-content">
						人民医院成立于1950年，是本地区规模最大、设备最先进的综合性三级甲等医院。拥有专业的医疗团队和先进的诊疗技术，致力于为广大患者提供优质、安全、便捷的医疗服务。
					</text>
				</view>
						
				<!-- 特色科室 -->
				<view class="section">
					<text class="section-title">特色科室</text>
					<view class="specialties">
						<view class="specialty-card" v-for="dept in specialties" :key="dept.id">
							<text class="specialty-name">{{ dept.name }}</text>
							<text class="specialty-desc">{{ dept.description }}</text>
						</view>
					</view>
				</view>
						
				<!-- 医院环境 -->
				<view class="section">
					<text class="section-title">医院环境</text>
					<scroll-view scroll-x class="env-scroll" show-scrollbar="false">
						<image v-for="(img, idx) in envImages" :key="idx" :src="img" mode="aspectFill" class="env-image" />
					</scroll-view>
				</view>
						
				<!-- 联系方式 -->
				<view class="section contact-section">
					<view class="section-title">联系方式</view>
					<view class="contact-item">地址：XXX市XXX区xxx路100号</view>
					<view class="contact-item">电话：010-12345678</view>
					<view class="contact-item">邮箱：xxxhis.cn</view>
					<view class="contact-item">官网：www.cityhospital.cn</view>
				</view>
			</view>
			
		</scroll-view>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue'

	const specialties = ref([{
			id: 1,
			name: '心血管内科',
			description: '专业治疗各类心脏疾病，配备先进心导管技术。',
		},
		{
			id: 2,
			name: '神经内科',
			description: '擅长脑血管疾病、神经退行性疾病的诊疗。',
		},
		{
			id: 3,
			name: '肿瘤科',
			description: '提供精准的肿瘤诊断和多学科综合治疗方案。',
		},
	])

	const envImages = ref([
		'/static/images/home/lb1.jpg',
		'/static/images/home/lb1.jpg',
		'/static/images/home/lb1.jpg',
	])
</script>

<style scoped>
	.page{
		width: 100%;
		height: 100vh;
		background-color: #f5f9ff;
	}
	.content {
		width: 95%;
		margin: 20rpx auto;
		padding-bottom: 20rpx;
	}
	.container {
		width: 100%;
		height: 100%;
		color: #102a43;
	}

	/* 顶部横幅 */
	.banner {
		background: linear-gradient(135deg, #0052d9, #1890ff);
		border-radius: 24rpx;
		padding: 48rpx 32rpx;
		color: #ffffff;
		text-align: center;
		margin-bottom: 40rpx;
		box-shadow: 0 12rpx 24rpx rgba(24, 144, 255, 0.3);
	}

	.banner-title {
		font-size: 48rpx;
		font-weight: 800;
		margin-bottom: 12rpx;
		letter-spacing: 4rpx;
	}

	.banner-subtitle {
		font-size: 28rpx;
		font-weight: 400;
		opacity: 0.9;
	}

	/* 每个内容区块 */
	.section {
		background: #fff;
		border-radius: 20rpx;
		padding: 32rpx;
		margin-bottom: 32rpx;
		box-shadow: 0 8rpx 15rpx rgba(0, 43, 92, 0.1);
	}

	/* 标题 */
	.section-title {
		font-size: 36rpx;
		font-weight: 700;
		color: #003a8c;
		margin-bottom: 24rpx;
		border-left: 6rpx solid #1890ff;
		padding-left: 16rpx;
		user-select: none;
	}

	/* 医院简介内容 */
	.section-content {
		font-size: 28rpx;
		line-height: 44rpx;
		color: #33475b;
		white-space: pre-line;
	}

	/* 特色科室卡片 */
	.specialties {
		display: flex;
		gap: 24rpx;
		flex-wrap: wrap;
		justify-content: space-between;
		margin-top: 20rpx;
	}

	.specialty-card {
		flex: 1 1 45%;
		background: #e6f7ff;
		border-radius: 16rpx;
		padding: 24rpx;
		box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
		transition: transform 0.3s ease;
		cursor: default;
	}

	.specialty-card:hover {
		transform: translateY(-8rpx);
	}

	.specialty-name {
		font-size: 32rpx;
		font-weight: 700;
		color: #096dd9;
		margin-bottom: 12rpx;
	}

	.specialty-desc {
		font-size: 26rpx;
		color: #33475b;
		line-height: 40rpx;
	}

	/* 医院环境横向滚动 */
	.env-scroll {
		display: flex;
		gap: 20rpx;
		padding-bottom: 16rpx;
		margin-top: 20rpx;
	}

	.env-image {
		width: 280rpx;
		height: 180rpx;
		border-radius: 16rpx;
		box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.1);
		object-fit: cover;
		margin: 10rpx 20rpx 0 0;
	}
	.env-image:last-child {
	    margin-right: 0;
	}

	/* 联系方式 */
	.contact-section {
		font-size: 28rpx;
		color: #33475b;
	}

	.contact-item {
		margin-bottom: 16rpx;
		user-select: text;
	}
</style>