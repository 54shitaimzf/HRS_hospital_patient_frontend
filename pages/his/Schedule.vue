<template>
	<view class="container">
		
		<view class="date-selector">
			<picker mode="date" :value="selectedDate" :start="startDate" :end="endDate" @change="onDateChange">
				<view class="picker-view">
					<text class="date-text">选择日期: {{ selectedDate }}</text>
					<uni-icons type="calendar" size="20" color="#1890ff"></uni-icons>
				</view>
			</picker>
		</view>

		
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
					<view class="actions">
						
						<button :class="['action-btn', actionClass(item)]" @click="handleAction(item)">
							{{ actionLabel(item) }}
						</button>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
	import { ref, computed } from 'vue';
	import { onLoad, onShow } from '@dcloudio/uni-app';
	import uniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'
	import { getPatientId } from '../../store/userUtil'
	import { useUserStore } from '../../store/user'
	import { api } from '../../utils/api'

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

		const optDeptId = options.deptId || options.departId || options.id;
		departmentId.value = optDeptId;
		departmentName.value = decodeURIComponent(options.deptName || options.name || '预约挂号');
		if (!optDeptId) {
			uni.showToast({ title: '未收到科室ID参数', icon: 'none' });
		}
		uni.setNavigationBarTitle({ title: departmentName.value || '预约挂号' });
	});
	onShow(() => { fetchSchedules(); });


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


	function isValidCode(val) {
		return typeof val === 'string' && /^[A-Za-z0-9_-]+$/.test(val)
	}

	function actionLabel(item) {

		const today = new Date().toISOString().split('T')[0]
		if (Number(item.leftSourceCount) > 0) return '预约'
		if (selectedDate.value === today && Number(item.leftSourceCount) === 0) return '加号'
		return '候补'
	}

	function actionClass(item) {

		const label = actionLabel(item)
		if (label === '预约') return 'btn-reserve'
		if (label === '加号') return 'btn-extra'
		return 'btn-waiting'
	}

	function handleAction(item) {
		const today = new Date().toISOString().split('T')[0]
		if (item.leftSourceCount > 0) {
			reserve(item)
			return
		}
		if (selectedDate.value === today && Number(item.leftSourceCount) === 0) {

			goExtraApply(item)
			return
		}

		goToWaiting(item)
	}

	function goToWaiting(item) {
		const params = [
			`scheduleRecordId=${item.scheduleRecordId}`,
			`departmentName=${encodeURIComponent(departmentName.value)}`,
			`doctorName=${encodeURIComponent(item.doctorName)}`,
			`doctorTitle=${encodeURIComponent(item.doctorTitle)}`,
			`scheduleDate=${selectedDate.value}`,
			`timePeriodName=${encodeURIComponent(item.timePeriodName)}`,
			`registrationFee=${item.registrationFee}`
		].join('&');
		uni.navigateTo({
			url: `/pages/his/WaitingRegistration?${params}`
		});
	}


	function goExtraApply(item) {
		const params = [
			`deptId=${encodeURIComponent(departmentId.value || '')}`,
			`deptName=${encodeURIComponent(departmentName.value || '')}`,
			`doctorId=${encodeURIComponent(item.doctorId || '')}`,
			`doctorName=${encodeURIComponent(item.doctorName || '')}`,
			`scheduleDate=${encodeURIComponent(selectedDate.value)}`
		].join('&');
		uni.navigateTo({ url: `/pages/his/ExtraApply?${params}` });
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

.container { padding:16px; }
.date-selector { margin-bottom:12px; }
.picker-view { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:#f5f5f5; border-radius:8px; }
.date-text { font-size:15px; color:#333; }
.schedule-list-scroll { max-height: calc(100vh - 120px);  }
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
	width: 80px; 
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


.actions {
	display:flex;
	flex-direction:column;
	gap:8px;
	flex-shrink:0;
	align-items:flex-end;
}
.action-btn {
	min-width:110px;
	padding: 0 12px;
	height:44px;
	line-height:44px;
	font-size:16px;
	padding-left:18px;
	padding-right:18px;
	margin: 0;
	border:none;
	border-radius:8px;
	color:#fff;
	cursor:pointer;
	display:inline-block;
	text-align:center;
}
.btn-reserve { background: linear-gradient(135deg,#1a73e8 0%,#004080 100%); }
.btn-extra { background: #6c757d; }
.btn-waiting { background: #ff7f00; }
.reserve-btn:disabled { background:#ccc; color:#666; }
</style>

