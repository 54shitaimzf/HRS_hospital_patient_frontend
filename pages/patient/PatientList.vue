<template>
	<view class="container">
		<view class="header">
			<text class="title">就诊人管理</text>
			<button @click="showAdd = true" type="primary">添加就诊人</button>
		</view>

		<view class="card" v-for="(item, index) in patientList" :key="index">
			<view class="info">
				<text>{{ item.name }}（{{ item.gender }}）</text>
				<text>身份证：{{ item.idCard }}</text>
				<text>手机号：{{ item.phone }}</text>
				<text>关系：{{ item.relation }}</text>
			</view>
			<button @click="deletePatient(index)" type="warn" size="mini">删除</button>
		</view>

		<!-- 添加就诊人表单 -->
		<uni-popup ref="popup" :show="showAdd" @close="showAdd = false">
			<view class="popup-form">
				<input v-model="form.name" placeholder="姓名" />
				<picker :range="['男', '女']" v-model="form.genderIndex">
					<view class="picker">{{ ['男', '女'][form.genderIndex] || '选择性别' }}</view>
				</picker>
				<input v-model="form.idCard" placeholder="身份证号码" />
				<input v-model="form.phone" placeholder="手机号" />
				<input v-model="form.relation" placeholder="与本人关系" />
				<button @click="submitPatient" type="primary">提交</button>
			</view>
		</uni-popup>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue'
	import {
		onLoad
	} from '@dcloudio/uni-app'

	const showAdd = ref(false)
	const form = ref({
		name: '',
		genderIndex: null,
		idCard: '',
		phone: '',
		relation: ''
	})

	const patientList = ref([])

	const submitPatient = () => {
		if (!form.value.name || form.value.genderIndex === null || !form.value.idCard || !form.value.phone) {
			uni.showToast({
				title: '请填写完整信息',
				icon: 'none'
			})
			return
		}
		patientList.value.push({
			name: form.value.name,
			gender: ['男', '女'][form.value.genderIndex],
			idCard: form.value.idCard,
			phone: form.value.phone,
			relation: form.value.relation
		})
		form.value = {
			name: '',
			genderIndex: null,
			idCard: '',
			phone: '',
			relation: ''
		}
		showAdd.value = false
	}

	const deletePatient = (index) => {
		patientList.value.splice(index, 1)
	}
</script>

<style scoped>
	.container {
		padding: 20rpx;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.title {
		font-size: 36rpx;
		font-weight: bold;
	}

	.card {
		background: #f8f8f8;
		padding: 20rpx;
		margin-top: 20rpx;
		border-radius: 16rpx;
	}

	.info text {
		display: block;
		margin: 4rpx 0;
	}

	.popup-form {
		padding: 20rpx;
	}

	.picker {
		padding: 20rpx;
		background: #eee;
		margin: 10rpx 0;
	}
</style>