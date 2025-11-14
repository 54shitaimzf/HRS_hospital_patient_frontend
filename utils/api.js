// 统一请求封装：自动附带 Authorization，处理 401，统一错误提示

const BASE_URL = 'http://localhost:8082';

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

