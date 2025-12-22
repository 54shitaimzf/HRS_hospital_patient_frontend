<template>
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
      <view class="department-picker" v-if="departments && departments.length > 1">
        <picker mode="selector" :range="departments" :range-key="'name'" :value="selectedDeptIndex" @change="onDepartmentChange">
          <view class="picker-item">{{ selectedDepartment.name }}</view>
        </picker>
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
          <!-- 显示为“就诊时间”（优先查找真实就诊/就诊打卡时间），回退到预约时间 -->
          <text class="date">{{ formatVisitDateTime(item) }}</text>
          <text class="status" :class="statusClass(item.status)">{{ item.status || '—' }}</text>
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
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useUserStore } from '../../store/user.js'
import { fetchRegistrations, cancelRegistration, cancelWaitingRegistration, fetchDepartments } from '../../utils/api.js'

const userStore = useUserStore()
const registrations = ref([])
const page = ref(1)
const pageSize = ref(10)
const hasMore = ref(true)
const loading = ref(false)
const error = ref('')
const refresher = ref(false)

// Updated status options per new final set
const statusOptions = ['全部', '排队中', '待支付', '已挂号', '就诊中', '已就诊', '已取消'];
const filters = reactive({ status: '全部', fromDate: '', toDate: '', departmentId: '' })
const departments = ref([])
const selectedDepartment = ref({ id: '', name: '全部' })
const selectedDeptIndex = ref(0)
let lastStatusClickTs = 0

// Load departments (一级科室) on init
async function loadDepartments() {
  try {
    const { list } = await fetchDepartments();

    // Robust extraction of second-level departments.
    // Heuristics tried in order:
    // 1) If top-level items have a child-array (commonly `subDepartments`), flatten those children.
    // 2) If not, try other common child property names like `children`, `subList`, `childrenList`.
    // 3) If still not found, fallback to filtering flat list by `parentId`.
    // 4) Final fallback: use the original list.

    const tryChildKeys = ['subDepartments', 'children', 'subList', 'childrenList', 'clinics'];
    let childrenFlatten = [];

    if (Array.isArray(list)) {
      // First quick path: common `subDepartments`
      childrenFlatten = list.flatMap(d => Array.isArray(d.subDepartments) ? d.subDepartments.map(sd => ({ ...sd, parentId: d.id })) : []);

      // If not found, try other keys
      if (childrenFlatten.length === 0) {
        for (const key of tryChildKeys) {
          const found = list.flatMap(d => Array.isArray(d[key]) ? d[key].map(sd => ({ ...sd, parentId: d.id })) : []);
          if (found.length > 0) {
            childrenFlatten = found;
            break;
          }
        }
      }

      // As a last attempt, inspect each object and pick any array-valued property that looks like children
      if (childrenFlatten.length === 0) {
        for (const d of list) {
          for (const k of Object.keys(d || {})) {
            const val = d[k];
            if (Array.isArray(val) && val.length > 0 && val[0] && (val[0].id || val[0].name)) {
              // use this as children
              childrenFlatten.push(...val.map(sd => ({ ...sd, parentId: d.id })));
            }
          }
        }
      }
    }

    let source = [];
    if (childrenFlatten.length > 0) {
      source = childrenFlatten;
    } else if (Array.isArray(list)) {
      // fallback to flat-list parentId detection
      const secondsByParent = list.filter(d => d && (d.parentId || d.parent_id || d.pId || d.parent));
      source = secondsByParent.length ? secondsByParent : list;
    }

    // Map to {id,name}, de-duplicate by id and prefer readable name
    const mapped = (source || []).map(d => ({ id: d.id || d.departmentId || d.code || d.name, name: d.name || d.departmentName || d.displayName || String(d.id), parentId: d.parentId || d.parent_id || d.pId || d.parent || null, raw: d }));
    const seen = new Set();
    const dedup = [];
    for (const m of mapped) {
      if (!m.id) continue;
      if (seen.has(String(m.id))) continue;
      seen.add(String(m.id));
      dedup.push({ id: m.id, name: m.name, parentId: m.parentId });
    }

    departments.value = dedup;
    // ensure there is at least the full-list fallback if dedup is empty
    if (!departments.value || departments.value.length === 0) departments.value = [{ id: '', name: '全部' }];
    // prepend '全部' if not present
    if (!departments.value.find(d => d && d.id === '')) departments.value.unshift({ id: '', name: '全部' });

    // default selected index and value
    selectedDeptIndex.value = 0
    selectedDepartment.value = departments.value[0] || { id: '', name: '全部' }
  } catch (e) {
    // ignore silently; departments will be empty and picker hidden
    departments.value = [{ id: '', name: '全部' }]
    selectedDeptIndex.value = 0
    selectedDepartment.value = departments.value[0]
  }
}

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
function onDepartmentChange(e){
  const idx = Number(e?.detail?.value ?? 0)
  const sel = departments.value[idx] || { id: '', name: '全部' }
  selectedDeptIndex.value = idx
  selectedDepartment.value = sel
  // set department filter and reload
  // If the selected item is a child (has parentId), send parentId to match backend registrations
  filters.departmentId = sel.parentId || sel.id || ''
  resetAndLoad()
}

function statusClass(st){
  return st === '已取消' ? 'st-cancel'
    : st === '已就诊' ? 'st-completed'
    : st === '已挂号' ? 'st-ok'
    : st === '待支付' ? 'st-pending'
    : st === '排队中' ? 'st-waiting'
    : st === '就诊中' ? 'st-inprogress'
    : 'st-default'
}

// Improved date/time helpers: robust parsing and mapping of time-period names to concrete ranges
function pad(n){ return String(n).padStart(2,'0') }
function formatDateObj(d){
  if(!d || !(d instanceof Date) || isNaN(d)) return null
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function tryParseISO(v){
  if(!v) return null
  // Accept numbers (timestamp), Date strings like 2023-01-02 or 2023-01-02T08:00:00
  if(typeof v === 'number') return formatDateObj(new Date(v))
  if(typeof v !== 'string') return null
  // clean common timezone fragments
  const s = v.trim()
  // try Date constructor
  const d = new Date(s)
  if(!isNaN(d)) return formatDateObj(d)
  // fallback: try to extract date and time parts
  const m = s.match(/(\d{4}-\d{1,2}-\d{1,2})(?:[ T]?(\d{1,2}:\d{1,2}(?::\d{1,2})?))?/)
  if(m){
    try{
      const datePart = m[1]
      const timePart = m[2] || '00:00'
      const dd = new Date(datePart + 'T' + timePart.replace(/:\d{1,2}$/,'') + ':00')
      if(!isNaN(dd)) return formatDateObj(dd)
    }catch(_){}
  }
  return null
}

function mapTimePeriod(tp){
  if(!tp) return ''
  const s = String(tp).trim()
  if(/\d{1,2}:\d{2}/.test(s)) return s // already a time
  const low = s.toLowerCase()
  // common Chinese labels -> concrete ranges
  if(/早|晨|上午/.test(s)) return '08:00-12:00' // 上午
  if(/中午|午间|午/.test(s)) return '12:00-13:30'
  if(/下午/.test(s)) return '13:30-17:30'
  if(/晚|晚上|夜|夜间/.test(s)) return '18:00-21:00'
  if(/全天/.test(low)) return '00:00-23:59'
  // english
  if(/morning/.test(low)) return '08:00-12:00'
  if(/afternoon/.test(low)) return '13:30-17:30'
  if(/evening|night/.test(low)) return '18:00-21:00'
  // if it's a short label like AM/PM
  if(/^am$/i.test(s)) return '08:00-12:00'
  if(/^pm$/i.test(s)) return '13:30-17:30'
  // default: return original
  return s
}

function formatTime(t){
  if(!t) return '—';
  // try multiple shapes
  const candidates = [t]
  // if object with time property
  if(typeof t === 'object'){
    candidates.push(t.registerTime, t.createTime, t.time, t.datetime)
  }
  for(const c of candidates){
    const parsed = tryParseISO(c)
    if(parsed) return parsed
  }
  // fallback to string trimming
  try{
    const s = String(t)
    if(s.length >= 16) return s.replace('T',' ').substring(0,16)
    return s
  }catch(_){ return '—' }
}

// New: prefer explicit 就诊/到诊时间 fields, then fall back to appointment/schedule times.
function formatVisitDateTime(item) {
  if (!item) return '—';

  // Common field names that represent actual visit/check-in/treatment time (priority order)
  const visitKeys = [
    'visitTime','treatmentTime','consultationTime','visitDateTime','attendTime','attendAt','actualVisitTime',
    'seeDoctorTime','checkinTime','seenTime','seeTime','visit_time','treatment_time','checkin_time','attend_time'
  ];

  // helper to try a value and return formatted string if found
  const tryValue = (v) => {
    if (!v && v !== 0) return null;
    const p = tryParseISO(v);
    if (p) return p;
    try { return String(v); } catch (_) { return null; }
  };

  // 1) search top-level visit-like fields
  for (const k of visitKeys) {
    const val = item[k];
    const out = tryValue(val);
    if (out) return out;
  }

  // 2) search in likely nested objects (visit/treatment/checkin)
  const nests = ['visit','treatment','checkin','attend','schedule'];
  for (const n of nests) {
    if (item[n] && typeof item[n] === 'object') {
      for (const k of visitKeys) {
        const val = item[n][k];
        const out = tryValue(val);
        if (out) return out;
      }
    }
  }

  // 3) fallback to schedule/appointment info (preserve previous behavior)
  const scheduleDate = item.scheduleDate || item.date || item.schedule_date || item.scheduleDay || '';
  const timePeriod = item.timePeriodName || item.timePeriod || item.period || item.slot || '';

  if (scheduleDate && timePeriod) {
    const dateOnly = (String(scheduleDate).indexOf('T') === -1 && String(scheduleDate).indexOf(':') === -1) ? String(scheduleDate) : tryParseISO(scheduleDate) || String(scheduleDate);
    const mapped = mapTimePeriod(timePeriod);
    return `${dateOnly} ${mapped}`;
  }

  const start = item.startTime || item.beginTime || item.scheduleStartTime || item.start || item.start_time;
  const end = item.endTime || item.finishTime || item.scheduleEndTime || item.end || item.end_time;
  if (start || end) {
    const s = tryParseISO(start) || (start && String(start)) || '';
    const e = tryParseISO(end) || (end && String(end)) || '';
    if (s && e) return `${s} - ${e}`;
    if (s) return s;
    if (e) return e;
  }

  const registerTime = item.visitTime || item.attendTime || item.registerTime || item.registeredAt || item.createTime || item.registeredDatetime || item.registered_time;
  const parsedRegister = tryParseISO(registerTime);
  if (parsedRegister) return parsedRegister;

  if (scheduleDate) {
    const p = tryParseISO(scheduleDate);
    if (p) return p;
    return String(scheduleDate);
  }

  if (item.schedule && typeof item.schedule === 'object') {
    const s2 = formatVisitDateTime(item.schedule);
    if (s2 && s2 !== '—') return s2;
  }

  if (timePeriod) return mapTimePeriod(timePeriod);

  return '—';
}

// keep old name as compatibility shim
function formatScheduleDateTime(item) { return formatVisitDateTime(item); }

// Allow cancel for these statuses (assumed business rules)
function canCancel(st){
  if (st === undefined || st === null) return false
  const s = String(st).trim()
  return s === '排队中' || s === '已挂号'
}
function canReview(item){ return item?.status === '已就诊' && !!item?.scheduleRecordId && !!item?.doctorId }
function shouldShowReview(item){ return canReview(item) }
function shouldShowCancel(item){ return canCancel(item.status) && !shouldShowReview(item) }

function viewDetail(item){
  uni.showToast({ title: '详情: '+ (item.scheduleRecordId || ''), icon: 'none' })
}
async function cancel(item){
  // Build a robust, human-friendly label for the record (avoid 'undefined')
  const parts = [];
  try {
    if (item) {
      if (item.scheduleDate) parts.push(item.scheduleDate + (item.timePeriodName ? ' ' + item.timePeriodName : ''));
      else if (item.registerTime) parts.push(formatTime(item.registerTime));
      if (item.doctorName) parts.push(item.doctorName);
      if (item.departmentName) parts.push(item.departmentName);
      if (!parts.length && item.scheduleRecordId) parts.push(`记录:${item.scheduleRecordId}`);
      if (!parts.length && item.paymentId) parts.push(`订单:${item.paymentId}`);
      if (!parts.length && item.waitingId) parts.push(`候补:${item.waitingId}`);
    }
  } catch (_) { /* ignore */ }
  const label = parts.length ? parts.join(' - ') : '该挂号记录';

  uni.showModal({
    title: '确认取消',
    content: `确定要取消 ${label} 的挂号吗？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        const patientId = await userStore.ensurePatientId();
        if (!patientId) {
          uni.showToast({ title: '无法获取用户信息，请重试', icon: 'none' });
          return;
        }

        // Choose cancellation API based on status explicitly per new rule:
        // - '排队中' => cancelWaitingRegistration
        // - '已挂号' => cancelRegistration
        const status = String(item?.status || '').trim()
        if (status === '排队中') {
          if (!item?.waitingId) {
            uni.showToast({ title: '候补记录信息不完整，无法取消', icon: 'none' })
            return
          }
          await cancelWaitingRegistration({ waitingId: item.waitingId, patientId })
          const target = registrations.value.find(r => r.waitingId === item.waitingId || r.scheduleRecordId === item.scheduleRecordId)
          if (target) target.status = '已取消'
        } else if (status === '已挂号') {
          if (!item?.scheduleRecordId) {
            uni.showToast({ title: '挂号记录信息不完整，无法取消', icon: 'none' })
            return
          }
          await cancelRegistration({ patientId, scheduleRecordId: item.scheduleRecordId })
          const target = registrations.value.find(r => r.scheduleRecordId === item.scheduleRecordId || r.scheduleRecordId === String(item.scheduleRecordId))
          if (target) target.status = '已取消'
        } else {
          // Status not allowed to cancel from UI anymore
          uni.showToast({ title: '当前状态不能取消挂号', icon: 'none' })
          return
        }
      } catch (e) {
        const errMsg = e?.data?.msg || e?.message || '取消失败，请稍后重试';
        uni.showToast({ title: errMsg, icon: 'none' });
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

    const { list, total, page: currentPage, pageSize: currentSize } = await fetchRegistrations({
      patientId: pid,
      page: page.value,
      pageSize: pageSize.value,
      status: filters.status === '全部' ? undefined : filters.status,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      departmentId: filters.departmentId || undefined
    });

    // Client-side filtering fallback: some backends (mock server) may ignore departmentId
    let finalList = Array.isArray(list) ? list : [];
    if (filters.departmentId) {
      const wantedParentId = String(filters.departmentId);
      const wantedChildId = String(selectedDepartment.value?.id || '');
      const wantedName = String(selectedDepartment.value?.name || '').trim();

      const matchesDept = (item) => {
        if (!item) return false;
        const candidates = [];
        // common shapes
        candidates.push(item.departmentId, item.department_id, item.department, item.deptId, item.dept_id);
        // nested objects
        if (item.department && typeof item.department === 'object') {
          candidates.push(item.department.id, item.department.departmentId, item.department.deptId, item.department.code);
        }
        if (item.dept && typeof item.dept === 'object') {
          candidates.push(item.dept.id, item.dept.departmentId);
        }
        // normalize to strings
        const strs = candidates.filter(Boolean).map(v => String(v));
        if (strs.includes(wantedParentId) || (wantedChildId && strs.includes(wantedChildId))) return true;
        // fallback: match by name
        const name = item.departmentName || item.department_name || (item.department && (item.department.name || item.department.departmentName));
        if (name && String(name).trim() === wantedName) return true;
        return false;
      };

      finalList = finalList.filter(matchesDept);
    }

    if (page.value === 1) {
      registrations.value = finalList;
    } else {
      registrations.value.push(...finalList);
    }

    // Update hasMore conservatively: if backend provided total, still use it; otherwise infer from returned length
    if (typeof total === 'number') {
      hasMore.value = (currentPage * currentSize) < total
    } else {
      hasMore.value = finalList.length === currentSize
    }

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

// call loadDepartments after component init
loadDepartments()
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
.department-picker { margin-top: 16rpx; }
.picker-item { background:#f8f8f8; padding:10rpx 20rpx; border-radius:8rpx; font-size:24rpx; }
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
.st-inprogress { background:#fff7e6; color:#fb8c00; }
.line { display:flex; font-size:26rpx; margin-top:6rpx; }
.label { color:#888; width:140rpx; }
.value { color:#333; }
.actions { display:flex; margin-top:16rpx; }
.actions button { flex:1; margin-right:16rpx; }
.actions button:last-child { margin-right:0; }
.detail-btn { margin-right:16rpx; background:#4e9deb; color:#fff; }
.review-btn { margin-right:16rpx; background:#ffb300; color:#fff; }
.cancel-btn { background:#e53935; color:#fff; }
</style>
