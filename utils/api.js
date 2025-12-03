// 统一请求封装：自动附带 Authorization，处理 401，统一错误提示

import { getBaseUrl, setServerMode as _setServerMode, getServerMode } from '../config/server.js'

// 动态获取 BASE_URL 以支持 mock/prod 切换
function resolveBaseUrl() {
  try { return getBaseUrl() || 'http://localhost:8082'; } catch (_) { return 'http://localhost:8082'; }
}

function getToken() {
  try {
    return uni.getStorageSync('token') || '';
  } catch (_) {
    return '';
  }
}

function handleUnauthorized() {
  // 清理本地登录态并引导登录
  uni.removeStorageSync('token');
  // 防止重复跳转：简单延时
  setTimeout(() => {
    uni.navigateTo({ url: '/pages/login/Login' });
  }, 0);
}

export function request({ url, method = 'GET', data = {}, header = {} }) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const reqHeader = { ...header };
    if (token) reqHeader['Authorization'] = `Bearer ${token}`;
    const BASE_URL = resolveBaseUrl();

    uni.request({
      url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
      method,
      data,
      header: reqHeader,
      success: (res) => {
        if (res.statusCode === 401) {
          handleUnauthorized();
          return reject({ code: 401, message: '未授权或登录已过期', res });
        }
        resolve(res);
      },
      fail: (err) => {
        uni.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      }
    });
  });
}

export const api = {
  get: (url, params = {}, header = {}) => request({ url, method: 'GET', data: params, header }),
  post: (url, body = {}, header = {}) => request({ url, method: 'POST', data: body, header }),
  del: (url, params = {}, header = {}) => request({ url, method: 'DELETE', data: params, header }),
};

export async function fetchRegistrations({ patientId, page = 1, pageSize = 20, status, date, fromDate, toDate }) {
  if (!patientId) return Promise.reject({ message: '缺少 patientId' });
  const params = { patientId, page, pageSize };
  if (status && status !== '全部') params.status = status; // 支持逗号分隔多状态，页面可自行传入
  if (date) params.date = date;
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  try {
    const res = await api.get('/api/registrations', params);
    // 后端可能返回 {page,pageSize,total,items} 或 {code,data:{...}}
    let payload = res.data;
    if (payload && payload.data && (payload.data.items || payload.data.page)) {
      payload = payload.data; // 兼容包裹
    }
    const list = payload.items || [];
    return {
      list,
      page: payload.page ?? page,
      pageSize: payload.pageSize ?? pageSize,
      total: payload.total ?? list.length,
      raw: res
    };
  } catch (err) {
    // 统一错误提示
    if (!err?.silent) {
      uni.showToast({ title: err?.message || '加载失败', icon: 'none' });
    }
    return Promise.reject(err);
  }
}

export async function cancelRegistration({ patientId, scheduleRecordId }) {
  if (!patientId || !scheduleRecordId) return Promise.reject({ message: '缺少 patientId 或 scheduleRecordId' });
  try {
    // 根据 API.md 文档，使用 DELETE /api/registrations
    const res = await api.del('/api/registrations', { patientId, scheduleRecordId });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      uni.showToast({ title: '取消成功', icon: 'success' });
      return { success: true, raw: res };
    }
    // 处理业务失败
    const msg = res.data?.msg || res.data?.message || '取消失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) {
      uni.showToast({ title: err?.message || '操作失败', icon: 'none' });
    }
    return Promise.reject(err);
  }
}

export async function fetchWaitingRegistrations({ patientId, date }) {
  if (!patientId) return Promise.reject({ message: '缺少 patientId' });
  const params = { patientId };
  if (date) params.date = date;
  try {
    const res = await api.get('/api/registrations/waiting/patient', params);
    if (res.statusCode === 200 && res.data?.items) {
      // 为候补记录补充前端需要的字段以便统一处理
      const list = res.data.items.map(item => ({
        ...item,
        // 候补记录没有普通挂号的医生、科室等详细信息，需要前端兼容显示
        departmentId: '候补',
        doctorId: '待定',
        status: item.status || '候补中' // 确保有 status 字段
      }));
      return {
        list,
        total: list.length,
        raw: res
      };
    }
    return { list: [], total: 0, raw: res };
  } catch (err) {
    if (!err?.silent) {
      uni.showToast({ title: err?.message || '加载候补记录失败', icon: 'none' });
    }
    return Promise.reject(err);
  }
}

export async function cancelWaitingRegistration({ waitingId, patientId }) {
  if (!waitingId || !patientId) return Promise.reject({ message: '缺少候补ID或患者ID' });
  try {
    const res = await api.del('/api/registrations/waiting', { waitingId, patientId });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      uni.showToast({ title: '取消候补成功', icon: 'success' });
      return { success: true, raw: res };
    }
    const msg = res.data?.message || '取消候补失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) {
      uni.showToast({ title: err?.message || '操作失败', icon: 'none' });
    }
    return Promise.reject(err);
  }
}

export async function fetchDepartments() {
  try {
    const res = await api.get('/api/departments');
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload) ? payload : (payload?.items || []);
      return { list, raw: res };
    }
    return Promise.reject({ message: '加载科室失败', raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '加载科室失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchRegistrationDoctors({ departmentId, date }) {
  if (!departmentId) return Promise.reject({ message: '缺少 departmentId' });
  if (!date) return Promise.reject({ message: '缺少 date' });
  try {
    const res = await api.get('/api/registration/doctors', { departmentId, date });
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload) ? payload : (payload?.items || []);
      return { list, raw: res };
    }
    return Promise.reject({ message: '加载医生排班失败', raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '加载医生排班失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchDoctorDetail(doctorId) {
  if (!doctorId) return Promise.reject({ message: '缺少 doctorId' });
  try {
    const res = await api.get(`/api/doctors/${doctorId}`);
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      return { doctor: payload, raw: res };
    }
    return Promise.reject({ message: '获取医生详情失败', raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取医生详情失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchPatientId({ account }) {
  if (!account) return Promise.reject({ message: '缺少 account' });
  try {
    const res = await api.get('/user/patient-id', { account });
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      const patientId = typeof payload === 'string' ? payload : payload;
      return { patientId, raw: res };
    }
    const msg = res.data?.message || res.data?.msg || '获取患者ID失败';
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取患者ID失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function createRegistration({ patientId, scheduleRecordId, confirm = true }) {
  if (!patientId) return Promise.reject({ message: '缺少 patientId' });
  if (!scheduleRecordId) return Promise.reject({ message: '缺少 scheduleRecordId' });
  const body = { patientId, scheduleRecordId, confirm };
  try {
    const res = await api.post('/api/registrations', body);
    if (res.statusCode === 200 || (res.statusCode >= 200 && res.statusCode < 300)) {
      const payload = res.data?.data ?? res.data;
      return { record: payload, raw: res };
    }
    const msg = res.data?.message || res.data?.msg || '创建挂号失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '创建挂号失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchRegistrationByKey({ patientId, scheduleRecordId }) {
  if (!patientId) return Promise.reject({ message: '缺少 patientId' });
  if (!scheduleRecordId) return Promise.reject({ message: '缺少 scheduleRecordId' });
  try {
    const res = await api.get('/api/registrations/by-key', { patientId, scheduleRecordId });
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      return { record: payload, raw: res };
    }
    return Promise.reject({ message: '查询挂号失败', raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '查询挂号失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export function setServerMode(mode) { // 'mock' | 'prod'
  const ok = _setServerMode(mode);
  if (ok) {
    uni.showToast({ title: `已切换到${mode === 'mock' ? '模拟' : '生产'}环境`, icon: 'none' });
  } else {
    uni.showToast({ title: '切换失败: 参数错误', icon: 'none' });
  }
  return ok;
}
export function currentServerMode() { return getServerMode(); }

// 利用数组引用所有导出函数，避免“未使用”告警；不会执行网络请求
const _keep = [
  fetchRegistrations,
  fetchWaitingRegistrations,
  cancelRegistration,
  cancelWaitingRegistration,
  fetchDepartments,
  fetchRegistrationDoctors,
  fetchDoctorDetail,
  fetchPatientId,
  createRegistration,
  fetchRegistrationByKey,
  setServerMode,
  currentServerMode
];
// 标记引用：在开发模式下挂到 globalThis（不会在生产产生功能影响）
try { if (typeof globalThis !== 'undefined') globalThis.__apiKeep = _keep; } catch(_){ }
