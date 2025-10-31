<template>
	<view class="container">
		<text class="title">编辑个人资料</text>
		<form @submit.prevent="saveProfile">
			<view class="form-item">
				<text>姓名</text>
				<input v-model="name" placeholder="请输入姓名" />
			</view>
			<view class="form-item">
				<text>手机号</text>
				<input v-model="phone" placeholder="请输入手机号" type="number" />
			</view>
			<view class="form-item">
				<text>邮箱</text>
				<input v-model="email" placeholder="请输入邮箱" type="email" />
			</view>
			<button formType="submit" class="btn-save">保存</button>
		</form>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue'

	const name = ref('张三')
	const phone = ref('13800000000')
	const email = ref('zhangsan@example.com')

	const saveProfile = () => {
		uni.showToast({
			title: '保存成功',
			icon: 'success'
		})
		// 这里可以调用接口保存数据
		uni.navigateBack()
	}
</script>

<style scoped>
	.container {
		padding: 40rpx;
		background: #fff;
		min-height: 100vh;
	}

	.title {
		font-size: 36rpx;
		font-weight: bold;
		margin-bottom: 30rpx;
		color: #333;
	}

	.form-item {
		margin-bottom: 30rpx;
	}

	.form-item text {
		display: block;
		font-size: 28rpx;
		color: #666;
		margin-bottom: 10rpx;
	}

	.form-item input {
		width: 100%;
		padding: 28rpx 24rpx;
		font-size: 28rpx;
		border: 1rpx solid #ccc;
		border-radius: 12rpx;
		box-sizing: border-box;
	}

	.btn-save {
		width: 100%;
		padding: 30rpx 0;
		background: #5b86e5;
		color: white;
		font-weight: 700;
		font-size: 32rpx;
		border-radius: 20rpx;
	}
</style>