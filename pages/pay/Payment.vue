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
				<text class="label">医生：</text><text class="value">{{ doctorName }}</text>
			</view>
			<view class="payment-info">
				<text class="label">科室：</text><text class="value">{{ department }}</text>
			</view>
			<view class="payment-info">
				<text class="label">时间：</text><text class="value">{{ formatTime(time) }}</text>
			</view>
		</view>

		<!-- 费用信息 -->
		<view class="info-card">
			<view class="card-title">费用详情</view>
			<view class="payment-info" v-if="oriFee > fee">
				<text class="label">原价：</text>
				<text class="value" style="text-decoration: line-through; color: #999;">¥{{ oriFee.toFixed(2) }}</text>
			</view>
			<view class="payment-info" v-if="reimburseType">
				<text class="label">报销：</text>
				<text class="value">{{ reimburseType }} (报销{{ reimbursePercent }}%)</text>
			</view>
			<view class="payment-info amount-row">
				<text class="label">实付金额：</text>
				<text class="amount-value">¥{{ fee.toFixed(2) }}</text>
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
				<text class="tip-value" :style="{ color: medicalBalance < fee ? '#ff4d4f' : '#52c41a' }">
					¥{{ medicalBalance.toFixed(2) }}
				</text>
			</view>
		</view>

		<!-- 支付按钮 -->
		<button class="pay-btn" @click="pay" :disabled="isPaying || !isPendingPayment">
			{{ isPaying ? '支付中...' : (isPendingPayment ? `确认支付 ¥${fee.toFixed(2)}` : orderStatus) }}
		</button>

		<!-- 温馨提示 -->
		<view class="tips" v-if="isPendingPayment">
			<view class="tip-item">• 请在30分钟内完成支付，超时订单将自动取消</view>
			<view class="tip-item">• 支付成功后不可退款，请确认信息无误</view>
		</view>

		<!-- 支付成功弹窗 -->
		<view v-if="showSuccessModal" class="success-modal-overlay">
			<view class="success-modal">
				<view class="success-icon">
					<uni-icons type="checkmarkempty" size="48" color="#52c41a"></uni-icons>
				</view>
				<text class="success-title">支付成功</text>
				<text class="success-desc">您已成功完成支付，可前往就诊导航查看路线</text>
				<view class="success-actions">
					<button class="action-nav" @click="goNavigation">
						<uni-icons type="navigate" size="18" color="#fff"></uni-icons>
						<text>就诊导航</text>
					</button>
					<button class="action-list" @click="goRegistrationList">
						<text>查看我的挂号</text>
					</button>
				</view>
			</view>
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
	import { fetchPaymentDetail, payOrder } from '../../utils/api.js'
	import { getUser } from '../../store/userUtil.js'

	const doctorName = ref('')
	const department = ref('')
	const time = ref('')
	const fee = ref(0)
	const oriFee = ref(0)
	const reimburseType = ref('')
	const reimbursePercent = ref(0)

	const isPaying = ref(false)
	const selectedMethod = ref('medical') // 默认医保支付
	const paymentId = ref('')
	const orderStatus = ref('')
	const medicalBalance = ref(null) // 医保余额
	const patientId = ref('')
	const registrationId = ref('') // 挂号ID，用于导航
	const showSuccessModal = ref(false) // 支付成功弹窗

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

		// 如果有 paymentId，从后端加载详情
		if (paymentId.value) {
			await loadPaymentDetail()
			await loadMedicalBalance()
		} else {
			// 降级：使用传递过来的参数（如果有）
			doctorName.value = options.doctorName || ''
			department.value = options.department || ''
			time.value = options.time || ''
			fee.value = Number(options.fee) || 0
			orderStatus.value = options.status || options.orderStatus || ''
		}
	})

	async function loadPaymentDetail() {
		try {
			uni.showLoading({ title: '加载中...' })
			const res = await fetchPaymentDetail(paymentId.value)
			const p = res.payment
			doctorName.value = p.doctorName || ''
			department.value = p.departmentName || ''
			time.value = p.payTime || ''
			fee.value = p.askPayAmount || 0
			oriFee.value = p.oriAmount || 0
			reimburseType.value = p.reimburseType || ''
			reimbursePercent.value = p.reimbursePercent || 0
			orderStatus.value = p.payStatus || ''
			patientId.value = p.patientId || ''
			registrationId.value = p.registrationId || p.scheduleRecordId || ''
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
			if (medicalBalance.value < fee.value) {
				uni.showModal({
					title: '余额不足',
					content: `您的医保余额为 ¥${medicalBalance.value.toFixed(2)}，不足以支付 ¥${fee.value.toFixed(2)}`,
					showCancel: false
				})
				return
			}
		}

		uni.showModal({
			title: '确认支付',
			content: `确认使用${selectedMethod.value === 'medical' ? '医保' : '微信'}支付 ¥${fee.value.toFixed(2)} 吗？`,
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

				// 显示支付成功弹窗
				showSuccessModal.value = true
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

	function goNavigation() {
		if (!registrationId.value) {
			uni.showToast({ title: '无法获取挂号信息', icon: 'none' })
			return
		}
		showSuccessModal.value = false
		uni.navigateTo({
			url: `/pages/navigation/Navigation?registrationId=${registrationId.value}`
		})
	}

	function goRegistrationList() {
		showSuccessModal.value = false
		uni.redirectTo({
			url: '/pages/me/RegistrationList'
		})
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

	/* 支付成功弹窗样式 */
	.success-modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1001;
		padding: 40rpx;
	}

	.success-modal {
		width: 100%;
		max-width: 580rpx;
		background: #fff;
		border-radius: 24rpx;
		padding: 50rpx 40rpx;
		text-align: center;
	}

	.success-icon {
		width: 120rpx;
		height: 120rpx;
		margin: 0 auto 24rpx;
		background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.success-title {
		display: block;
		font-size: 36rpx;
		font-weight: 700;
		color: #333;
		margin-bottom: 16rpx;
	}

	.success-desc {
		display: block;
		font-size: 26rpx;
		color: #888;
		margin-bottom: 40rpx;
		line-height: 1.5;
	}

	.success-actions {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.action-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 88rpx;
		background: linear-gradient(135deg, #4e9deb 0%, #1a73e8 100%);
		border-radius: 44rpx;
		color: #fff;
		font-size: 30rpx;
		border: none;
		font-weight: 500;
	}

	.action-nav text {
		margin-left: 10rpx;
	}

	.action-list {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 88rpx;
		background: #fff;
		border: 2rpx solid #ddd;
		border-radius: 44rpx;
		color: #666;
		font-size: 28rpx;
	}

</style>
