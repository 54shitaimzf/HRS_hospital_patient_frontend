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

		<!-- Help button in corner -->
		<button class="help-btn" @click="openRules">?</button>

		<!-- Rules modal -->
		<view v-if="rulesModalVisible" class="rules-overlay">
			<view class="rules-modal">
				<view class="modal-header">
					<text class="modal-title">候补规则</text>
					<button class="modal-close" @click="closeRules">关闭</button>
				</view>
				<view class="modal-body">
					<view v-if="rulesLoading" class="modal-loading">加载中...</view>
					<view v-else-if="rulesError" class="modal-error">
						<text>{{ rulesError }}</text>
						<button size="mini" @click="fetchAndShowRules">重试</button>
					</view>
					<view v-else class="rules-list">
						<view v-if="!rules.length" class="no-rules">未找到规则信息</view>
						<view v-for="(r, idx) in rules" :key="r.ruleName || idx" class="rule-item">
							<text class="rule-name">{{ r.description || r.ruleName }}</text>
							<text class="rule-value">{{ r.ruleValue }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>

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
		fetchWaitingQueue,
		createWaitingRegistration,
		fetchRegistrationDoctors,
		fetchWaitingRules
	} from '../../utils/api.js';

	const userStore = useUserStore();


	const scheduleRecordId = ref('');
	const departmentId = ref('');
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

	// 候补规则相关状态
	const rules = ref([]);
	const rulesLoading = ref(false);
	const rulesError = ref('');
	const rulesModalVisible = ref(false);

	onLoad(async (options) => {
		scheduleRecordId.value = options.scheduleRecordId || '';
		departmentId.value = options.deptId || options.departmentId || '';
		departmentName.value = decodeURIComponent(options.departmentName || '');
		doctorName.value = decodeURIComponent(options.doctorName || '');
		doctorTitle.value = decodeURIComponent(options.doctorTitle || '');
		scheduleDate.value = options.scheduleDate || '';
		timePeriodName.value = decodeURIComponent(options.timePeriodName || '');
		registrationFee.value = options.registrationFee || 0;

		uni.setNavigationBarTitle({
			title: '候补挂号'
		});

		// 预取候补规则，出错不影响页面主流程
		fetchWaitingRules().then(res => {
			rules.value = res.list || [];
		}).catch(() => {});

		// 如果 timePeriodName 未传入或为 undefined，则回退去获取排班详情
		try {
			if (!timePeriodName.value && scheduleRecordId.value) {
				// 尝试通过部门 + 日期 拉取当天排班并匹配 scheduleRecordId
				await fetchScheduleDetailFallback();
			}
		} finally {
			fetchWaitingInfo();
		}
	});

	async function fetchScheduleDetailFallback() {
		// 优先使用 scheduleDate & departmentId; 如果没有 departmentId，无法精确限制查询，将尽量查当天全部返回并匹配
		if (!scheduleDate.value || !scheduleRecordId.value) return;
		let dept = departmentId.value;
		// if dept not provided, leave it empty and the API may still accept departmentId as empty string
		try {
			const { list = [] } = await fetchRegistrationDoctors({ departmentId: dept || '', date: scheduleDate.value });
			// list 中应包含 scheduleRecordId、timePeriodName、doctorName、doctorTitle、registrationFee 等
			const matched = (Array.isArray(list) ? list : []).flatMap(doc => (doc.schedules || []).map(s => ({ ...s, doctorName: doc.doctorName || doc.name, doctorTitle: doc.doctorTitle || doc.title }))).find(s => s.scheduleRecordId === scheduleRecordId.value || s.scheduleId === scheduleRecordId.value);
			if (matched) {
				// fill missing fields
				timePeriodName.value = timePeriodName.value || matched.timePeriodName || matched.periodName || matched.period || '';
				doctorName.value = doctorName.value || matched.doctorName || '';
				doctorTitle.value = doctorTitle.value || matched.doctorTitle || '';
				registrationFee.value = registrationFee.value || matched.registrationFee || matched.fee || 0;
				if (!departmentName.value && matched.departmentName) departmentName.value = matched.departmentName;
			}
		} catch (err) {
			// 忽略错误，继续让 fetchWaitingInfo 处理错误显示
			console.warn('fetchScheduleDetailFallback failed', err);
		}
	}

	async function fetchWaitingInfo() {
		loading.value = true;
		error.value = '';
		try {
			const {
				waitingList = [],
				waitingCount: count = 0
			} = await fetchWaitingQueue({
				scheduleRecordId: scheduleRecordId.value
			});
			waitingCount.value = count;
			const patientId = userStore.patientId;
			if (patientId) {
				const me = waitingList.find(p => p.patientId === patientId);
				if (me) {
					myPosition.value = me.position || me.waitingPosition || 0;
				}
			}
		} catch (e) {
			error.value = e?.message || '查询失败';
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
			const {
				waiting
			} = await createWaitingRegistration({
				patientId,
				scheduleRecordId: scheduleRecordId.value
			});
			const position = waiting?.position || waiting?.waitingPosition || 0;
			if (position > 0) {
				myPosition.value = position;
			}
			waitingCount.value += 1;
		} catch (e) {
			uni.showToast({
				title: e?.message || '候补失败',
				icon: 'none'
			});
		} finally {
			submitting.value = false;
		}
	}

	// 打开规则弹窗：如果尚未加载，先请求
	async function openRules() {
		rulesModalVisible.value = true;
		if (rules.value && rules.value.length) return; // 已有数据
		await fetchAndShowRules();
	}

	function closeRules() {
		rulesModalVisible.value = false;
	}

	async function fetchAndShowRules() {
		rulesLoading.value = true;
		rulesError.value = '';
		try {
			const res = await fetchWaitingRules();
			rules.value = res.list || [];
		} catch (err) {
			rulesError.value = err?.message || '获取候补规则失败';
		} finally {
			rulesLoading.value = false;
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

	/* Help button */
	.help-btn {
		position: fixed;
		right: 40rpx; /* 向内偏移一点（从30rpx调整为40rpx） */
		top: 40rpx; /* 向内偏移一点 */
		width: 52rpx; /* 外圈小一点（从64rpx缩小到52rpx） */
		height: 52rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 26rpx;
		background-color: transparent; /* 中间透明 */
		border: 2rpx solid #1890ff; /* 边框稍细 */
		color: #1890ff; /* 蓝色问号 */
		font-size: 32rpx; /* 问号略小以适配新尺寸 */
		text-align: center;
		z-index: 9999;
		box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.05);
	}

	/* Modal overlay */
	.rules-overlay {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: rgba(0,0,0,0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
	}

	.rules-modal {
		position: relative; /* 使关闭按钮可绝对定位在右上角 */
		width: 680rpx;
		max-height: 900rpx;
		background: #fff;
		border-radius: 24rpx;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: center; /* 标题居中，关闭按钮在绝对位置 */
		align-items: center;
		padding: 24rpx 28rpx;
		border-bottom: 1rpx solid #eee;
	}

	.modal-title {
		font-size: 32rpx;
		font-weight: bold;
	}

	.modal-close {
		position: absolute;
		top: 14rpx;
		right: 14rpx;
		background: transparent;
		border: none;
		color: #e53935; /* 红色标出 */
		font-size: 24rpx; /* 略微减小字号 */
		padding: 4rpx 8rpx; /* 略微减小高度 */
	}

	.modal-body {
		padding: 20rpx 24rpx;
		max-height: 740rpx;
		overflow-y: auto;
	}

	.rule-item {
		display: flex;
		justify-content: space-between;
		padding: 18rpx 0;
		border-bottom: 1rpx dashed #f0f0f0;
	}

	.rule-name {
		color: #333;
		font-size: 28rpx;
	}

	.rule-value {
		color: #1890ff;
		font-size: 28rpx;
	}

	.no-rules,
	.modal-loading,
	.modal-error {
		text-align: center;
		color: #666;
		padding: 40rpx 0;
	}
</style>
