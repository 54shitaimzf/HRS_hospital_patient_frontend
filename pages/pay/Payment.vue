<template>
	<view class="container">
		<!-- 订单状态卡片 -->
		<view class="status-card" v-if="orderStatus">
			<view class="status-badge" :class="statusClass">
				{{ orderStatus }}
			</view>
			<view class="order-id">订单号：{{ paymentId || '-' }}</view>
		</view>

		<!-- 订单信息 -->
		<view class="info-card">
			<view class="card-title">订单信息</view>
			<view class="payment-info">
				<text class="label">医生：</text><text class="value">{{ doctorName }} <text v-if="doctorTitle">（{{ doctorTitle }}）</text></text>
			</view>
			<view class="payment-info">
				<text class="label">科室：</text><text class="value">{{ department }}</text>
			</view>
			<view class="payment-info">
				<text class="label">就诊时间：</text><text class="value">{{ scheduleDate ? `${scheduleDate} ${timePeriod}` : formatTime(time) }}</text>
			</view>
		</view>

		<!-- 费用信息 -->
		<view class="info-card">
			<view class="card-title">费用详情</view>

			<!-- 新增：逐项费用列表（与 feepreview 一致的展示形式，但不折叠） -->
			<view v-if="feeItems && feeItems.length" class="fee-list">
				<view v-for="(item, idx) in feeItems" :key="item.code || idx" class="payment-info">
					<text class="label">{{ item.name || item.title || '项目' }}</text>
					<text class="value">¥{{ formatAmount(item.amount) }}</text>
				</view>
			</view>
			<view v-else class="payment-info">
				<text class="label">费用明细：</text>
				<text class="value">-</text>
			</view>

			<!-- 明确显示挂号费（后端字段 registrationFee） -->
			<view class="payment-info">
				<text class="label">挂号费：</text>
				<text class="value">¥{{ formatAmount(displayOriFee) }}</text>
			</view>

			<!-- 原价（若有优惠或报销则展示） -->
			<view class="payment-info" v-if="displayOriFee > displayActualPay">
				<text class="label">原价：</text>
				<text class="value" style="text-decoration: line-through; color: #999;">¥{{ formatAmount(displayOriFee) }}</text>
			</view>

			<!-- 报销类型与比例 -->
			<view class="payment-info" v-if="displayReimburseType">
				<text class="label">报销：</text>
				<text class="value">{{ displayReimburseType }} <text v-if="displayReimbursePercent">(报销{{ displayReimbursePercentFormatted }})</text></text>
			</view>

			<!-- 报销金额 -->
			<view class="payment-info" v-if="displayReimbursedAmount !== null && displayReimbursedAmount > 0">
				<text class="label">医保报销：</text>
				<text class="value">¥{{ formatAmount(displayReimbursedAmount) }}</text>
			</view>

			<!-- 实付金额 -->
			<view class="payment-info amount-row">
				<text class="label">实付金额：</text>
				<text class="amount-value">¥{{ formatAmount(displayActualPay) }}</text>
			</view>

			<!-- 医保余额与能否支付 -->
			<view class="payment-info" v-if="medicalBalance !== null">
				<text class="label">医保余额：</text>
				<view style="display:flex; align-items:center; gap:12rpx;">
					<text class="value" :style="{ color: medicalBalance < displayActualPay ? '#ff4d4f' : '#52c41a' }">¥{{ formatAmount(medicalBalance) }}</text>
					<view class="afford-badge" :class="{ ok: canAfford, no: !canAfford }">{{ canAfford ? '余额足够' : '余额不足' }}</view>
				</view>
			</view>

			<!-- 额外说明小字 -->
			<view class="note" v-if="displayReimburseType">
				<text>注：报销金额根据政策计算，最终以医保结算为准。</text>
			</view>
		</view>

		<!-- 支付方式 -->
		<view class="payment-method" v-if="isPendingPayment">
			<text class="section-title">选择支付方式</text>
			<view class="method-options">
				<view v-for="method in payMethods" :key="method.value" class="method-option"
					:class="{ active: selectedMethod === method.value }" @click="selectPayMethod(method.value)">
					<image :src="method.icon" class="method-icon" />
					<text class="method-text">{{ method.label }}</text>
					<view class="check-icon" v-if="selectedMethod === method.value">✓</view>
				</view>
			</view>

			<!-- 医保余额提示 -->
			<view class="balance-tip" v-if="selectedMethod === 'medical' && medicalBalance !== null">
				<text class="tip-label">医保余额：</text>
				<text class="tip-value" :style="{ color: medicalBalance < displayActualPay ? '#ff4d4f' : '#52c41a' }">
					¥{{ medicalBalance.toFixed(2) }}
				</text>
			</view>
		</view>

		<!-- 支付按钮 -->
		<button class="pay-btn" @click="pay" :disabled="isPaying || !isPendingPayment">
			{{ isPaying ? '支付中...' : (isPendingPayment ? `确认支付 ¥${formatAmount(displayActualPay)}` : orderStatus) }}
		</button>

		<!-- 温馨提示 -->
		<view class="tips" v-if="isPendingPayment">
			<view class="tip-item">• 请在30分钟内完成支付，超时订单将自动取消</view>
			<view class="tip-item">• 支付成功后不可退款，请确认信息无误</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed
	} from 'vue'
	import {
		onLoad
	} from '@dcloudio/uni-app'
	import { fetchPaymentDetail, payOrder, fetchRegistrationFeePreview } from '../../utils/api'
	import { getUser } from '../../store/userUtil'

	const doctorName = ref('')
	const doctorTitle = ref('')
	const doctorId = ref('')
	const department = ref('')
	const time = ref('')
	const fee = ref(0)
	const oriFee = ref(0)
	const reimburseType = ref('')
	const reimbursePercent = ref(0)
	const reimbursedAmount = ref(null)
	const medicalBalance = ref(null)
	const canAfford = ref(true)
	const scheduleDate = ref('')
	const timePeriod = ref('')
	const feeItems = ref([])

	const isPaying = ref(false)
	const selectedMethod = ref('medical') // 默认医保支付
	const paymentId = ref('')
	const orderStatus = ref('')
	const patientId = ref('')
	const scheduleRecordId = ref('')

	const payMethods = [
		{
			label: '医保支付',
			value: 'medical',
			icon: '/static/images/medical.png'
		},
		{
			label: '微信支付',
			value: 'wechat',
			icon: '/static/images/wxlogin.png'
		}
	]

	onLoad(async (options) => {
		// 优先使用 paymentId
		paymentId.value = options.paymentId || options.orderId || options.id || ''
		scheduleRecordId.value = options.scheduleRecordId || options.scheduleId || ''
		patientId.value = options.patientId || ''

		// 如果有 paymentId，从后端加载详情
		if (paymentId.value) {
			await loadPaymentDetail()
			await loadMedicalBalance()
		} else if (patientId.value && scheduleRecordId.value) {
			// 新增场景：从挂号选择直接跳转到支付页，先预览费用
			await loadFeePreview(patientId.value, scheduleRecordId.value)
			await loadMedicalBalance()
		} else {
			// 降级：使用传递过来的参数（如果有）
			doctorName.value = options.doctorName || ''
			department.value = options.department || ''
			time.value = options.time || ''
			fee.value = Number(options.fee) || 0
			oriFee.value = Number(options.oriFee) || 0
			orderStatus.value = options.status || options.orderStatus || ''
		}
	})

	async function loadPaymentDetail() {
		try {
			uni.showLoading({ title: '加载中...' })
			const res = await fetchPaymentDetail(paymentId.value)
			const p = res.payment
			doctorName.value = p.doctorName || ''
			doctorTitle.value = p.doctorTitle || ''
			doctorId.value = p.doctorId || ''
			department.value = p.departmentName || ''
			time.value = p.payTime || ''
			fee.value = Number(p.askPayAmount) || 0
			oriFee.value = Number(p.oriAmount) || 0
			reimburseType.value = p.reimburseType || ''
			reimbursePercent.value = p.reimbursePercent || 0
			orderStatus.value = p.payStatus || ''
			patientId.value = p.patientId || ''
			scheduleRecordId.value = p.scheduleRecordId || scheduleRecordId.value || ''

			// 计算报销金额（若后端未返回）
			if (reimbursePercent.value && oriFee.value) {
				reimbursedAmount.value = +(oriFee.value * (Number(reimbursePercent.value) / 100)).toFixed(2)
			} else if (p.reimbursedAmount !== undefined) {
				reimbursedAmount.value = Number(p.reimbursedAmount)
			} else {
				reimbursedAmount.value = oriFee.value - fee.value
			}

			// 医保余额：优先从用户信息取
			try {
				const userInfo = getUser()
				if (userInfo && userInfo.medicalBalance !== undefined) {
					medicalBalance.value = Number(userInfo.medicalBalance) || 0
				}
			} catch (e) {
				console.error('获取医保余额失败:', e)
			}

			canAfford.value = medicalBalance.value === null ? true : (medicalBalance.value >= fee.value)

			// 如果后端返回了详细费用项（feeItems 或 items），填充到本地
			if (p.feeItems && Array.isArray(p.feeItems)) {
				feeItems.value = p.feeItems.map(i => ({ name: i.name || i.title || i.itemName, amount: Number(i.amount) || Number(i.price) || 0, code: i.code }))
			}
		} catch (e) {
			console.error(e)
			uni.showToast({
				title: '加载订单失败',
				icon: 'none'
			})
		} finally {
			uni.hideLoading()
		}
	}

	async function loadFeePreview(pid, schedId) {
		try {
			uni.showLoading({ title: '正在预览费用...' })
			const res = await fetchRegistrationFeePreview({ patientId: pid, scheduleRecordId: schedId })
			// 兼容多层包装
			const payload = res.feePreview ?? res.raw?.data?.data ?? res.raw?.data ?? res

			// 填充展示字段
			doctorName.value = payload.doctorName || doctorName.value
			doctorTitle.value = payload.doctorTitle || doctorTitle.value
			doctorId.value = payload.doctorId || doctorId.value
			department.value = payload.departmentName || department.value
			scheduleDate.value = payload.scheduleDate || scheduleDate.value
			timePeriod.value = payload.timePeriod || timePeriod.value
			oriFee.value = Number(payload.registrationFee) || oriFee.value || 0
			fee.value = Number(payload.actualPayAmount) || fee.value || 0
			reimburseType.value = payload.reimburseType || ''
			reimbursePercent.value = Number(payload.reimbursePercent) || 0
			reimbursedAmount.value = payload.reimbursedAmount !== undefined ? Number(payload.reimbursedAmount) : +(oriFee.value - fee.value).toFixed(2)
			medicalBalance.value = payload.medicalInsuranceBalance !== undefined ? Number(payload.medicalInsuranceBalance) : medicalBalance.value
			canAfford.value = typeof payload.canAfford === 'boolean' ? payload.canAfford : (medicalBalance.value === null ? true : (medicalBalance.value >= fee.value))
			scheduleRecordId.value = payload.scheduleRecordId || scheduleRecordId.value

			// 填充费用项（后端字段可能为 items / feeItems / feeDetail）
			const list = payload.items || payload.feeItems || payload.feeDetail || payload.feeList || []
			if (Array.isArray(list) && list.length) {
				feeItems.value = list.map(i => ({ name: i.name || i.title || i.itemName || i.feeName, amount: Number(i.amount) || Number(i.price) || Number(i.feeAmount) || 0, code: i.code || i.itemCode }))
			}
		} catch (e) {
			console.error('费用预览失败:', e)
			uni.showToast({ title: e?.message || '费用预览失败', icon: 'none' })
		} finally {
			uni.hideLoading()
		}
	}

	async function loadMedicalBalance() {
		try {
			const userInfo = getUser()
			if (userInfo && userInfo.medicalBalance !== undefined) {
				medicalBalance.value = Number(userInfo.medicalBalance) || 0
			}
		} catch (e) {
			console.error('获取医保余额失败:', e)
		}
	}

	const isPendingPayment = computed(() => orderStatus.value === '待支付' || !orderStatus.value)

	const statusClass = computed(() => {
		if (orderStatus.value === '已支付') return 'status-success'
		if (orderStatus.value === '待支付') return 'status-pending'
		if (orderStatus.value === '已取消') return 'status-cancel'
		return ''
	})

	function formatTime(t) {
		if (!t) return ''
		return t.replace('T', ' ').substring(0, 19)
	}

	function selectPayMethod(method) {
		if (method === 'wechat') {
			uni.showToast({
				title: '微信支付暂未开通',
				icon: 'none'
			})
			return
		}
		selectedMethod.value = method
	}

	const pay = async () => {
		if (isPaying.value) return
		if (!isPendingPayment.value) {
			uni.showToast({
				title: '订单状态不允许支付',
				icon: 'none'
			})
			return
		}

		if (!paymentId.value) {
			uni.showToast({
				title: '订单ID缺失，无法支付',
				icon: 'none'
			})
			return
		}

		// 检查医保余额
		if (selectedMethod.value === 'medical' && medicalBalance.value !== null) {
			if (medicalBalance.value < displayActualPay.value) {
				uni.showModal({
					title: '余额不足',
					content: `您的医保余额为 ¥${(medicalBalance.value ?? 0).toFixed(2)}，不足以支付 ¥${(displayActualPay.value ?? 0).toFixed(2)}`,
					showCancel: false
				})
				return
			}
		}

		uni.showModal({
			title: '确认支付',
			content: `确认使用${selectedMethod.value === 'medical' ? '医保' : '微信'}支付 ¥${(displayActualPay.value ?? 0).toFixed(2)} 吗？`,
			success: async (res) => {
				if (res.confirm) {
					await performPayment()
				}
			}
		})
	}

	async function performPayment() {
		isPaying.value = true

		if (selectedMethod.value === 'medical') {
			try {
				// 调用支付接口
				const payResult = await payOrder(paymentId.value)

				// 验证支付是否真的成功
				if (!payResult || !payResult.payment) {
					throw new Error('支付返回数据异常')
				}

				// 重新加载订单详情确认状态
				await loadPaymentDetail()

				// 验证订单状态是否已更新为"已支付"
				if (orderStatus.value !== '已支付') {
					console.error('支付后订单状态异常:', orderStatus.value)
					uni.showModal({
						title: '状态异常',
						content: '支付可能未成功，订单状态未更新。请刷新页面或联系客服。',
						showCancel: false
					})
					return
				}

				// 更新医保余额（本地显示）
				if (medicalBalance.value !== null) {
					medicalBalance.value -= fee.value
				}

				// api.js 已经显示了"支付成功"提示，这里不再重复
				// 延迟跳转，让用户看到状态更新
				setTimeout(() => {
					uni.redirectTo({
						url: '/pages/me/RegistrationList'
					})
				}, 1500)
			} catch (e) {
				// 错误已在 api.js 中处理提示
				console.error('支付失败:', e)
			} finally {
				isPaying.value = false
			}
		} else if (selectedMethod.value === 'wechat') {
			uni.showToast({
				title: '微信支付暂未开通，请使用医保支付',
				icon: 'none'
			})
			isPaying.value = false
		}
	}

	// 计算展示字段的 getter
	const displayOriFee = computed(() => Number(oriFee.value || 0))
	const displayActualPay = computed(() => Number(fee.value || 0))
	const displayReimburseType = computed(() => reimburseType.value || '')
	const displayReimbursePercent = computed(() => reimbursePercent.value || 0)
	const displayReimbursedAmount = computed(() => reimbursedAmount.value !== null ? Number(reimbursedAmount.value) : null)
	const displayReimbursePercentFormatted = computed(() => {
		const v = Number(displayReimbursePercent.value || 0)
		if (isNaN(v) || v === 0) return ''
		// 保持整数时不显示小数，其他保留最多2位
		return `${(Number.isInteger(v) ? v : v.toFixed(2))}%`
	})

	// 金额格式化工具
	function formatAmount(a) {
		const n = Number(a || 0)
		return isNaN(n) ? '0.00' : n.toFixed(2)
	}

</script>

<style scoped>
	.container {
		padding: 30rpx;
		background: linear-gradient(to bottom, #e6f7ff, #f0f5ff);
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		gap: 24rpx;
		box-sizing: border-box;
		font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
	}

	/* 订单状态卡片 */
	.status-card {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 20rpx;
		padding: 30rpx;
		color: #fff;
		box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.3);
	}

	.status-badge {
		display: inline-block;
		padding: 10rpx 24rpx;
		border-radius: 30rpx;
		font-size: 28rpx;
		font-weight: bold;
		margin-bottom: 16rpx;
	}

	.status-success {
		background: rgba(82, 196, 26, 0.9);
	}

	.status-pending {
		background: rgba(250, 173, 20, 0.9);
	}

	.status-cancel {
		background: rgba(255, 77, 79, 0.9);
	}

	.order-id {
		font-size: 24rpx;
		opacity: 0.9;
	}

	/* 信息卡片 */
	.info-card {
		background-color: #ffffff;
		border-radius: 20rpx;
		padding: 30rpx;
		box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.06);
	}

	.card-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 20rpx;
		padding-bottom: 16rpx;
		border-bottom: 2rpx solid #f0f0f0;
	}

	.payment-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16rpx 0;
		font-size: 28rpx;
		color: #1f2d3d;
	}

	.payment-info + .payment-info {
		border-top: 1rpx solid #f5f5f5;
	}

	.label {
		font-weight: 500;
		color: #666;
	}

	.value {
		max-width: 65%;
		text-align: right;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: #333;
	}

	.amount-row {
		margin-top: 10rpx;
		padding-top: 20rpx !important;
		border-top: 2rpx solid #f0f0f0 !important;
	}

	.amount-value {
		font-size: 36rpx;
		font-weight: bold;
		color: #ff4d4f;
	}

	.afford-badge {
		padding: 6rpx 14rpx;
		border-radius: 12rpx;
		font-size: 24rpx;
		color: #fff;
	}

	.afford-badge.ok { background: #52c41a; }
	.afford-badge.no { background: #ff4d4f; }

	/* 费用列表样式 */
	.fee-list { margin-bottom: 6rpx; }

	/* 支付方式 */
	.payment-method {
		background-color: #ffffff;
		border-radius: 20rpx;
		padding: 30rpx;
		box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.06);
	}

	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 20rpx;
	}

	.method-options {
		display: flex;
		gap: 20rpx;
		margin-bottom: 20rpx;
	}

	.method-option {
		flex: 1;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background-color: #fafafa;
		border: 2rpx solid #e0e0e0;
		border-radius: 16rpx;
		padding: 30rpx 20rpx;
		transition: all 0.3s ease;
		cursor: pointer;
	}

	.method-option.active {
		background-color: #e6f7ff;
		border-color: #1890ff;
		box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.2);
	}

	.method-icon {
		width: 56rpx;
		height: 56rpx;
		margin-bottom: 12rpx;
	}

	.method-text {
		font-size: 26rpx;
		color: #333;
		font-weight: 500;
	}

	.check-icon {
		position: absolute;
		top: 8rpx;
		right: 8rpx;
		width: 36rpx;
		height: 36rpx;
		background: #1890ff;
		color: #fff;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24rpx;
		font-weight: bold;
	}

	/* 医保余额提示 */
	.balance-tip {
		background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
		padding: 20rpx 24rpx;
		border-radius: 12rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-left: 4rpx solid #1890ff;
	}

	.tip-label {
		font-size: 26rpx;
		color: #666;
	}

	.tip-value {
		font-size: 30rpx;
		font-weight: bold;
	}

	/* 支付按钮 */
	.pay-btn {
		width: 100%;
		background: linear-gradient(90deg, #40a9ff, #1890ff);
		color: white;
		font-size: 34rpx;
		padding: 30rpx 0;
		border-radius: 50rpx;
		font-weight: bold;
		border: none;
		text-align: center;
		box-shadow: 0 8rpx 20rpx rgba(24, 144, 255, 0.4);
		transition: all 0.3s ease;
		margin-top: 10rpx;
	}

	.pay-btn:active {
		transform: scale(0.98);
		box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.3);
	}

	.pay-btn:disabled {
		background: linear-gradient(90deg, #d9d9d9, #bfbfbf);
		color: #f5f5f5;
		box-shadow: none;
		transform: none;
		cursor: not-allowed;
	}

	/* 温馨提示 */
	.tips {
		background-color: #fffbe6;
		border-radius: 16rpx;
		padding: 24rpx;
		border: 1rpx solid #ffe58f;
	}

	.tip-item {
		font-size: 24rpx;
		color: #8c8c8c;
		line-height: 38rpx;
		margin-bottom: 8rpx;
	}

	.tip-item:last-child {
		margin-bottom: 0;
	}

	.note {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: #999;
	}

</style>
