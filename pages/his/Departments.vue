<template>
	<view class="department-page">
		<view class="search-bar">
			<uni-search-bar placeholder="搜索科室" radius="100" bgColor="#f0f9ff" @confirm="search" />
		</view>

		<view v-if="loading" class="loading-state">
			<uni-load-more status="loading"></uni-load-more>
		</view>

		<view v-else class="main-content">
			
			<scroll-view scroll-y="true" class="left-panel">
				<view v-for="dept in allDepartments" :key="dept.id"
					:class="['left-item', selectedDeptId === dept.id ? 'active' : '']"
					@click="selectDepartment(dept.id)">
					{{ dept.name }}
				</view>
			</scroll-view>

			
			<scroll-view scroll-y="true" class="right-panel">
				<view v-for="clinic in subDepartments" :key="clinic.id" class="right-item"
					@click="gotoSchedule(clinic.id, clinic.name)">
					<text class="clinic-name">{{ clinic.name }}</text>
					<uni-icons type="right" size="18" color="#999" />
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script setup>
	import uniSearchBar from '@dcloudio/uni-ui/lib/uni-search-bar/uni-search-bar.vue'
	import uniLoadMore from '@dcloudio/uni-ui/lib/uni-load-more/uni-load-more.vue'
	import uniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'
	import {
		ref,
		computed
	} from 'vue';
	import {
		onLoad
	} from '@dcloudio/uni-app'
	import { api } from '../../utils/api.js'

	const allDepartments = ref([]);
	const selectedDeptId = ref(null);
	const loading = ref(true);
	const fromParam = ref('')


	const fetchDepartments = async () => {
		loading.value = true;
		try {
			const res = await api.get('/api/departments');
			if (res.statusCode === 200) {
				allDepartments.value = res.data;
				if (allDepartments.value.length > 0) {

					selectedDeptId.value = allDepartments.value[0].id;
				}
				uni.showToast({
					title: `科室加载成功: ${res.data.length}个`,
					icon: 'none'
				});
			} else {
				uni.showToast({
					title: '科室列表加载失败',
					icon: 'none'
				});
			}
		} catch (error) {
			console.error('获取科室列表失败:', error);
			uni.showToast({
				title: '网络错误',
				icon: 'none'
			});
		} finally {
			loading.value = false;
		}
	};

	onLoad((options) => {
		fromParam.value = options.from || ''
		fetchDepartments();
	})


	const selectDepartment = (id) => {
		selectedDeptId.value = id;
		const selectedDept = allDepartments.value.find(dept => dept.id === id);
		if (selectedDept) {
			uni.showToast({
				title: `选中科室: ${selectedDept.name}，下有 ${selectedDept.subDepartments?.length || 0} 个二级科室`,
				icon: 'none',
				duration: 2000
			});
		}
	};


	const subDepartments = computed(() => {
		if (!selectedDeptId.value || allDepartments.value.length === 0) {
			return [];
		}
		const selectedDept = allDepartments.value.find(dept => dept.id === selectedDeptId.value);
		return selectedDept ? selectedDept.subDepartments : [];
	});


	const gotoSchedule = (deptId, deptName) => {
		if (fromParam.value === 'extraApply') {

			uni.navigateTo({ url: `/pages/his/ExtraApply?deptId=${deptId}&deptName=${encodeURIComponent(deptName)}` })
			return
		}
		uni.showToast({
			title: `进入科室: ${deptName}`,
			icon: 'none',
			duration: 1000
		});
		uni.navigateTo({
			url: `/pages/his/Schedule?deptId=${deptId}&deptName=${encodeURIComponent(deptName)}`
		});
	};

	const search = () => {

	};
</script>

<style scoped>
	.department-page {
		background-color: #fafafa;
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.search-bar {
		padding: 10rpx 20rpx;
		background-color: #fff;
	}

	.loading-state {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.main-content {
		display: flex;
		flex-direction: row;
		flex: 1;
		overflow: hidden;
		background-color: #fff;
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
		transition: all 0.2s;
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
