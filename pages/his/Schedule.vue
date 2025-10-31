<template>
	<view class="container">

		<!-- 医生信息 -->
		<view class="doctor-info">
			<image class="avatar" :src="doctorAvatar" mode="aspectFill" />
			<view class="doctor-details">
				<text class="doctor-name">{{ doctorName }}</text>
				<text class="doctor-level">{{ doctorLevel }}</text>
				<text class="registration-fee">挂号费：{{ registrationFee }} 元</text>
			</view>
		</view>

		<!-- 医生介绍 -->
		<view class="doctor-intro">
			<text class="intro-title">医生介绍</text>
			<text class="intro-text">{{ doctorIntro }}</text>
		</view>

		<!-- 选择时间段 -->
		<view class="section">
			<text class="section-title">选择时间段</text>
			<view class="schedule-list">
				<view class="schedule-item" v-for="item in scheduleList" :key="item.date + '-' + item.period"
					:class="{ selected: isSelected(item) }" @click="selectSchedule(item)">
					<text>{{ item.date }} - {{ item.period }}</text>
					<text class="remain">剩余 {{ item.remain }} 号</text>
				</view>
			</view>
		</view>

		<!-- 预约信息 -->
		<view class="appointment-info">
			<view class="info-row">
				<text class="label">预约科室</text>
				<text class="value">{{ department }}</text>
			</view>
			<view class="info-row">
				<text class="label">预约日期</text>
				<text class="value">{{ selectedPeriod || '请选择时间段' }}</text>
			</view>
			<view class="info-row">
				<text class="label">就诊人姓名</text>
				<text class="value">张三</text>
			</view>
			<view class="info-row">
				<text class="label">就诊人ID</text>
				<text class="value">101021</text>
			</view>
		</view>

		<!-- 提交按钮 -->
		<view class="btn-wrap">
			<button class="submit-btn" @click="submit" :disabled="!canSubmit">提交预约</button>
		</view>

	</view>
</template>

<script setup>
	import {
		ref,
		computed
	} from 'vue'

	const doctorAvatar = ref('') // 示例头像链接
	const doctorName = ref('张三')
	const doctorLevel = ref('主任医师')
	const registrationFee = ref(50)
	const doctorIntro = ref('张三医生拥有20年心血管内科临床经验，擅长高血压、冠心病等疾病的诊治，医术精湛，深受患者好评。')

	const department = ref('心血管内科')
	const selectedPeriod = ref('')

	const scheduleList = ref([{
			date: '2025-06-05',
			period: '上午',
			remain: 10
		},
		{
			date: '2025-06-05',
			period: '下午',
			remain: 6
		},
		{
			date: '2025-06-06',
			period: '上午',
			remain: 8
		},
	])



	const selectSchedule = (item) => {
		selectedPeriod.value = `${item.date} ${item.period}`
	}

	const isSelected = (item) => selectedPeriod.value === `${item.date} ${item.period}`


	const canSubmit = computed(() => selectedPeriod.value)

	const submit = () => {
		if (!canSubmit.value) {
			uni.showToast({
				title: '请选择时间段和就诊人',
				icon: 'none',
			})
			return
		}
		// 跳转支付页，传递预约信息参数
		uni.navigateTo({
			url: `/pages/pay/Payment?doctorName=${encodeURIComponent(doctorName.value)}&department=${encodeURIComponent(department.value)}&time=${encodeURIComponent(selectedPeriod.value)}&fee=${registrationFee.value}`
		})
	}
</script>

<style scoped>
	.container {
		padding: 24rpx;
		background-color: #f5f9ff;
		height: 100vh;
		display: flex;
		flex-direction: column;
		gap: 24rpx;
		font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
	}

	/* 医生信息 */
	.doctor-info {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 20rpx;
		background-color: #eaf4ff;
		padding: 20rpx;
		border-radius: 16rpx;
		box-shadow: 0 4rpx 10rpx rgba(24, 144, 255, 0.2);
	}

	.avatar {
		width: 120rpx;
		height: 120rpx;
		border-radius: 60rpx;
		object-fit: cover;
		border: 2rpx solid #1890ff;
	}

	.doctor-details {
		display: flex;
		flex-direction: column;
		gap: 8rpx;
		flex: 1;
	}

	.doctor-name {
		font-size: 36rpx;
		font-weight: 700;
		color: #102a43;
	}

	.doctor-level {
		font-size: 28rpx;
		color: #096dd9;
	}

	.registration-fee {
		font-size: 28rpx;
		color: #fa541c;
		font-weight: 600;
	}

	/* 医生介绍 */
	.doctor-intro {
		background-color: #ffffff;
		padding: 20rpx;
		border-radius: 16rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
	}

	.intro-title {
		font-weight: 700;
		font-size: 30rpx;
		color: #102a43;
		margin-bottom: 12rpx;
	}

	.intro-text {
		font-size: 26rpx;
		color: #555;
		line-height: 1.5;
	}

	/* 预约信息栏 */
	.appointment-info {
		background-color: #eaf4ff;
		padding: 24rpx;
		border-radius: 16rpx;
		box-shadow: 0 4rpx 10rpx rgba(24, 144, 255, 0.2);
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.info-row {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
	}

	.label {
		font-size: 28rpx;
		font-weight: 600;
		color: #096dd9;
	}

	.value {
		font-size: 28rpx;
		font-weight: 500;
		color: #262626;
		max-width: 60%;
		text-align: right;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* 标题 */
	.section-title {
		font-size: 28rpx;
		font-weight: 700;
		color: #102a43;
		margin-bottom: 16rpx;
	}

	/* 时间段列表 */
	.schedule-list {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.schedule-item {
		background: #ffffff;
		border: 2rpx solid #d9e4ff;
		border-radius: 12rpx;
		padding: 20rpx;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		font-size: 28rpx;
		color: #102a43;
		cursor: pointer;
		transition: all 0.3s ease;
		user-select: none;
	}

	.schedule-item:hover {
		border-color: #1890ff;
		background-color: #e6f7ff;
	}

	.schedule-item.selected {
		border-color: #1890ff;
		background-color: #bae7ff;
		color: #0050b3;
		font-weight: 700;
	}

	.remain {
		color: #fa541c;
		font-weight: 600;
	}

	/* 选择就诊人 */
	.picker {
		background: #ffffff;
		padding: 18rpx 20rpx;
		border-radius: 12rpx;
		border: 2rpx solid #d9e4ff;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		font-size: 28rpx;
		color: #102a43;
		cursor: pointer;
	}

	.arrow {
		color: #999999;
		font-size: 32rpx;
	}

	/* 按钮 */
	.btn-wrap {
		margin-top: auto;
	}

	.submit-btn {
		width: 100%;
		background-color: #1890ff;
		color: #fff;
		font-size: 32rpx;
		padding: 18rpx 0;
		border-radius: 32rpx;
		font-weight: 700;
		border: none;
		transition: background-color 0.3s ease;
	}

	.submit-btn:disabled {
		background-color: #a0cfff;
		cursor: not-allowed;
	}
</style>