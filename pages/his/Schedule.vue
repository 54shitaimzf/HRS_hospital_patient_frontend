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
					<!-- 头像已移除，直接展示卡片主体 -->
					<view class="card-body">
						<view class="doctor-info" @click="showDoctorDetail(item)">
							<text class="doctor-name">{{ item.doctorName }}</text>
							<text class="doctor-title">{{ item.doctorTitle }}</text>
							<view class="meta-row">
								<text class="dept-name">{{ departmentName }}</text>
								<text v-if="item.clinicName" class="clinic-name"> | {{ item.clinicName }}</text>
							</view>
						</view>

						<view class="badge-row">
							<view class="badge time-badge">
								<uni-icons type="time" size="14" color="#fff" />
								<text class="badge-text">{{ item.clinicName ? item.clinicName : (item.clinicId ? ('诊室: ' + item.clinicId) : item.timePeriodName) }}</text>
							</view>
							<view class="badge fee-badge">
								<text class="badge-text">¥{{ item.registrationFee }}</text>
							</view>
							<view class="badge remain-badge" :class="{ none: item.leftSourceCount === 0 }">
								<text class="badge-text">剩 {{ item.leftSourceCount }}</text>
							</view>
						</view>

						<view class="schedule-time-text">
							<text>{{ item.startTime }} - {{ item.endTime }}</text>
						</view>
					</view>
					<view class="card-actions">
						<button :class="['action-btn', actionClass(item)]" @click="handleAction(item)">{{ actionLabel(item) }}</button>
					</view>
				</view>
			</view>
		</scroll-view>

		<!-- 中央浮窗：医生详情（已移除排班列表） -->
		<view v-if="showDoctorModal" class="modal-overlay" @click.self="closeDoctorModal">
			<view class="modal-sheet" :class="{ open: showDoctorModal }">
				<view class="modal-header">
					<text class="modal-name">{{ modalDoctor.name || modalDoctor.doctorName || '医生' }}</text>
					<text class="modal-title">{{ modalDoctor.title || modalDoctor.doctorTitle || '' }}</text>
					<text class="modal-clinic" v-if="modalDoctor.clinicName">{{ modalDoctor.clinicName }}</text>
					<view class="modal-divider"></view>
				</view>

				<view class="modal-body">
					<view class="section">
						<view class="section-title">专长</view>
						<view class="section-body"><text>{{ modalDoctor.specialty || '暂无' }}</text></view>
					</view>
					<view class="section">
						<view class="section-title">简介</view>
						<view class="section-body"><text>{{ modalDoctor.details || '暂无' }}</text></view>
					</view>
					<!-- 已移除：该医生的排班展示 -->

					<!-- 底部红色胶囊形关闭按钮 -->
					<view class="modal-footer">
						<button class="modal-close-btn" @click="closeDoctorModal">关闭</button>
					</view>
				</view>
			</view>
		</view>

		<!-- 隐藏占位，显式引用动态类以消除未使用样式警告 -->
		<view style="display:none;" class="__class-usage">
			<button class="btn-reserve"></button>
			<button class="btn-extra"></button>
			<button class="btn-waiting"></button>
			<view class="close-btn"></view>
		</view>

	</view>
</template>

<script setup>
	import { ref, computed } from 'vue';
	import { onLoad, onShow } from '@dcloudio/uni-app';
	import uniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'
	import { getPatientId } from '../../store/userUtil'
	import { useUserStore } from '../../store/user'
	import {
	  fetchRegistrationDoctors,
	  fetchDoctorDetail,
	  createRegistration
	} from '../../utils/api'

	const departmentId = ref('');
	const departmentName = ref('');
	const selectedDate = ref(new Date().toISOString().split('T')[0]);
	const startDate = computed(() => new Date().toISOString().split('T')[0]);
	const endDate = computed(() => { const d = new Date(); d.setDate(d.getDate()+6); return d.toISOString().split('T')[0]; });
	const doctorSchedules = ref([]);
	const loading = ref(false);
	const requestSeq = ref(0);
	const userStore = useUserStore()
	// 缓存已获取的医生详情，避免重复请求
	const doctorDetailMap = ref({});

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
			const { list } = await fetchRegistrationDoctors({
				departmentId: code || String(departmentId.value),
				date: selectedDate.value
			})
			if (seq === requestSeq.value) {
				doctorSchedules.value = Array.isArray(list) ? list : []
				// 批量获取医生详情并缓存（非阻塞的并行请求）
				const ids = [...new Set(doctorSchedules.value.map(d => d.doctorId || d.id).filter(Boolean))];
				await Promise.all(ids.map(async id => {
					if (doctorDetailMap.value[id]) return;
					try {
						const { doctor } = await fetchDoctorDetail(id);
						doctorDetailMap.value[id] = doctor || {};
					} catch (err) {
						doctorDetailMap.value[id] = {};
					}
				}));
			}
		} catch (e) {
			if (seq === requestSeq.value) uni.showToast({ title: '网络错误', icon: 'none' });
		} finally { if (seq === requestSeq.value) loading.value = false; }
	};

	const onDateChange = (e) => { selectedDate.value = e.detail.value; fetchSchedules(); };


	const scheduleRecords = computed(() => {
		return doctorSchedules.value.flatMap(doc => (doc.schedules || []).map(s => {
			const docId = doc.doctorId || doc.id;
			const info = doctorDetailMap.value[docId] || {};
			return {
				doctorId: docId,
				doctorName: doc.doctorName || doc.name,
				doctorTitle: doc.doctorTitle || doc.title,
				scheduleRecordId: s.scheduleRecordId || s.scheduleId,
				timePeriodName: s.timePeriodName || s.periodName || s.period,
				startTime: s.startTime,
				endTime: s.endTime,
				registrationFee: s.registrationFee,
				leftSourceCount: typeof s.leftSourceCount === 'number' ? s.leftSourceCount : Number(s.leftSourceCount),
				clinicName: info.clinicName || info.clinic || info.clinicId || '',
				clinicId: info.clinicId || info.clinicName || ''
			}
		}));
	});


	const showDoctorModal = ref(false);
	const modalDoctor = ref({});
	const modalLoading = ref(false);

	function closeDoctorModal() {
		showDoctorModal.value = false;
		modalDoctor.value = {};
	}

	async function showDoctorDetail(item) {
		// 打开页面内模态，优先用缓存
		if (!item || !item.doctorId) {
			uni.showToast({ title: '医生信息不完整', icon: 'none' });
			return;
		}
		const docId = item.doctorId;
		modalLoading.value = true;
		showDoctorModal.value = true;
		// 先尝试从缓存拿基本信息
		const cached = doctorDetailMap.value[docId] || {};
		modalDoctor.value = { ...cached, doctorName: item.doctorName, doctorTitle: item.doctorTitle };
		// 若缓存不完整（没有详细字段），再去拉取完整详情
		if (!cached || Object.keys(cached).length === 0) {
			try {
				const { doctor } = await fetchDoctorDetail(docId);
				modalDoctor.value = { ...(doctor || {}), doctorName: item.doctorName, doctorTitle: item.doctorTitle };
			} catch (err) {
				// 忽略单个失败，modal 仍然可用
				console.warn('fetchDoctorDetail failed in modal', err);
			}
		}
		modalLoading.value = false;
	}

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
						const { record } = await createRegistration({ patientId, scheduleRecordId: item.scheduleRecordId, confirm: true })
						if (record && record.status) {
							uni.showToast({ title: '预约成功，请支付', icon: 'success' })
							setTimeout(() => {
								uni.navigateTo({
									url: `/pages/pay/Payment?paymentId=${record.paymentId}`
								})
							}, 1000)
						} else {
							uni.showModal({
								title: '预约返回异常',
								content: '后端返回数据异常(无status或为空):\n' + JSON.stringify(record),
								showCancel: false
							})
							fetchSchedules()
						}
					} catch (err) {
						console.error('Reservation failed:', err)
						let content = err?.message || '预约失败'
						if (err?.raw?.data) {
							const rd = err.raw.data
							const backendMsg = rd.msg || rd.message || JSON.stringify(rd)
							content += `\n后端返回: ${backendMsg}`
						}
						uni.showModal({
							title: '预约失败详情',
							content: content,
							showCancel: false
						})
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
	background:linear-gradient(180deg, #fff 0%, #fbfbfb 100%);
	border:1px solid #eef2f6;
	border-radius:12px;
	box-shadow:0 6px 18px rgba(20,40,80,0.04);
	display:flex;
	flex-direction:row;
	align-items:center;
	justify-content: space-between;
}
.schedule-item:last-child { margin-bottom:0; }

.card-body { flex:1; display:flex; flex-direction:column; min-width:0; }
.doctor-info { display:flex; flex-direction:column; cursor:pointer; }
.doctor-name { font-size:16px; font-weight:700; color:#0d1733; }
.doctor-title { font-size:13px; color:#6b7280; margin-top:4px; }
.meta-row { display:flex; gap:6px; align-items:center; margin-top:4px; }
.dept-name { font-size:12px; color:#9aa0aa; }
.clinic-name { font-size:12px; color:#7b8794; }

.badge-row { display:flex; gap:8px; margin-top:8px; align-items:center; }
.badge { display:inline-flex; align-items:center; gap:6px; padding:6px 8px; border-radius:16px; color:#fff; font-size:12px; }
.time-badge { background: linear-gradient(90deg,#6a9cf8, #2a6df6); }
.fee-badge { background: linear-gradient(90deg,#ff9a7b, #ff6a00); }
.remain-badge { background: linear-gradient(90deg,#1fb77a, #0b8b5a); }
.remain-badge.none { background: linear-gradient(90deg,#d32f2f,#b71c1c); }
.badge-text { color:#fff; }

.schedule-time-text { margin-top:8px; font-size:13px; color:#333; }

.card-actions { flex-shrink:0; margin-left:12px; display:flex; flex-direction:column; gap:8px; align-items:flex-end; }
.action-btn { min-width:110px; padding: 0 12px; height:40px; line-height:40px; font-size:15px; border-radius:8px; color:#fff; border:none; }
.btn-reserve { background: linear-gradient(135deg,#1a73e8 0%,#004080 100%); }
.btn-extra { background: #6c757d; }
.btn-waiting { background: #ff7f00; }

/* 中央浮窗样式调整（确保居中显示） */
.modal-overlay { position: fixed; left:0; right:0; top:0; bottom:0; background: rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
.modal-sheet { width: 88%; max-width:720px; max-height: 84vh; background:#fff; border-radius:12px; box-shadow: 0 12px 40px rgba(10,20,40,0.18); transform: scale(.96); opacity:0; transition: transform .18s ease, opacity .18s ease; }
.modal-sheet.open { transform: scale(1); opacity:1; }
.modal-header { display:flex; flex-direction:column; align-items:center; padding:18px 16px 6px 16px; border-bottom:none; }
.modal-name { font-size:18px; font-weight:700; color:#0d1733; display:block; }
.modal-title { font-size:13px; color:#6b7280; display:block; margin-top:6px; }
.modal-clinic { font-size:12px; color:#7b8794; margin-top:6px; }
.modal-divider { width:100%; height:1px; background:#f0f0f0; margin-top:12px; }
.close-btn { display:none; }
.modal-body { padding:8px 16px 0 16px; overflow:auto; max-height: calc(86vh - 110px); }

/* 底部红色胶囊形关闭按钮：进一步减小垂直尺寸并贴近底部 */
.modal-footer { display:flex; justify-content:center; padding:0; }
.modal-close-btn { background: linear-gradient(90deg,#ef5350,#d32f2f); color:#fff; padding:0 10px; height:20px; min-height:20px; border-radius:12px; border:none; font-weight:700; font-size:12px; line-height:20px; }
.modal-close-btn:active { opacity:0.9; }

/* 小标题样式：更醒目并与内容区分开 */
.section { margin-bottom:14px; }
.section-title { font-weight:800; color:#222; font-size:15px; margin-bottom:8px; display:block; padding-bottom:6px; border-bottom:1px solid #f5f5f5; }
.section-body { color:#7a8088; line-height:1.7; padding-top:8px; }

</style>
