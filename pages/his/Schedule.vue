<template>
	<view class="container">
		<!-- 日期选择 -->
		<view class="date-selector">
			<picker mode="date" :value="selectedDate" :start="startDate" :end="endDate" @change="onDateChange">
				<view class="picker-view">
					<text class="date-text">选择日期: {{ selectedDate }}</text>
					<uni-icons type="calendar" size="20" color="#1890ff"></uni-icons>
				</view>
			</picker>
		</view>

		<!-- 排班列表 -->
		<scroll-view scroll-y="true" class="schedule-list-scroll">
			<view v-if="loading" class="loading-state"><text>加载中...</text></view>
			<view v-else-if="scheduleRecords.length === 0" class="empty-state"><text>暂无排班信息</text></view>
			<view v-else class="schedule-list">
				<view class="schedule-item" v-for="item in scheduleRecords" :key="item.scheduleRecordId">
					<view class="doctor-info" @click="showDoctorDetail(item)">
						<text class="doctor-name">{{ item.doctorName }}</text>
						<text class="doctor-title">{{ item.doctorTitle }}</text>
					</view>
					<view class="schedule-details">
						<view class="schedule-time">
							<text>{{ item.timePeriodName }}</text>
							<text>{{ item.startTime }}-{{ item.endTime }}</text>
						</view>
						<view class="schedule-extra">
							<text class="fee">费用: ¥{{ item.registrationFee }}</text>
							<text class="remain" :class="{ none: item.leftSourceCount === 0 }">剩余: {{ item.leftSourceCount }}</text>
						</view>
					</view>
					<button class="reserve-btn" :disabled="item.leftSourceCount === 0" @click="handleReservation(item)">
						{{ item.leftSourceCount > 0 ? '预约' : '候补' }}
					</button>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
	import { ref, computed } from 'vue';
	import { onLoad, onShow } from '@dcloudio/uni-app';
	import { getPatientId } from '../../store/userUtil.js';
	import { useUserStore } from '../../store/user.js'
	import { api } from '../../utils/api.js'

	const departmentId = ref('');
	const departmentName = ref('');
	const selectedDate = ref(new Date().toISOString().split('T')[0]);
	const startDate = computed(() => new Date().toISOString().split('T')[0]);
	const endDate = computed(() => { const d = new Date(); d.setDate(d.getDate()+6); return d.toISOString().split('T')[0]; });
	const doctorSchedules = ref([]);
	const loading = ref(false);
	const requestSeq = ref(0);
	const userStore = useUserStore()

	onLoad((options) => {
		// 兼容不同入口传参：deptId 可能是 departId 或 id
		const optDeptId = options.deptId || options.departId || options.id;
		departmentId.value = optDeptId;
		departmentName.value = decodeURIComponent(options.deptName || options.name || '预约挂号');
		if (!optDeptId) {
			uni.showToast({ title: '未收到科室ID参数', icon: 'none' });
		}
		uni.setNavigationBarTitle({ title: departmentName.value || '预约挂号' });
	});
	onShow(() => { fetchSchedules(); });

	// 解析科室ID为字符串编码（如 DEP013）
	function parseDepartment(raw) {
		if (!raw) return { code: '' }
		const m = String(raw).match(/(DEP)?(\d+)/i)
		if (!m) return { code: String(raw) }
		const num = String(m[2]).padStart(3, '0')
		return { code: `DEP${num}` }
	}

	const fetchSchedules = async () => {
		if (!departmentId.value || !selectedDate.value) return;
		const seq = ++requestSeq.value;
		loading.value = true;
		doctorSchedules.value = [];
		const { code } = parseDepartment(departmentId.value);
		try {
			const res = await api.get('/api/registration/doctors', {
				departmentId: code || String(departmentId.value),
				date: selectedDate.value
			});
			if (seq === requestSeq.value) {
				if (res.statusCode === 200) {
					doctorSchedules.value = res.data || [];
				} else {
					uni.showToast({ title: res.data?.message || '加载失败', icon: 'none' });
				}
			}
		} catch (e) {
			if (seq === requestSeq.value) uni.showToast({ title: '网络错误', icon: 'none' });
		} finally { if (seq === requestSeq.value) loading.value = false; }
	};

	const onDateChange = (e) => { selectedDate.value = e.detail.value; fetchSchedules(); };

	// 扁平化排班记录（清理旧字段，使用 scheduleRecordId 与 API 对齐）
	const scheduleRecords = computed(() => {
		return doctorSchedules.value.flatMap(doc => (doc.schedules || []).map(s => ({
			doctorId: doc.doctorId || doc.id,
			doctorName: doc.doctorName || doc.name,
			doctorTitle: doc.doctorTitle || doc.title,
			scheduleRecordId: s.scheduleRecordId || s.scheduleId,
			timePeriodName: s.timePeriodName || s.periodName || s.period,
			startTime: s.startTime,
			endTime: s.endTime,
			registrationFee: s.registrationFee,
			leftSourceCount: typeof s.leftSourceCount === 'number' ? s.leftSourceCount : Number(s.leftSourceCount)
		})));
	});

	// 医生详情（保留，与后端字段 doc.title 对齐）
	const showDoctorDetail = async (item) => {
		try {
			const res = await api.get(`/api/doctors/${item.doctorId}`);
			if (res.statusCode === 200) {
				const doc = res.data;
				uni.showModal({
					title: doc.name || item.doctorName,
					content: `职称: ${doc.title || item.doctorTitle}\n专长: ${doc.specialty || '暂无'}\n简介: ${doc.details || '暂无'}`,
					showCancel: false
				});
			} else {
				uni.showToast({ title: '获取医生详情失败', icon: 'none' });
			}
		} catch (e) {
			uni.showToast({ title: '网络错误', icon: 'none' });
		}
	};

	// 简化校验：仅排除包含中文或空值的情况
	function isValidCode(val) {
		return typeof val === 'string' && /^[A-Za-z0-9_-]+$/.test(val)
	}

	function handleReservation(item) {
		if (item.leftSourceCount > 0) {
			reserve(item);
		} else {
			goToWaiting(item);
		}
	}

	function goToWaiting(item) {
		const params = new URLSearchParams({
			scheduleRecordId: item.scheduleRecordId,
			departmentName: encodeURIComponent(departmentName.value),
			doctorName: encodeURIComponent(item.doctorName),
			doctorTitle: encodeURIComponent(item.doctorTitle),
			scheduleDate: selectedDate.value,
			timePeriodName: encodeURIComponent(item.timePeriodName),
			registrationFee: item.registrationFee
		}).toString();
		uni.navigateTo({
			url: `/pages/his/WaitingRegistration?${params}`
		});
	}

	async function reserve(item) {
		const pid = await userStore.ensurePatientId()
		const patientId = pid || getPatientId()
		if (!patientId || !isValidCode(patientId)) {
			uni.showModal({ title: '请先登录', content: '预约需要登录账户。是否前往登录？', success: (res) => { if (res.confirm) uni.navigateTo({ url: '/pages/login/Login' }) } })
			return
		}
		if (!isValidCode(item.scheduleRecordId)) {
			uni.showToast({ title: '排班ID异常', icon: 'none' })
			return
		}
		uni.showModal({
			title: '确认预约',
			content: `科室: ${departmentName.value}\n医生: ${item.doctorName}\n时间: ${selectedDate.value} ${item.timePeriodName} (${item.startTime}-${item.endTime})\n费用: ¥${item.registrationFee}`,
			success: async (res) => {
				if (res.confirm) {
					try {
						const response = await api.post('/api/registrations', { patientId, scheduleRecordId: item.scheduleRecordId, confirm: true })
						const apiCode = response?.data?.code
						const apiMsg = response?.data?.msg || response?.data?.message
						const apiData = response?.data?.data || response?.data
						const statusOk = response.statusCode === 200 || response.statusCode === 201 || apiCode === 200
						if (statusOk) {
							uni.showToast({ title: '预约成功', icon: 'success' })
							fetchSchedules()
						} else {
							uni.showToast({ title: apiMsg || `预约失败(${apiCode || response.statusCode})`, icon: 'none' })
						}
					} catch (err) {
						uni.showToast({ title: '网络错误，请重试', icon: 'none' })
					}
				}
			}
		})
	}
</script>

<style scoped>
/* 调整后的样式，保证“每个排班一行”清晰 */
.container { padding:16px; }
.date-selector { margin-bottom:12px; }
.picker-view { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:#f5f5f5; border-radius:8px; }
.date-text { font-size:15px; color:#333; }
.schedule-list-scroll { max-height: calc(100vh - 120px); /* 动态计算高度 */ }
.loading-state, .empty-state { display:flex; align-items:center; justify-content:center; height:100px; color:#888; }
.schedule-list { display:block; }
.schedule-item {
	width:100%;
	box-sizing:border-box;
	margin-bottom:12px;
	padding:12px;
	background:#fff;
	border:1px solid #e0e0e0;
	border-radius:8px;
	box-shadow:0 2px 6px rgba(0,0,0,0.05);
	display:flex;
	flex-direction:row;
	align-items:center;
	justify-content: space-between;
}
.schedule-item:last-child { margin-bottom:0; }

.doctor-info {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	cursor: pointer;
	width: 80px; /* 固定宽度 */
}
.doctor-name { font-size:16px; font-weight:600; color:#222; }
.doctor-title { font-size:13px; color:#666; margin-top:4px; }

.schedule-details {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 0 10px;
	min-width: 0;
}
.schedule-time {
	font-size: 14px;
	color: #333;
	font-weight: 500;
	display: flex;
	flex-direction: column;
}
.schedule-extra {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 12px;
}
.fee { color:#ff7f00; }
.remain { color:#2e7d32; }
.remain.none { color:#d32f2f; font-weight: bold; }

.reserve-btn {
	flex-shrink:0;
	width:72px;
	height:36px;
	line-height:36px;
	font-size:14px;
	padding: 0;
	margin: 0;
	background:#1890ff;
	color:#fff;
	border:none;
	border-radius:6px;
}
.reserve-btn:disabled { background:#ccc; color:#666; }
</style>
