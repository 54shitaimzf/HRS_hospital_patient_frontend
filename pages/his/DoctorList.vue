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
				<button class="extra-btn" @click.stop="goExtraApply(doc)">加号</button>
			</view>
		</view>
	</scroll-view>
</template>

<script setup>
	import { ref } from 'vue' 
	import { onLoad } from '@dcloudio/uni-app'
	const doctorList = ref([])
	const fromParam = ref('')
	const currentDeptId = ref('')

	onLoad((options) => {
		fromParam.value = options.from || ''

		currentDeptId.value = options.deptId || options.departId || options.id || ''
		doctorList.value = []
	})

	const goSchedule = (doc) => {

		if (fromParam.value === 'extraApply') {
			const params = [
				`deptId=${encodeURIComponent(currentDeptId.value || doc.departId || '')}`,
				`deptName=${encodeURIComponent(doc.departName || '')}`,
				`doctorId=${encodeURIComponent(doc.id || doc.doctorId || '')}`,
				`doctorName=${encodeURIComponent(doc.name || '')}`
			].join('&')
			uni.navigateTo({ url: `/pages/his/ExtraApply?${params}` })
			return
		}

		uni.navigateTo({
			url: `/pages/his/Schedule?deptId=${doc.departId}&deptName=${encodeURIComponent(doc.name)}`
		})
	}

	const goExtraApply = (doc) => {

		const params = [
			`deptId=${encodeURIComponent(currentDeptId.value || doc.departId || '')}`,
			`deptName=${encodeURIComponent(doc.departName || '')}`,
			`doctorId=${encodeURIComponent(doc.id || doc.doctorId || '')}`,
			`doctorName=${encodeURIComponent(doc.name || '')}`
		].join('&')
		uni.navigateTo({ url: `/pages/his/ExtraApply?${params}` })
	}
</script>

<style scoped>
	.container {
		padding: 24rpx;
		background-color: #f5f8fb;
		height: 100vh;
	}

	
	.doctor-card {
		display: flex;
		flex-direction: row;
		
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

	
	.desc {
		font-size: 28rpx;
		color: #5a6a82;
		margin-top: 10rpx;
		line-height: 38rpx;
	}

	
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

	
	.btn-wrap {
		width: 220rpx;
		display:flex;
		flex-direction: row;
		gap: 12rpx;
	}

	
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

	.extra-btn {
		min-width:110px;
		height:44px;
		line-height:44px;
		font-size:16px;
		padding: 0 18px;
		background: #6c757d;
		color: #fff;
		border-radius: 8px;
		border: none;
		cursor: pointer;
	}
</style>
