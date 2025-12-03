<template>
	<view class="container">
		<view class="payment-info">
			<text class="label">医生：</text><text class="value">{{ doctorName }}</text>
		</view>
		<view class="payment-info">
			<text class="label">科室：</text><text class="value">{{ department }}</text>
		</view>
		<view class="payment-info">
			<text class="label">时间：</text><text class="value">{{ time }}</text>
		</view>
		<view class="payment-info">
			<text class="label">费用：</text><text class="value">{{ fee }} 元</text>
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

		<button class="pay-btn" @click="pay" :disabled="isPaying">
			{{ isPaying ? '支付中...' : '立即支付' }}
		</button>

		
		<button v-if="isPendingPayment" class="mock-pay-btn" @click="goToMockPayment">
			去支付（模拟）
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

	const doctorName = ref('')
	const department = ref('')
	const time = ref('')
	const fee = ref(0)
	const isPaying = ref(false)
	const selectedMethod = ref('wechat') // 默认微信支付
	const orderId = ref('')
	const orderStatus = ref('')

	const payMethods = [{
			label: '微信支付',
			value: 'wechat',
			icon: '/static/images/wxlogin.png'
		},
		{
			label: '医保支付',
			value: 'medical',
			icon: '/static/images/medical.png'
		}
	]

	onLoad((options) => {
		doctorName.value = options.doctorName || ''
		department.value = options.department || ''
		time.value = options.time || ''
		fee.value = Number(options.fee) || 0

		orderId.value = options.orderId || options.id || ''
		orderStatus.value = options.status || options.orderStatus || ''
	})


	const isPendingPayment = computed(() => orderStatus.value === '待支付')

	function goToMockPayment() {

		const url = `/pages/pay/MockPayment?orderId=${encodeURIComponent(orderId.value || '')}&amount=${encodeURIComponent(fee.value)}&title=${encodeURIComponent('挂号费用')}&doctorName=${encodeURIComponent(doctorName.value)}&department=${encodeURIComponent(department.value)}`
		uni.navigateTo({ url })
	}

	const pay = async () => {
		if (isPaying.value) return
		isPaying.value = true

		if (selectedMethod.value === 'wechat') {
			try {
				const res = await uni.request({
					url: '', // 替换为你的后端接口
					method: 'POST',
					data: {
						doctorName: doctorName.value,
						department: department.value,
						time: time.value,
						fee: fee.value,
						openid: '用户openid'
					},
					header: {
						'Content-Type': 'application/json'
					}
				})

				const data = res.data
				if (data.code !== 0) {
					uni.showToast({
						title: '下单失败',
						icon: 'none'
					})
					isPaying.value = false
					return
				}

				const paymentData = data.payment

				uni.requestPayment({
					provider: 'wxpay',
					timeStamp: paymentData.timeStamp,
					nonceStr: paymentData.nonceStr,
					package: paymentData.package,
					signType: 'MD5',
					paySign: paymentData.paySign,
					success: () => {
						uni.showToast({
							title: '支付成功',
							icon: 'success'
						})
						uni.navigateTo({
							url: '/pages/order/list'
						})
					},
					fail: () => {
						uni.showToast({
							title: '支付失败',
							icon: 'none'
						})
					},
					complete: () => {
						isPaying.value = false
					}
				})
			} catch (e) {
				isPaying.value = false
				uni.showToast({
					title: '请求失败',
					icon: 'none'
				})
			}
		} else if (selectedMethod.value === 'medical') {

			uni.showToast({
				title: '医保支付暂未开通',
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

	.mock-pay-btn {
		width: 100%;
		background: #fff;
		color: #1890ff;
		font-size: 32rpx;
		padding: 22rpx 0;
		border-radius: 50rpx;
		font-weight: 700;
		border: 2rpx solid #1890ff;
		text-align: center;
		margin-top: 12rpx;
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
