<template>
	<scroll-view scroll-y="true" class="container">
		<view class="doctor-card" v-for="doc in doctorList" :key="doc.id">
			<view class="doctor-info" @click="goSchedule(doc)">
				<view class="name-row">
					<text class="name">{{ doc.name }}</text>
					<text class="title">{{ doc.title }}</text>
				</view>
				<view class="desc">{{ doc.desc }}</view>
				<view class="sub-info">
					<text class="tag">{{ doc.period }}</text>
					<text class="remain">余号：{{ doc.remaining }}</text>
				</view>
			</view>
			<view class="btn-wrap">
				<button class="reserve-btn" @click.stop="goSchedule(doc)">立即预约</button>
			</view>
		</view>
	</scroll-view>
</template>

<script setup>
	import { ref } from 'vue' 
	import { onLoad } from '@dcloudio/uni-app'
	const doctorList = ref([])

	onLoad(() => {
		doctorList.value = [{
				id: 1,
				departId: 'DEP013', // 新增科室编码，供排班页使用
				name: '张三',
				title: '主任医师',
				desc: '擅长高血压、糖尿病的综合治疗',
				period: '上午',
				remaining: 5
			},
			{
				id: 2,
				departId: 'DEP013',
				name: '李四',
				title: '副主任医师',
				desc: '心血管疾病专科，经验丰富',
				period: '下午',
				remaining: 2
			}
		]
	})

	const goSchedule = (doc) => {
		// 传递科室编码与医生名（医生名仅用于标题展示，不影响接口）
		uni.navigateTo({
			url: `/pages/his/Schedule?deptId=${doc.departId}&deptName=${encodeURIComponent(doc.name)}`
		})
	}
</script>

<style scoped>
	.container {
		padding: 24rpx;
		background-color: #f5f8fb;
		height: 100vh;
	}

	/* 医生卡片整体 */
	.doctor-card {
		display: flex;
		flex-direction: row;
		/* 保证横排 */
		justify-content: space-between;
		align-items: center;
		background-color: #ffffff;
		border-radius: 20rpx;
		box-shadow: 0 8rpx 20rpx rgba(0, 100, 180, 0.1);
		padding: 28rpx 32rpx;
		margin-bottom: 28rpx;
		transition: box-shadow 0.3s ease;
	}

	.doctor-card:hover {
		box-shadow: 0 12rpx 30rpx rgba(0, 100, 180, 0.15);
	}

	/* 医生信息区域 */
	.doctor-info {
		flex: 1;
		padding-right: 32rpx;
		cursor: pointer;
	}
	
	.name-row{
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.name {
		font-size: 36rpx;
		font-weight: 700;
		color: #004080;
	}

	.title {
		font-size: 28rpx;
		margin-left: 14rpx;
	}

	/* 医生擅长描述 */
	.desc {
		font-size: 28rpx;
		color: #5a6a82;
		margin-top: 10rpx;
		line-height: 38rpx;
	}

	/* 午别和余号 */
	.sub-info {
		margin-top: 16rpx;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 24rpx;
	}

	.tag {
		background-color: #d0e8ff;
		color: #1a73e8;
		font-size: 24rpx;
		padding: 6rpx 18rpx;
		border-radius: 14rpx;
		font-weight: 600;
		box-shadow: 0 1rpx 4rpx rgba(26, 115, 232, 0.3);
	}

	.remain {
		font-size: 26rpx;
		color: #e8590c;
		font-weight: 700;
	}

	/* 预约按钮容器 */
	.btn-wrap {
		width: 180rpx;
	}

	/* 预约按钮 */
	.reserve-btn {
		background: linear-gradient(135deg, #1a73e8 0%, #004080 100%);
		color: #fff;
		font-size: 28rpx;
		font-weight: 700;
		border-radius: 36rpx;
		padding: 5rpx 0;
		width: 100%;
		transition: background 0.3s ease;
		border: none;
		outline: none;
		cursor: pointer;
	}

	.reserve-btn:active {
		background: linear-gradient(135deg, #004080 0%, #1a73e8 100%);
		box-shadow: 0 3rpx 8rpx rgba(0, 64, 128, 0.6);
	}
</style>