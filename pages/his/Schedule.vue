<template>
	<view class="container">
		<!-- 日期选择 -->
		<view class="date-selector">
			<picker mode="date" :value="selectedDate" @change="onDateChange">
				<view class="picker-view">
					<text class="date-text">选择日期: {{ selectedDate }}</text>
					<uni-icons type="calendar" size="20" color="#1890ff"></uni-icons>
				</view>
			</picker>
		</view>

		<!-- 排班表格 -->
		<scroll-view scroll-y class="schedule-scroll-view">
			<view v-if="loading" class="loading-state">
				<uni-load-more status="loading"></uni-load-more>
			</view>
			<view v-else-if="doctorSchedules.length > 0" class="schedule-grid">
				<!-- 表头 -->
				<view class="grid-header grid-row">
					<view class="grid-cell doctor-name-cell">医生</view>
					<view class="grid-cell" v-for="period in timePeriods" :key="period">{{ period }}</view>
				</view>
				<!-- 数据行 -->
				<view class="grid-row" v-for="doctor in doctorSchedules" :key="doctor.doctorId">
					<view class="grid-cell doctor-name-cell">
						<text class="doctor-name">{{ doctor.doctorName }}</text>
						<text class="doctor-title">{{ doctor.doctorTitle }}</text>
					</view>
					<view v-for="period in timePeriods" :key="period"
						:class="['grid-cell', 'slot-cell', getSlotClass(doctor, period)]"
						@click="selectSlot(doctor, period)">
						<template v-if="getScheduleForPeriod(doctor, period)">
							<text class="slot-remain">剩余 {{ getScheduleForPeriod(doctor, period).leftSourceCount }}</text>
							<text class="slot-fee">¥{{ getScheduleForPeriod(doctor, period).registrationFee }}</text>
						</template>
						<template v-else>
							<text class="no-slot">-</text>
						</template>
					</view>
				</view>
			</view>
			<view v-else class="empty-state">
				<text>暂无排班信息</text>
			</view>
		</scroll-view>

		<!-- 底部按钮 -->
		<view class="btn-wrap">
			<button class="submit-btn" @click="submit" :disabled="!selectedSlotInfo.schedule">确认挂号</button>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed
	} from 'vue';
	import {
		onLoad
	} from '@dcloudio/uni-app';

	const departmentId = ref('');
	const departmentName = ref('');
	const selectedDate = ref(new Date().toISOString().split('T')[0]);
	const doctorSchedules = ref([]);
	const loading = ref(false);
	const selectedSlotInfo = ref({
		doctor: null,
		schedule: null
	});

	onLoad((options) => {
		departmentId.value = options.deptId;
		departmentName.value = decodeURIComponent(options.deptName);
		uni.setNavigationBarTitle({
			title: departmentName.value || '预约挂号'
		});
		fetchSchedules();
	});

	const fetchSchedules = async () => {
		if (!departmentId.value || !selectedDate.value) return;
		loading.value = true;
		doctorSchedules.value = [];
		selectedSlotInfo.value = {
			doctor: null,
			schedule: null
		};
		try {
			const res = await uni.request({
				url: `http://localhost:8082/api/registration/doctors`,
				method: 'GET',
				data: {
					departmentId: departmentId.value,
					date: selectedDate.value,
				},
			});
			if (res.statusCode === 200) {
				doctorSchedules.value = res.data;
			} else {
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				});
			}
		} catch (error) {
			console.error('获取排班失败:', error);
			uni.showToast({
				title: '网络错误',
				icon: 'none'
			});
		} finally {
			loading.value = false;
		}
	};

	const onDateChange = (e) => {
		selectedDate.value = e.detail.value;
		fetchSchedules();
	};

	// 从所有排班数据中提取出不重复的时间段作为表头
	const timePeriods = computed(() => {
		const periods = new Set();
		doctorSchedules.value.forEach(doc => {
			doc.schedules.forEach(sch => periods.add(sch.timePeriodName));
		});
		return Array.from(periods);
	});

	// 根据医生和时间段查找对应的排班信息
	const getScheduleForPeriod = (doctor, period) => {
		return doctor.schedules.find(s => s.timePeriodName === period);
	};

	// 选择一个时间段
	const selectSlot = (doctor, period) => {
		const schedule = getScheduleForPeriod(doctor, period);
		if (schedule && schedule.leftSourceCount > 0) {
			selectedSlotInfo.value = {
				doctor,
				schedule
			};
		}
	};

	// 获取单元格的CSS类
	const getSlotClass = (doctor, period) => {
		const schedule = getScheduleForPeriod(doctor, period);
		if (!schedule || schedule.leftSourceCount === 0) {
			return 'disabled';
		}
		if (selectedSlotInfo.value.schedule && selectedSlotInfo.value.schedule.scheduleId === schedule.scheduleId) {
			return 'selected';
		}
		return 'available';
	};

	const submit = () => {
		if (!selectedSlotInfo.value.schedule) {
			uni.showToast({
				title: '请选择一个时间段',
				icon: 'none'
			});
			return;
		}
		const {
			doctor,
			schedule
		} = selectedSlotInfo.value;
		uni.showModal({
			title: '确认预约信息',
			content: `科室: ${departmentName.value}\n医生: ${doctor.doctorName}\n时间: ${selectedDate.value} ${schedule.timePeriodName}`,
			success: (res) => {
				if (res.confirm) {
					uni.showToast({
						title: '预约成功（模拟）',
						icon: 'success'
					});
				}
			}
		});
	};
</script>

<style scoped>
	.container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: #f5f7fa;
	}

	.date-selector {
		padding: 20rpx;
		background-color: #fff;
		border-bottom: 1rpx solid #eee;
	}

	.picker-view {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10rpx 20rpx;
		border: 1rpx solid #dcdfe6;
		border-radius: 8rpx;
	}

	.date-text {
		font-size: 30rpx;
		color: #333;
	}

	.schedule-scroll-view {
		flex: 1;
		overflow-y: auto;
	}

	.loading-state,
	.empty-state {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 400rpx;
		color: #999;
		font-size: 28rpx;
	}

	.schedule-grid {
		display: table;
		width: 100%;
		border-collapse: collapse;
		font-size: 26rpx;
	}

	.grid-row {
		display: table-row;
		background-color: #fff;
	}

	.grid-row:nth-child(even) {
		background-color: #fdfdfd;
	}

	.grid-header {
		font-weight: bold;
		background-color: #f2f6fc;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.grid-cell {
		display: table-cell;
		padding: 20rpx 10rpx;
		text-align: center;
		vertical-align: middle;
		border: 1rpx solid #e8eaec;
	}

	.doctor-name-cell {
		width: 200rpx;
		font-weight: bold;
	}

	.doctor-name {
		font-size: 30rpx;
		display: block;
	}

	.doctor-title {
		font-size: 24rpx;
		color: #888;
	}

	.slot-cell {
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.slot-cell.available:hover {
		background-color: #ecf5ff;
	}

	.slot-cell.selected {
		background-color: #409eff;
		color: #fff;
		font-weight: bold;
	}

	.slot-cell.selected .slot-fee {
		color: #fff;
	}

	.slot-cell.disabled {
		background-color: #f5f5f5;
		color: #ccc;
		cursor: not-allowed;
	}

	.slot-remain {
		display: block;
	}

	.slot-fee {
		display: block;
		color: #e6a23c;
		font-size: 24rpx;
	}

	.no-slot {
		color: #999;
	}

	.btn-wrap {
		padding: 20rpx;
		background-color: #fff;
		border-top: 1rpx solid #eee;
	}

	.submit-btn {
		background-color: #1890ff;
		color: #fff;
		border-radius: 40rpx;
		font-size: 32rpx;
	}

	.submit-btn:disabled {
		background-color: #a0cfff;
	}
</style>