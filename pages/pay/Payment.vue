<template>
	<view class="container">
		<view class="payment-info">
			<text class="label">医生：</text><text class="value">{{ doctorName }}</text>
		</view>
		<view class="payment-info">
			<text class="label">科室：</text><text class="value">{{ department }}</text>
		</view>
		<view class="payment-info">
			<text class="label">时间：</text><text class="value">{{ formatTime(time) }}</text>
		</view>
		<view class="payment-info" v-if="oriFee > fee">
			<text class="label">原价：</text><text class="value" style="text-decoration: line-through; color: #999;">{{ oriFee }} 元</text>
		</view>
		<view class="payment-info" v-if="reimburseType">
			<text class="label">报销：</text><text class="value">{{ reimburseType }} (报销{{ reimbursePercent }}%)</text>
		</view>
		<view class="payment-info">
			<text class="label">实付：</text><text class="value" style="color: #ff4d4f; font-weight: bold;">{{ fee }} 元</text>
		</view>

		<view class="payment-method">
			<text class="label">支付方式：</text>
			<view class="method-options">
				<view v-for="method in payMethods" :key="method.value" class="method-option"
					:class="{ active: selectedMethod === method.value }" @click="selectedMethod = method.value">
					<image :src="method.icon" class="method-icon" />
					<text class="method-text">{{ method.label }}</text>
				</view>
			</view>
		</view>

		<button class="pay-btn" @click="pay" :disabled="isPaying || !isPendingPayment">
			{{ isPaying ? '支付中...' : (isPendingPayment ? '立即支付' : orderStatus) }}
		</button>
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
		} else {
			// 降���：使用传递过来的参数（如果有）
			doctorName.value = options.doctorName || ''
			department.value = options.department || ''
			time.value = options.time || ''
			fee.value = Number(options.fee) || 0
			orderStatus.value = options.status || options.orderStatus || ''
		}
	})

	async function loadPaymentDetail() {
		try {
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
		} catch (e) {
			console.error(e)
		}
	}

	const isPendingPayment = computed(() => orderStatus.value === '待支付' || !orderStatus.value)

	function formatTime(t) {
		if (!t) return ''
		return t.replace('T', ' ').substring(0, 19)
	}

	const pay = async () => {
		if (isPaying.value) return
		if (!isPendingPayment.value) return

		isPaying.value = true

		if (selectedMethod.value === 'medical') {
			try {
				await payOrder(paymentId.value)
				// 支付成功
				uni.showToast({
					title: '支付成功',
					icon: 'success'
				})
				orderStatus.value = '已支付'
				setTimeout(() => {
					// 跳转到挂号列表
					uni.redirectTo({
						url: '/pages/me/RegistrationList'
					})
				}, 1500)
			} catch (e) {
				// 错误已在 api.js 中处理提示
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
</script>

<style scoped>
	.container {
		padding: 40rpx;
		background: linear-gradient(to bottom, #e6f7ff, #f0f5ff);
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		gap: 30rpx;
		box-sizing: border-box;
		font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
	}

	.payment-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24rpx 32rpx;
		background-color: #ffffff;
		border-radius: 24rpx;
		box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.06);
		font-size: 30rpx;
		color: #1f2d3d;
	}

	.label {
		font-weight: bold;
		color: #1677ff;
	}

	.value {
		max-width: 65%;
		text-align: right;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: #333;
	}

	.pay-btn {
		width: 100%;
		background: linear-gradient(90deg, #40a9ff, #1890ff);
		color: white;
		font-size: 34rpx;
		padding: 28rpx 0;
		border-radius: 50rpx;
		font-weight: bold;
		border: none;
		text-align: center;
		box-shadow: 0 8rpx 20rpx rgba(24, 144, 255, 0.4);
		transition: transform 0.2s ease;
	}

	.pay-btn:active {
		transform: scale(0.98);
	}

	.pay-btn:disabled {
		background: #bcdfff;
		color: #f5f5f5;
		box-shadow: none;
		transform: none;
		cursor: not-allowed;
	}

	.payment-method {
		margin-top: 20rpx;
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.method-options {
		display: flex;
		justify-content: space-between;
		margin-top: 10rpx;
	}

	.method-option {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background-color: #fff;
		border: 2rpx solid #ccc;
		border-radius: 24rpx;
		padding: 20rpx;
		transition: border-color 0.2s, box-shadow 0.2s;
		box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.04);
		margin-right: 20rpx;
	}

	.method-option:last-child {
		margin-right: 0;
	}

	.method-option.active {
		border-color: #1890ff;
		box-shadow: 0 6rpx 18rpx rgba(24, 144, 255, 0.2);
	}

	.method-icon {
		width: 60rpx;
		height: 60rpx;
		margin-bottom: 10rpx;
	}

	.method-text {
		font-size: 28rpx;
		color: #333;
	}

</style>
