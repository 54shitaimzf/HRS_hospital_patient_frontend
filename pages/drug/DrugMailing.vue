<template>
	<view class="container">
		<view class="banner">
			<text class="banner-title">💊 药品邮寄服务</text>
		</view>

		<view class="card">
			<text class="card-title">选择药品</text>
			<view class="medicine-list">
				<view v-for="(item, index) in medicines" :key="index" class="medicine-item"
					:class="{ selected: selectedMedicine === item.id }" @click="selectMedicine(item.id)">
					<text>{{ item.name }} - {{ item.spec }}</text>
					<text class="price">¥{{ item.price.toFixed(2) }}</text>
				</view>
			</view>
		</view>

		<view class="card">
			<text class="card-title">📦 运费说明</text>
			<text class="card-content">
				所有订单统一收取运费 ¥8.00，满 ¥88 包邮。药品将在24小时内由合作物流发出，支持全国配送。
			</text>
		</view>

		<view class="card">
			<text class="card-title">收件人信息</text>
			<view class="form-item">
				<text>姓名</text>
				<input v-model="name" placeholder="请输入收件人姓名" />
			</view>
			<view class="form-item">
				<text>电话</text>
				<input v-model="phone" type="number" placeholder="请输入联系电话" />
			</view>
			<view class="form-item">
				<text>收货地址</text>
				<input v-model="address" placeholder="请输入详细收货地址" />
			</view>
		</view>

		<view class="card">
			<text class="card-title">支付方式</text>
			<view class="pay-methods">
				<view v-for="(method, idx) in payMethods" :key="idx" class="pay-item"
					:class="{ active: selectedPayMethod === method.id }" @click="selectPayMethod(method.id)">
					<text>{{ method.name }}</text>
				</view>
			</view>
		</view>

		<button class="main-btn" @click="submitOrder">确认邮寄</button>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue'

	const name = ref('')
	const phone = ref('')
	const address = ref('')

	const medicines = [{
			id: 1,
			name: '感冒灵颗粒',
			spec: '10袋/盒',
			price: 25.5
		},
		{
			id: 2,
			name: '布洛芬胶囊',
			spec: '24粒/瓶',
			price: 38.8
		},
		{
			id: 3,
			name: '维生素C片',
			spec: '100片/瓶',
			price: 18.0
		},
	]

	const payMethods = [{
			id: 1,
			name: '微信支付'
		},
		{
			id: 2,
			name: '支付宝'
		},
		{
			id: 3,
			name: '银行卡支付'
		},
	]

	const selectedMedicine = ref(null)
	const selectedPayMethod = ref(null)

	const selectMedicine = (id) => {
		selectedMedicine.value = id
	}

	const selectPayMethod = (id) => {
		selectedPayMethod.value = id
	}

	const submitOrder = () => {
		if (!selectedMedicine.value) {
			uni.showToast({
				title: '请选择药品',
				icon: 'none'
			})
			return
		}
		if (!name.value.trim()) {
			uni.showToast({
				title: '请输入收件人姓名',
				icon: 'none'
			})
			return
		}
		if (!phone.value.trim()) {
			uni.showToast({
				title: '请输入联系电话',
				icon: 'none'
			})
			return
		}
		if (!address.value.trim()) {
			uni.showToast({
				title: '请输入收货地址',
				icon: 'none'
			})
			return
		}
		if (!selectedPayMethod.value) {
			uni.showToast({
				title: '请选择支付方式',
				icon: 'none'
			})
			return
		}
		uni.showToast({
			title: '订单提交成功',
			icon: 'success'
		})
	}
</script>

<style scoped>
	.container {
		padding: 40rpx;
		background-color: #f5f7fa;
		min-height: 100vh;
		box-sizing: border-box;
	}

	.banner {
		background: linear-gradient(135deg, #42a5f5, #478ed1);
		border-radius: 24rpx;
		padding: 40rpx 30rpx;
		margin-bottom: 40rpx;
		box-shadow: 0 8rpx 16rpx rgba(66, 165, 245, 0.3);
	}

	.banner-title {
		color: white;
		font-size: 36rpx;
		font-weight: bold;
		text-align: center;
	}

	.card {
		background-color: white;
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.05);
	}

	.card-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 20rpx;
		display: block;
	}

	.card-content {
		font-size: 28rpx;
		color: #666;
		line-height: 1.6;
	}

	.medicine-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.medicine-item {
		display: flex;
		justify-content: space-between;
		padding: 20rpx;
		border: 1rpx solid #d8d8d8;
		border-radius: 16rpx;
		font-size: 28rpx;
		color: #555;
		user-select: none;
		transition: all 0.3s ease;
	}

	.medicine-item.selected {
		background: linear-gradient(90deg, #36d1dc, #5b86e5);
		color: white;
		border-color: #5b86e5;
		box-shadow: 0 6rpx 12rpx rgba(54, 209, 220, 0.5);
	}

	.form-item {
		margin-bottom: 20rpx;
	}

	.form-item text {
		display: block;
		margin-bottom: 10rpx;
		font-size: 30rpx;
	}

	.form-item input {
		width: 100%;
		height: 100rpx;
		padding: 0 24rpx; 
		
		font-size: 28rpx;
		border: 1rpx solid #d8d8d8;
		border-radius: 16rpx;
		box-sizing: border-box;
		outline: none;
		color: #333;
	}

	.form-item input:focus {
		border-color: #5b86e5;
		box-shadow: 0 0 8rpx #5b86e5;
	}

	.pay-methods {
		display: flex;
		gap: 20rpx;
	}

	.pay-item {
		flex: 1;
		text-align: center;
		padding: 20rpx 0;
		font-size: 28rpx;
		border: 1rpx solid #d8d8d8;
		border-radius: 16rpx;
		color: #555;
		user-select: none;
		transition: all 0.3s ease;
	}

	.pay-item.active {
		background: linear-gradient(90deg, #36d1dc, #5b86e5);
		color: white;
		border-color: #5b86e5;
		box-shadow: 0 6rpx 12rpx rgba(54, 209, 220, 0.5);
	}

	.main-btn {
		width: 100%;
		padding: 10rpx 0;
		font-size: 32rpx;
		color: #fff;
		border: none;
		border-radius: 100rpx;
		background: linear-gradient(to right, #36d1dc, #5b86e5);
		box-shadow: 0 10rpx 24rpx rgba(91, 134, 229, 0.3);
		transition: all 0.2s ease-in-out;
	}

	.main-btn:active {
		opacity: 0.8;
		transform: scale(0.98);
	}
</style>
