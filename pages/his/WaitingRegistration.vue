<template>
	<view class="container">
		<view class="card">
			<view class="header">
				<text class="title">候补挂号</text>
			</view>
			<view class="info-line">
				<text class="label">科室:</text>
				<text class="value">{{ departmentName }}</text>
			</view>
			<view class="info-line">
				<text class="label">医生:</text>
				<text class="value">{{ doctorName }} ({{ doctorTitle }})</text>
			</view>
			<view class="info-line">
				<text class="label">时间:</text>
				<text class="value">{{ scheduleDate }} {{ timePeriodName }}</text>
			</view>
			<view class="info-line">
				<text class="label">费用:</text>
				<text class="value">¥{{ registrationFee }}</text>
			</view>
		</view>

		<view class="status-card">
			<view v-if="loading" class="status-content">
				<text>正在查询候补信息...</text>
			</view>
			<view v-else-if="error" class="status-content error">
				<text>{{ error }}</text>
				<button size="mini" @click="fetchWaitingInfo">重试</button>
			</view>
			<view v-else class="status-content">
				<text class="waiting-count">当前有 {{ waitingCount }} 人在排队</text>
				<text v-if="myPosition > 0" class="my-position">您排在第 {{ myPosition }} 位</text>
				<text v-else class="tip">您还未加入候补队列</text>
			</view>
		</view>

		<button class="submit-btn" :loading="submitting" :disabled="loading || myPosition > 0" @click="submitWaiting">
			{{ myPosition > 0 ? '已在队列中' : '确认候补' }}
		</button>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue';
	import {
		onLoad
	} from '@dcloudio/uni-app';
	import {
		useUserStore
	} from '../../store/user.js';
	import {
		api
	} from '../../utils/api.js';

	const userStore = useUserStore();


	const scheduleRecordId = ref('');
	const departmentName = ref('');
	const doctorName = ref('');
	const doctorTitle = ref('');
	const scheduleDate = ref('');
	const timePeriodName = ref('');
	const registrationFee = ref(0);


	const loading = ref(true);
	const submitting = ref(false);
	const error = ref('');
	const waitingCount = ref(0);
	const myPosition = ref(0); // 0 表示未在队列

	onLoad((options) => {
		scheduleRecordId.value = options.scheduleRecordId;
		departmentName.value = decodeURIComponent(options.departmentName);
		doctorName.value = decodeURIComponent(options.doctorName);
		doctorTitle.value = decodeURIComponent(options.doctorTitle);
		scheduleDate.value = options.scheduleDate;
		timePeriodName.value = decodeURIComponent(options.timePeriodName);
		registrationFee.value = options.registrationFee;

		uni.setNavigationBarTitle({
			title: '候补挂号'
		});
		fetchWaitingInfo();
	});

	async function fetchWaitingInfo() {
		loading.value = true;
		error.value = '';
		try {
			const res = await api.get('/api/registrations/waiting', {
				scheduleRecordId: scheduleRecordId.value
			});
			if (res.statusCode === 200) {
				const data = res.data;
				waitingCount.value = data.waitingCount || 0;
				const patientId = userStore.patientId;
				const me = data.waitingList?.find(p => p.patientId === patientId);
				if (me) {
					myPosition.value = me.position;
				}
			} else {
				throw new Error(res.data?.message || '查询失败');
			}
		} catch (e) {
			error.value = e.message;
		} finally {
			loading.value = false;
		}
	}

	async function submitWaiting() {
		if (myPosition.value > 0) return;
		submitting.value = true;
		try {
			const patientId = await userStore.ensurePatientId();
			if (!patientId) {
				uni.showToast({
					title: '请先登录',
					icon: 'none'
				});
				return;
			}
			const res = await api.post('/api/registrations/waiting', {
				patientId,
				scheduleRecordId: scheduleRecordId.value
			});
			if (res.statusCode === 200) {
				uni.showToast({
					title: '候补成功',
					icon: 'success'
				});
				myPosition.value = res.data.position;
				waitingCount.value += 1;
			} else {
				throw new Error(res.data?.message || '候补失败');
			}
		} catch (e) {
			uni.showToast({
				title: e.message,
				icon: 'none'
			});
		} finally {
			submitting.value = false;
		}
	}
</script>

<style scoped>
	.container {
		padding: 30rpx;
		background-color: #f7f7f7;
		min-height: 100vh;
	}

	.card,
	.status-card {
		background-color: #fff;
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
	}

	.header {
		margin-bottom: 20rpx;
	}

	.title {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
	}

	.info-line {
		display: flex;
		font-size: 28rpx;
		margin-top: 15rpx;
	}

	.label {
		color: #888;
		width: 120rpx;
	}

	.value {
		color: #333;
	}

	.status-content {
		text-align: center;
		padding: 40rpx 0;
	}

	.waiting-count {
		font-size: 34rpx;
		font-weight: 500;
		display: block;
		margin-bottom: 15rpx;
	}

	.my-position {
		font-size: 30rpx;
		color: #1890ff;
	}

	.tip {
		font-size: 28rpx;
		color: #666;
	}

	.error {
		color: #e53935;
	}

	.submit-btn {
		background-color: #1890ff;
		color: #fff;
		font-size: 32rpx;
		border-radius: 50rpx;
		margin-top: 40rpx;
	}

	.submit-btn[disabled] {
		background-color: #ccc;
	}
</style>


