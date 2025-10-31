<template>
	<view class="department-page">
		<view class="search-bar">
			<uni-search-bar placeholder="搜索科室或医生" radius="100" bgColor="#f0f9ff" @confirm="search" />
		</view>

		<view class="main-content">
			<!-- 左侧一级科室 -->
			<scroll-view scroll-y class="left-panel">
				<view v-for="dept in allDepartments" :key="dept.id"
					:class="['left-item', selectedDeptId === dept.id ? 'active' : '']"
					@click="selectDepartment(dept.id)">
					{{ dept.name }}
				</view>
			</scroll-view>

			<!-- 右侧二级门诊 -->
			<scroll-view scroll-y class="right-panel">
				<view v-for="clinic in getSubDepartments(selectedDeptId)" :key="clinic.id" class="right-item"
					@click="gotoDoctors(clinic.id)">
					<text class="clinic-name">{{ clinic.name }}</text>
					<uni-icons type="right" size="18" color="#999" />
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script setup>
	import uniSearchBar from '@dcloudio/uni-ui/lib/uni-search-bar/uni-search-bar.vue'
	import {
		ref
	} from 'vue';
	import { onLoad } from '@dcloudio/uni-app'
	// 一级科室
	const allDepartments = ref([{
			id: 1,
			name: '内科'
		},
		{
			id: 2,
			name: '外科'
		},
		{
			id: 3,
			name: '妇产科'
		},
		{
			id: 4,
			name: '儿科'
		},
		{
			id: 5,
			name: '眼科'
		},
		{
			id: 6,
			name: '口腔科'
		},
		{
			id: 7,
			name: '耳鼻喉科'
		},
		{
			id: 8,
			name: '皮肤科'
		},
		{
			id: 9,
			name: '中医科'
		},
		{
			id: 10,
			name: '康复理疗科'
		},
		{
			id: 11,
			name: '急诊科'
		},
		{
			id: 12,
			name: '体检中心'
		},
	]);

	// 二级门诊
	const subDepartmentsMap = {
		1: [{
			id: 101,
			name: '呼吸内科'
		}, {
			id: 102,
			name: '心血管内科'
		}],
		2: [{
			id: 201,
			name: '骨科'
		}, {
			id: 202,
			name: '普外科'
		}],
		3: [{
			id: 301,
			name: '妇科'
		}, {
			id: 302,
			name: '产科'
		}],
		4: [{
			id: 401,
			name: '儿童保健'
		}, {
			id: 402,
			name: '新生儿科'
		}],
		5: [{
			id: 501,
			name: '视光科'
		}, {
			id: 502,
			name: '眼底病科'
		}],
		6: [{
			id: 601,
			name: '牙体牙髓科'
		}, {
			id: 602,
			name: '正畸科'
		}],
		7: [{
			id: 701,
			name: '耳鼻科'
		}, {
			id: 702,
			name: '咽喉科'
		}],
		8: [{
			id: 801,
			name: '皮肤美容'
		}, {
			id: 802,
			name: '皮肤病科'
		}],
		9: [{
			id: 901,
			name: '针灸科'
		}, {
			id: 902,
			name: '推拿科'
		}],
		10: [{
			id: 1001,
			name: '康复治疗科'
		}, {
			id: 1002,
			name: '理疗科'
		}],
		11: [{
			id: 1101,
			name: '急诊内科'
		}, {
			id: 1102,
			name: '急诊外科'
		}],
		12: [{
			id: 1201,
			name: '综合体检'
		}, {
			id: 1202,
			name: '专项体检'
		}],
	};

	const selectedDeptId = ref(1);

	const selectDepartment = (id) => {
		selectedDeptId.value = id;
	};

	const getSubDepartments = (deptId) => {
		return subDepartmentsMap[deptId] || [];
	};

	const gotoDoctors = (deptId) => {
		uni.navigateTo({
			url: `/pages/his/DoctorList?deptId=${deptId}`
		});
	};

	const search = (e) => {
		console.log('搜索:', e.value);
	};
</script>

<style scoped>
	.department-page {
		background-color: #fafafa;
		height: 100vh;
	}

	.search-bar {
		margin-bottom: 20rpx;
	}

	.main-content {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		height: calc(100vh - 140rpx);
		border-radius: 16rpx;
		overflow: hidden;
		background-color: #fff;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
	}

	.left-panel {
		width: 200rpx;
		background-color: #f7f7f7;
		border-right: 1rpx solid #eee;
	}

	.left-item {
		padding: 30rpx 20rpx;
		text-align: center;
		font-size: 28rpx;
		color: #333;
	}

	.left-item.active {
		background-color: #fff;
		font-weight: bold;
		color: #1890ff;
		border-left: 6rpx solid #1890ff;
	}

	.right-panel {
		flex: 1;
		padding: 20rpx 30rpx;
	}

	.sub-title {
		font-size: 30rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
		color: #333;
	}

	.right-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 26rpx 0;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.clinic-name {
		font-size: 28rpx;
		color: #555;
	}
</style>