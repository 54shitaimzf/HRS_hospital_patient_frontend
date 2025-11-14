// 用户信息存取统一工具
// 处理后端可能返回 id 或 patientId，并统一持久化到 'user' 与 'userInfo'

function safeParse(str) {
  if (typeof str !== 'string') return null;
  const t = str.trim();
  const first = t[0];
  if (first !== '{' && first !== '[') return null; // 非 JSON 格式直接返回 null
  try {
    return JSON.parse(t);
  } catch (e) {
    return null;
  }
}

function extractPatientId(obj) {
  if (!obj || typeof obj !== 'object') return null;
  // 常见字段
  const direct = obj.patientId || obj.id || obj.userId;
  if (direct) return String(direct);
  // 嵌套字段
  const fromPatient = obj.patient?.patientId || obj.patient?.id;
  if (fromPatient) return String(fromPatient);
  const fromUser = obj.user?.patientId || obj.user?.id;
  if (fromUser) return String(fromUser);
  const profile = obj.profile || obj.account || obj.data;
  if (profile) {
    const nested = profile.patientId || profile.id || profile.userId;
    if (nested) return String(nested);
  }
  return null;
}

export function storeUser(raw) {
  let obj = raw;
  if (typeof raw === 'string') {
    const parsed = safeParse(raw);
    if (parsed) obj = parsed; // 如果字符串是合法 JSON
  }
  if (!obj || typeof obj !== 'object') return;
  // 归一化 patientId
  const pid = extractPatientId(obj);
  if (pid && !obj.patientId) obj.patientId = pid;
  // 冗余存储两个 key 以兼容旧代码
  uni.setStorageSync('user', obj);
  uni.setStorageSync('userInfo', obj);
}

export function getUser() {
  let data = uni.getStorageSync('user') || uni.getStorageSync('userInfo');
  if (typeof data === 'string') {
    const parsed = safeParse(data);
    if (parsed) data = parsed; else return null; // 字符串且不可解析，视为无效
  }
  if (data && typeof data === 'object') {
    const pid = extractPatientId(data);
    if (pid && !data.patientId) data.patientId = pid;
    return data;
  }
  return null;
}

export function getPatientId() {
  const user = getUser();
  return user?.patientId || null;
}
