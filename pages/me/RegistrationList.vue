﻿<template>
  <view class="page-container">

    <view class="filters">
      <scroll-view scroll-x="true" class="status-tabs">
        <view v-for="s in statusOptions" :key="s" class="tab" :class="{ active: filters.status === s }" @click="changeStatus(s)">
          <text>{{ s }}</text>
        </view>
      </scroll-view>
      <view class="date-range">
        <picker mode="date" :value="filters.fromDate" @change="onFromDateChange">
          <view class="date-item">开始: {{ filters.fromDate || '选择日期' }}</view>
        </picker>
        <picker mode="date" :value="filters.toDate" @change="onToDateChange">
          <view class="date-item">结束: {{ filters.toDate || '选择日期' }}</view>
        </picker>
        <button size="mini" class="clear-btn" @click="clearDate">清空</button>
      </view>
    </view>


    <scroll-view scroll-y="true" class="list" @scrolltolower="loadMore" refresher-enabled="true" :refresher-triggered="refresher" @refresherrefresh="onRefresh">
      <view v-if="loading && page === 1" class="loading-initial">加载中...</view>
      <view v-else-if="error && page === 1" class="error-box">
        <text class="error-text">{{ error }}</text>
        <button size="mini" @click="reload">重试</button>
      </view>
      <view v-else-if="!loading && registrations.length === 0" class="empty">
        <text class="empty-text">暂无挂号记录</text>
        <button size="mini" @click="goToRegister">去预约</button>
      </view>

      <view v-for="item in registrations" :key="item.patientId + '_' + item.scheduleRecordId" class="card">
        <view class="card-header">
          <text class="date">{{ item.scheduleDate }} {{ item.timePeriodName }}</text>
          <text class="status" :class="statusClass(item.status === '预约中' ? '已预约' : item.status)">{{ item.status === '预约中' ? '已预约' : item.status }}</text>
        </view>
        <view class="line"><text class="label">科室:</text><text class="value">{{ item.departmentName || item.departmentId || '—' }}</text></view>
        <view class="line"><text class="label">医生:</text><text class="value">{{ item.doctorName || item.doctorId || '—' }}</text></view>
        <view class="line"><text class="label">挂号时间:</text><text class="value">{{ formatTime(item.registerTime) }}</text></view>
        <view class="line"><text class="label">记录键:</text><text class="value">{{ item.scheduleRecordId }}</text></view>

        <view class="actions">
          <button size="mini" class="detail-btn" @click="viewDetail(item)">详情</button>
          <button
            v-if="shouldShowReview(item)"
            size="mini"
            class="review-btn"
            @click="goReview(item)"
          >评价</button>
          <button
            v-else-if="shouldShowCancel(item)"
            size="mini"
            class="cancel-btn"
            @click="cancel(item)"
          >取消</button>
        </view>
      </view>

      <view v-if="loading && page > 1" class="loading-more">加载更多...</view>
      <view v-if="!hasMore && registrations.length > 0" class="end-text">没有更多了</view>
    </scroll-view>

    <!-- 详情弹窗 -->
    <view v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">挂号详情</text>
          <view class="modal-close" @click="closeDetailModal">
            <uni-icons type="close" size="20" color="#999"></uni-icons>
          </view>
        </view>
        <view class="modal-body" v-if="detailItem">
          <view class="detail-section">
            <view class="detail-row">
              <text class="detail-label">就诊日期</text>
              <text class="detail-value">{{ detailItem.scheduleDate }} {{ detailItem.timePeriodName }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">科室</text>
              <text class="detail-value">{{ detailItem.departmentName || detailItem.departmentId || '—' }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">医生</text>
              <text class="detail-value">{{ detailItem.doctorName || detailItem.doctorId || '—' }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">挂号时间</text>
              <text class="detail-value">{{ formatTime(detailItem.registerTime) }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">状态</text>
              <text class="detail-value status-text" :class="statusClass(detailItem.status === '预约中' ? '已预约' : detailItem.status)">
                {{ detailItem.status === '预约中' ? '已预约' : detailItem.status }}
              </text>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="nav-btn" @click="goNavigation">
            <uni-icons type="navigate" size="18" color="#fff"></uni-icons>
            <text>就诊导航</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useUserStore } from '../../store/user.js'
import { fetchRegistrations, cancelRegistration, fetchWaitingRegistrations, cancelWaitingRegistration } from '../../utils/api.js'

const userStore = useUserStore()
const registrations = ref([])
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(true)
const loading = ref(false)
const error = ref('')
const refresher = ref(false)

const statusOptions = ['全部', '已预约', '已就诊', '已取消', '候补中'];
const filters = reactive({ status: '全部', fromDate: '', toDate: '' })
let lastStatusClickTs = 0

function changeStatus(s) {
  const now = Date.now()
  if (now - lastStatusClickTs < 200) return // 简单防抖
  lastStatusClickTs = now
  if (filters.status === s) return
  filters.status = s
  resetAndLoad()
}
function onFromDateChange(e) { filters.fromDate = e.detail.value; resetAndLoad() }
function onToDateChange(e) { filters.toDate = e.detail.value; resetAndLoad() }
function clearDate() { if (filters.fromDate || filters.toDate){ filters.fromDate=''; filters.toDate=''; resetAndLoad(); } }

function statusClass(st){
  return st === '已取消' ? 'st-cancel' : st === '已预约' ? 'st-ok' : st === '预约中' ? 'st-pending' : st === '候补中' ? 'st-waiting' : st === '已就诊' ? 'st-completed' : 'st-default'
}
function formatTime(t){
  if(!t) return '—';
  return (t+'').replace('T',' ').substring(0,19)
}
function canCancel(st){ return st === '预约中' || st === '已预约' || st === '候补中' }
function canReview(item){ return item?.status === '已就诊' && !!item?.scheduleRecordId && !!item?.doctorId }
function shouldShowReview(item){ return canReview(item) }
function shouldShowCancel(item){ return canCancel(item.status) && !shouldShowReview(item) }

// 详情弹窗相关
const showDetailModal = ref(false)
const detailItem = ref(null)

function viewDetail(item){
  detailItem.value = item
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  detailItem.value = null
}

function goNavigation() {
  if (!detailItem.value) return
  const registrationId = detailItem.value.registrationId || detailItem.value.scheduleRecordId
  if (!registrationId) {
    uni.showToast({ title: '无法获取挂号ID', icon: 'none' })
    return
  }
  closeDetailModal()
  uni.navigateTo({
    url: `/pages/navigation/Navigation?registrationId=${registrationId}`
  })
}
async function cancel(item){
  if (item.status === '候补中') {
    cancelWaiting(item);
    return;
  }
  uni.showModal({
    title: '确认取消',
    content: `确定要取消 ${item.scheduleDate} 的挂号吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const patientId = await userStore.ensurePatientId();
          if (!patientId) {
            uni.showToast({ title: '无法获取用户信息，请重试', icon: 'none' });
            return;
          }
          await cancelRegistration({
            patientId: patientId,
            scheduleRecordId: item.scheduleRecordId
          });

          const target = registrations.value.find(r => r.scheduleRecordId === item.scheduleRecordId);
          if (target) target.status = '已取消';
        } catch (e) {
          const errMsg = e?.data?.msg || e?.message || '取消失败，请稍后重试';
          uni.showToast({ title: errMsg, icon: 'none' });
        }
      }
    }
  });
}

async function cancelWaiting(item) {
  uni.showModal({
    title: '确认取消候补',
    content: `确定要取消 ${item.scheduleDate} 的候补吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const patientId = await userStore.ensurePatientId();
          if (!patientId) {
            uni.showToast({ title: '无法获取用户信息，请重试', icon: 'none' });
            return;
          }
          await cancelWaitingRegistration({ waitingId: item.waitingId, patientId });
          const target = registrations.value.find(r => r.waitingId === item.waitingId);
          if (target) target.status = '已取消';
        } catch (e) {
          const errMsg = e?.data?.msg || e?.message || '取消候补失败，请稍后重-试';
          uni.showToast({ title: errMsg, icon: 'none' });
        }
      }
    }
  });
}

async function goReview(item) {
  const pid = await userStore.ensurePatientId();
  if (!pid) {
    uni.showToast({ title: '请先登录或完善资料', icon: 'none' });
    return;
  }
  const params = buildQuery({
    registrationId: item.scheduleRecordId,
    doctorId: item.doctorId,
    patientId: pid,
    doctorName: item.doctorName || item.doctorId || '',
    departmentName: item.departmentName || item.departmentId || '',
    scheduleDate: item.scheduleDate || '',
    timePeriodName: item.timePeriodName || ''
  });
  if (!params) {
    uni.showToast({ title: '评价信息不足', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/me/DoctorReview?${params}` });
}

function buildQuery(obj) {
  return Object.entries(obj)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function goToRegister(){
  uni.navigateTo({ url: '/pages/his/Departments' })
}

async function load() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const pid = await userStore.ensurePatientId()
    if (!pid) {
      error.value = '未获取到患者ID，请登录或完善资料'
      registrations.value = []
      hasMore.value = false
      return
    }

    let finalHasMore = true;
    let finalTotal = 0;
    let combinedList = [];


    if (filters.status === '候补中') {
      const { list, total } = await fetchWaitingRegistrations({
        patientId: pid,
        date: filters.fromDate || undefined // 候补记录接口可能只支持单日查询
      });
      combinedList = list;
      finalTotal = total;
      finalHasMore = false; // 候补记录接口无分页
    } else {
      const { list, total, page: currentPage, pageSize: currentSize } = await fetchRegistrations({
        patientId: pid,
        page: page.value,
        pageSize: pageSize.value,
        status: filters.status === '全部' ? undefined : filters.status,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined
      });
      combinedList = list;
      finalTotal = total;
      finalHasMore = (currentPage * currentSize) < total;
    }

    if (page.value === 1) {
      registrations.value = combinedList;
    } else {
      registrations.value.push(...combinedList);
    }
    hasMore.value = finalHasMore;

  } catch (e) {
    if (page.value === 1) registrations.value = []
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
    refresher.value = false
  }
}
function resetAndLoad(){
  page.value = 1
  hasMore.value = true
  registrations.value = []
  load()
}
function loadMore(){
  if (!hasMore.value || loading.value) return
  page.value += 1
  load()
}
function reload(){
  page.value = 1
  load()
}
function onRefresh(){
  refresher.value = true
  resetAndLoad()
}


load()
</script>

<style scoped>
.page-container { padding: 20rpx; }
.filters { background:#fff; border-radius:16rpx; padding:16rpx; box-shadow:0 4rpx 12rpx rgba(0,0,0,0.06); margin-bottom:20rpx; }
.status-tabs { display:flex; flex-direction:row; white-space:nowrap; }
.tab { display:inline-flex; padding:12rpx 28rpx; margin-right:16rpx; background:#f3f6fb; border-radius:999rpx; font-size:26rpx; color:#555; }
.tab.active { background:#4e9deb; color:#fff; }
.date-range { display:flex; align-items:center; margin-top:16rpx; }
.date-item { background:#f8f8f8; padding:10rpx 20rpx; border-radius:8rpx; font-size:24rpx; margin-right:16rpx; }
.clear-btn { background:#eee; color:#333; }
.list { height: calc(100vh - 200rpx); }
.loading-initial, .loading-more, .end-text { text-align:center; padding:30rpx; font-size:26rpx; color:#666; }
.empty { padding:120rpx 40rpx; display:flex; flex-direction:column; align-items:center; }
.empty-text { font-size:30rpx; color:#777; margin-bottom:30rpx; }
.error-box { padding:120rpx 40rpx; text-align:center; }
.error-text { color:#d32f2f; font-size:28rpx; margin-bottom:20rpx; }
.card { background:#fff; border-radius:20rpx; padding:28rpx 24rpx; margin-bottom:20rpx; box-shadow:0 6rpx 18rpx rgba(0,0,0,0.05); }
.card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12rpx; }
.date { font-size:30rpx; font-weight:600; color:#333; }
.status { font-size:24rpx; padding:6rpx 18rpx; border-radius:999rpx; }
.st-cancel { background:#ffecec; color:#e53935; }
.st-ok { background:#e3f2fd; color:#1976d2; }
.st-pending { background:#fff3e0; color:#fb8c00; }
.st-waiting { background:#ede7f6; color:#5e35b1; }
.st-completed { background: #e8f5e9; color: #43a047; }
.st-default { background:#eceff1; color:#607d8b; }
.line { display:flex; font-size:26rpx; margin-top:6rpx; }
.label { color:#888; width:140rpx; }
.value { color:#333; }
.actions { display:flex; margin-top:16rpx; }
.actions button { flex:1; margin-right:16rpx; }
.actions button:last-child { margin-right:0; }
.detail-btn { margin-right:16rpx; background:#4e9deb; color:#fff; }
.review-btn { margin-right:16rpx; background:#ffb300; color:#fff; }
.cancel-btn { background:#e53935; color:#fff; }

/* 详情弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 40rpx;
}
.modal-content {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.modal-close {
  padding: 10rpx;
}
.modal-body {
  padding: 30rpx;
}
.detail-section {
  background: #f8f9fa;
  border-radius: 16rpx;
  padding: 20rpx;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eee;
}
.detail-row:last-child {
  border-bottom: none;
}
.detail-label {
  font-size: 26rpx;
  color: #888;
}
.detail-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}
.status-text {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
}
.modal-footer {
  padding: 20rpx 30rpx 30rpx;
}
.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #4e9deb 0%, #6bb3f8 100%);
  border-radius: 44rpx;
  color: #fff;
  font-size: 30rpx;
  border: none;
}
.nav-btn text {
  margin-left: 10rpx;
}
</style>
