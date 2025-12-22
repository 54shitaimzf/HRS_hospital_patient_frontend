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

function toQueryPairs(params = {}) {
  const pairs = [];
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v === undefined || v === null || v === '') return;
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
      });
    } else {
      const normalized = typeof value === 'object' ? JSON.stringify(value) : value;
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(normalized)}`);
    }
  });
  return pairs;
}

function appendQueryParams(url, params = {}) {
  const querySegments = toQueryPairs(params);
  if (!querySegments.length) return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}${querySegments.join('&')}`;
}

function isPlainObject(val) {
  return Object.prototype.toString.call(val) === '[object Object]';
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
  del: (url, payload = {}, header = {}, options = {}) => {
    const useBody = options.asBody === true || !isPlainObject(payload);
    if (useBody) {
      return request({ url, method: 'DELETE', data: payload, header });
    }
    const finalUrl = appendQueryParams(url, payload);
    return request({ url: finalUrl, method: 'DELETE', header });
  },
  put: (url, body = {}, header = {}) => request({ url, method: 'PUT', data: body, header }),
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

export async function createWaitingRegistration({ patientId, scheduleRecordId }) {
  if (!patientId || !scheduleRecordId) return Promise.reject({ message: '缺少 patientId 或 scheduleRecordId' });
  try {
    const res = await api.post('/api/registrations/waiting', { patientId, scheduleRecordId });
    if (res.statusCode === 201 || (res.statusCode >= 200 && res.statusCode < 300)) {
      const payload = res.data?.data ?? res.data;
      uni.showToast({ title: '候补申请已提交', icon: 'success' });
      return { waiting: payload, raw: res };
    }
    const msg = res.data?.message || res.data?.msg || '候补申请失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '候补申请失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchWaitingQueue({ scheduleRecordId }) {
  if (!scheduleRecordId) return Promise.reject({ message: '缺少 scheduleRecordId' });
  try {
    const res = await api.get('/api/registrations/waiting', { scheduleRecordId });
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      const waitingList = payload.waitingList || [];
      return {
        waitingList,
        waitingCount: payload.waitingCount ?? waitingList.length,
        scheduleRecordId: payload.scheduleRecordId || scheduleRecordId,
        raw: res
      };
    }
    const msg = res.data?.message || res.data?.msg || '获取候补队列失败';
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取候补队列失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function confirmWaitingRegistration({ waitingId }) {
  if (!waitingId) return Promise.reject({ message: '缺少 waitingId' });
  try {
    const res = await api.post('/api/registrations/waiting/confirm', { waitingId });
    if (res.statusCode === 200 || (res.statusCode >= 200 && res.statusCode < 300)) {
      const payload = res.data?.data ?? res.data;
      return { result: payload, raw: res };
    }
    const msg = res.data?.message || res.data?.msg || '候补转正失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '候补转正失败', icon: 'none' });
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

export async function fetchUnreadMessages({ patientId }) {
  if (!patientId) return Promise.reject({ message: '缺少 patientId' });
  try {
    const res = await api.post(`/api/patients/${encodeURIComponent(patientId)}/messages`);
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? {};
      const hasNew = Boolean(payload.status);
      const messages = Array.isArray(payload.messages) ? payload.messages : [];
      return { hasNew, messages, raw: res };
    }
    const msg = res.data?.message || res.data?.msg || '获取未读消息失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取未读消息失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function loginUser({ account, password }) {
  if (!account || !password) return Promise.reject({ message: '缺少账号或密码' });
  try {
    const res = await api.post('/user/login', { account, password });
    if (res?.data && (res.data.code === 200 || res.data.code === '200')) {
      const payload = res.data?.data ?? res.data;
      let token = '';
      let userInfo = {};
      if (typeof payload === 'string') {
        token = payload;
      } else if (payload && typeof payload === 'object') {
        if (typeof payload.token === 'string') token = payload.token;
        if (payload.user && typeof payload.user === 'object') userInfo = payload.user;
        else if (payload.userInfo && typeof payload.userInfo === 'object') userInfo = payload.userInfo;
        else userInfo = payload;
      }
      uni.showToast({ title: '登录成功', icon: 'success' });
      return { token, userInfo, raw: res };
    }
    const msg = res.data?.message || res.data?.msg || '登录失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '登录失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function registerUser(registerData = {}) {
  if (!registerData.userAccount || !registerData.userPassword) {
    return Promise.reject({ message: '注册信息不完整' });
  }
  try {
    const res = await api.post('/user/register', registerData);
    if (res?.data && (res.data.code === 200 || res.data.code === '200')) {
      const payload = res.data?.data ?? res.data;
      uni.showToast({ title: '注册成功', icon: 'success' });
      return { payload, raw: res };
    }
    const msg = res.data?.msg || res.data?.message || '注册失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '注册失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function sendEmailVerification({ email, scene = 'REGISTER' }) {
  if (!email) return Promise.reject({ message: '缺少邮箱地址' });
  try {
    const res = await api.post('/api/email-verification/send', { email, scene });
    if (res.statusCode === 200 && res.data?.code === 200) {
      const payload = res.data?.data ?? res.data;
      uni.showToast({ title: '验证码已发送', icon: 'success' });
      return {
        email: payload.email || email,
        scene: payload.scene || scene,
        expireSeconds: payload.expireSeconds || 300,
        raw: res
      };
    }
    const msg = res.data?.msg || res.data?.message || '发送验证码失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '发送验证码失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function verifyEmailCode({ email, code, scene = 'REGISTER' }) {
  if (!email || !code) return Promise.reject({ message: '缺少邮箱或验证码' });
  try {
    const res = await api.post('/api/email-verification/verify', { email, code, scene });
    if (res.statusCode === 200 && res.data?.code === 200) {
      const payload = res.data?.data ?? res.data;
      const verified = payload.verified === true;
      if (verified) {
        uni.showToast({ title: '验证成功', icon: 'success' });
      }
      return {
        verified,
        email: payload.email || email,
        scene: payload.scene || scene,
        raw: res
      };
    }
    const msg = res.data?.msg || res.data?.message || '验证码错误';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, verified: false, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '验证失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function sendPasswordResetCode({ email }) {
  if (!email) return Promise.reject({ message: '缺少邮箱地址' });
  try {
    const res = await api.post('/api/password-reset/send', { email });
    if (res.statusCode === 200 && res.data?.code === 200) {
      const payload = res.data?.data ?? res.data;
      uni.showToast({ title: '验证码已发送', icon: 'success' });
      return {
        email: payload.email || email,
        scene: payload.scene || 'RESET_PASSWORD',
        expireSeconds: payload.expireSeconds || 300,
        raw: res
      };
    }
    const msg = res.data?.msg || res.data?.message || '发送验证码失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '发送验证码失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function confirmPasswordReset({ email, code, newPassword, confirmPassword }) {
  if (!email || !code || !newPassword || !confirmPassword) {
    return Promise.reject({ message: '缺少必填参数' });
  }
  if (newPassword !== confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' });
    return Promise.reject({ message: '两次密码不一致', reset: false });
  }
  try {
    const res = await api.post('/api/password-reset/confirm', {
      email,
      code,
      newPassword,
      confirmPassword
    });
    if (res.statusCode === 200 && res.data?.code === 200) {
      const payload = res.data?.data ?? res.data;
      const reset = payload.reset === true;
      if (reset) {
        uni.showToast({ title: '密码重置成功', icon: 'success' });
      }
      return {
        reset,
        email: payload.email || email,
        raw: res
      };
    }
    const msg = res.data?.msg || res.data?.message || '重置密码失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, reset: false, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '重置密码失败', icon: 'none' });
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

export async function submitExtraApply({ patientId, departmentId, doctorId, appointmentDate, reason }) {
  if (!patientId || !departmentId || !doctorId || !appointmentDate || !reason) {
    return Promise.reject({ message: '加号申请缺少必填参数' });
  }
  const body = { patientId, departmentId, doctorId, appointmentDate, reason };
  try {
    const res = await api.post('/api/extra-apply', body);
    if (res.statusCode === 201 || (res.statusCode >= 200 && res.statusCode < 300)) {
      const payload = res.data?.data ?? res.data;
      uni.showToast({ title: '加号申请已提交', icon: 'success' });
      return { apply: payload, raw: res };
    }
    const msg = res.data?.message || res.data?.msg || '加号申请失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '加号申请失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchExtraApplyDetail(id) {
  if (!id) return Promise.reject({ message: '缺少申请 ID' });
  try {
    const res = await api.get(`/api/extra-apply/${encodeURIComponent(id)}`);
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      return { apply: payload, raw: res };
    }
    const msg = res.data?.message || res.data?.msg || '获取申请详情失败';
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取申请详情失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchExtraApplyList({ patientId }) {
  if (!patientId) return Promise.reject({ message: '缺少 patientId' });
  try {
    const res = await api.get('/api/extra-apply', { patientId });
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload) ? payload : payload?.items || [];
      return { list, raw: res };
    }
    const msg = res.data?.message || res.data?.msg || '获取加号申请列表失败';
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取加号申请列表失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function submitDoctorReview({ registrationId, patientId, doctorId, rating, comment, anonymous = false }) {
  if (!registrationId || !patientId || !doctorId) return Promise.reject({ message: '缺少必填参数' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return Promise.reject({ message: '评分需为 1-5 的整数' });
  const body = { registrationId, patientId, doctorId, rating, comment, anonymous };
  try {
    const res = await api.post('/api/reviews', body);
    if (res.statusCode === 201 || (res.statusCode >= 200 && res.statusCode < 300)) {
      const payload = res.data?.data ?? res.data;
      uni.showToast({ title: '评价成功', icon: 'success' });
      return { review: payload, raw: res };
    }
    const msg = res.data?.msg || res.data?.message || '提交评价失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '提交评价失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchDoctorReviews({ doctorId, page = 1, pageSize = 20 }) {
  if (!doctorId) return Promise.reject({ message: '缺少 doctorId' });
  try {
    const res = await api.get(`/api/doctors/${doctorId}/reviews`, { page, pageSize });
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      const list = payload.items || [];
      return {
        list,
        page: payload.page ?? page,
        pageSize: payload.pageSize ?? pageSize,
        total: payload.total ?? list.length,
        raw: res
      };
    }
    const msg = res.data?.msg || res.data?.message || '获取评价列表失败';
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取反馈失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchReviewDetail(reviewId) {
  if (!reviewId) return Promise.reject({ message: '缺少 reviewId' });
  try {
    const res = await api.get(`/api/reviews/${reviewId}`);
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      return { review: payload, raw: res };
    }
    const msg = res.data?.msg || res.data?.message || '获取评价详情失败';
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取评价详情失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchDoctorReviewStat(doctorId) {
  if (!doctorId) return Promise.reject({ message: '缺少 doctorId' });
  try {
    const res = await api.get(`/api/doctors/${doctorId}/reviews/stat`);
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      return { stat: payload, raw: res };
    }
    const msg = res.data?.msg || res.data?.message || '获取评价统计失败';
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取评价统计失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function submitSystemFeedback({ userId, type, title, description, contact }) {
  if (!userId || !type) return Promise.reject({ message: '缺少 userId 或 type' });
  const body = { userId, type, title, description, contact };
  try {
    const res = await api.post('/api/feedbacks', body);
    if (res.statusCode === 201 || (res.statusCode >= 200 && res.statusCode < 300)) {
      const payload = res.data?.data ?? res.data;
      uni.showToast({ title: '反馈已提交', icon: 'success' });
      return { feedback: payload, raw: res };
    }
    const msg = res.data?.msg || res.data?.message || '提交反馈失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '提交反馈失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchUserFeedbacks({ userId, page = 1, pageSize = 20 }) {
  if (!userId) return Promise.reject({ message: '缺少 userId' });
  try {
    const res = await api.get('/api/feedbacks', { userId, page, pageSize });
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      const list = payload.items || [];
      return {
        list,
        page: payload.page ?? page,
        pageSize: payload.pageSize ?? pageSize,
        total: payload.total ?? list.length,
        raw: res
      };
    }
    const msg = res.data?.msg || res.data?.message || '获取反馈列表失败';
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取反馈失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchAdminFeedbacks({ status, type, page = 1, pageSize = 20 } = {}) {
  try {
    const params = { page, pageSize };
    if (status) params.status = status;
    if (type) params.type = type;
    const res = await api.get('/api/feedbacks/admin', params);
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      const list = payload.items || [];
      return {
        list,
        page: payload.page ?? page,
        pageSize: payload.pageSize ?? pageSize,
        total: payload.total ?? list.length,
        raw: res
      };
    }
    const msg = res.data?.msg || res.data?.message || '获取全部反馈失败';
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取全部反馈失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchFeedbackDetail(feedbackId) {
  if (!feedbackId) return Promise.reject({ message: '缺少 feedbackId' });
  try {
    const res = await api.get(`/api/feedbacks/${feedbackId}`);
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      return { feedback: payload, raw: res };
    }
    const msg = res.data?.msg || res.data?.message || '获取反馈详情失败';
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取反馈详情失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function updateFeedbackStatus({ feedbackId, status, operatorId, comment }) {
  if (!feedbackId || !status || !operatorId) return Promise.reject({ message: '缺少必填参数' });
  const body = { status, operatorId, comment };
  try {
    const res = await api.put(`/api/feedbacks/${feedbackId}/status`, body);
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      uni.showToast({ title: '状态已更新', icon: 'success' });
      return { feedback: payload, raw: res };
    }
    const msg = res.data?.msg || res.data?.message || '更新状态失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '更新状态失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchPayments({ patientId }) {
  if (!patientId) return Promise.reject({ message: '缺少 patientId' });
  try {
    const res = await api.get('/api/payments', { patientId });
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      const list = payload.payments || [];
      return {
        list,
        total: payload.total ?? list.length,
        raw: res
      };
    }
    const msg = res.data?.msg || res.data?.message || '获取订单列表失败';
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取订单列表失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function fetchPaymentDetail(paymentId) {
  if (!paymentId) return Promise.reject({ message: '缺少 paymentId' });
  try {
    const res = await api.get(`/api/payments/${paymentId}`);
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      return { payment: payload, raw: res };
    }
    const msg = res.data?.msg || res.data?.message || '获取订单详情失败';
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '获取订单详情失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function payOrder(paymentId) {
  if (!paymentId) return Promise.reject({ message: '缺少 paymentId' });
  try {
    const res = await api.post(`/api/payments/${paymentId}/pay`);

    console.log('========== 支付接口返回数据结构 ==========');
    console.log('完整响应对象:', JSON.stringify(res, null, 2));
    console.log('状态码:', res.statusCode);
    console.log('响应数据:', JSON.stringify(res.data, null, 2));
    console.log('==========================================');

    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;

      // 验证支付状态是否真的变成"已支付"
      if (payload && payload.payStatus === '已支付') {
        uni.showToast({ title: '支付成功', icon: 'success' });
        return { payment: payload, raw: res };
      }

      // 状态码200但状态不是"已支付"，视为支付失败
      const status = payload?.payStatus || '未知';
      const dataStructure = JSON.stringify(res.data, null, 2);
      const msg = `支付未完成，当前状态：${status}\n\n返回的数据结构：\n${dataStructure}`;

      console.error('========== 支付状态不正确 ==========');
      console.error('期望状态: 已支付');
      console.error('实际状态:', status);
      console.error('完整数据结构:', dataStructure);
      console.error('===================================');

      uni.showModal({
        title: '支付状态异常',
        content: `当前状态：${status}\n\n完整返回数据：\n${dataStructure}`,
        showCancel: true,
        confirmText: '确定',
        cancelText: '复制数据',
        success: (modalRes) => {
          if (modalRes.cancel) {
            uni.setClipboardData({
              data: dataStructure,
              success: () => {
                uni.showToast({ title: '数据已复制', icon: 'success' });
              }
            });
          }
        }
      });

      return Promise.reject({ message: msg, raw: res, payment: payload });
    }
    const msg = res.data?.msg || res.data?.message || '支付失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    console.error('========== 支付请求异常 ==========');
    console.error('错误信息:', err);
    console.error('==================================');
    if (!err?.silent) uni.showToast({ title: err?.message || '支付失败', icon: 'none' });
    return Promise.reject(err);
  }
}

export async function cancelOrder(paymentId) {
  if (!paymentId) return Promise.reject({ message: '缺少 paymentId' });
  try {
    const res = await api.del(`/api/payments/${paymentId}`);
    if (res.statusCode === 200) {
      const payload = res.data?.data ?? res.data;
      uni.showToast({ title: '订单已取消', icon: 'success' });
      return { payment: payload, raw: res };
    }
    const msg = res.data?.msg || res.data?.message || '取消订单失败';
    uni.showToast({ title: msg, icon: 'none' });
    return Promise.reject({ message: msg, raw: res });
  } catch (err) {
    if (!err?.silent) uni.showToast({ title: err?.message || '取消订单失败', icon: 'none' });
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

// 利用数组引用所有导出函数，避免"未使用"告警；不会执行网络请求
const _keep = [
  fetchRegistrations,
  fetchWaitingRegistrations,
  cancelRegistration,
  cancelWaitingRegistration,
  createWaitingRegistration,
  fetchWaitingQueue,
  confirmWaitingRegistration,
  fetchDepartments,
  fetchRegistrationDoctors,
  fetchDoctorDetail,
  fetchPatientId,
  fetchUnreadMessages,
  loginUser,
  registerUser,
  sendEmailVerification,
  verifyEmailCode,
  sendPasswordResetCode,
  confirmPasswordReset,
  createRegistration,
  fetchRegistrationByKey,
  submitExtraApply,
  fetchExtraApplyDetail,
  fetchExtraApplyList,
  submitDoctorReview,
  fetchDoctorReviews,
  fetchReviewDetail,
  fetchDoctorReviewStat,
  submitSystemFeedback,
  fetchUserFeedbacks,
  fetchAdminFeedbacks,
  fetchFeedbackDetail,
  updateFeedbackStatus,
  fetchPayments,
  fetchPaymentDetail,
  payOrder,
  cancelOrder,
  setServerMode,
  currentServerMode
];
// 标记引用：在开发模式下挂到 globalThis（不会在生产产生功能影响）
try { if (typeof globalThis !== 'undefined') globalThis.__apiKeep = _keep; } catch(_){ }
