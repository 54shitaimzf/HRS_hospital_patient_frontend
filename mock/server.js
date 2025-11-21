// 简易本地 Mock 服务器，用于在后端与数据库关闭情况下进行前端页面调试。
// 运行方式：npm run mock

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 模拟内存数据
let registrations = []; // 普通挂号
let waitingQueueBySchedule = {}; // key: scheduleRecordId, value: array of waiting objects
let users = [
  { account: 'testuser', password: '123456' }
]; // 用户数据

// Updated doctorList with detailed information based on the API documentation
const doctorList = [
  {
    doctorId: 'DOC001',
    name: '杨毅',
    title: '主任医师',
    specialty: '高血压、冠心病等心血管疾病',
    schedules: [
      {
        scheduleRecordId: 'SCH1001',
        timePeriodName: '上午',
        startTime: '08:00:00',
        endTime: '12:00:00',
        registrationFee: 50,
        leftSourceCount: 5
      }
    ]
  },
  {
    doctorId: 'DOC002',
    name: '李蕙',
    title: '副主任医师',
    specialty: '糖尿病、甲状腺疾病',
    schedules: [
      {
        scheduleRecordId: 'SCH1002',
        timePeriodName: '下午',
        startTime: '13:30:00',
        endTime: '17:30:00',
        registrationFee: 40,
        leftSourceCount: 3
      }
    ]
  },
  {
    doctorId: 'DOC003',
    name: '李蕴微',
    title: '主治医师',
    specialty: '呼吸系统疾病',
    schedules: [
      {
        scheduleRecordId: 'SCH1003',
        timePeriodName: '晚上',
        startTime: '18:00:00',
        endTime: '21:00:00',
        registrationFee: 30,
        leftSourceCount: 0 // No remaining slots
      }
    ]
  }
];

// 生成示例患者与 token 验证（简单跳过）
function ensureDemoData() {
  if (registrations.length === 0) {
    registrations.push({
      patientId: 'PAT0001',
      scheduleRecordId: 'SCH1001',
      scheduleDate: new Date().toISOString().split('T')[0],
      timePeriodName: '上午',
      registerTime: new Date().toISOString(),
      status: '已预约',
      departmentId: 'DEP001',
      doctorId: 'DOC001'
    });
  }
}
ensureDemoData();

// 获取 patientId (模拟)
app.get('/user/patient-id', (req, res) => {
  const { account } = req.query;
  if (!account) return res.status(400).json({ code: 400, message: 'missing account', data: null });
  return res.json({ code: 200, message: 'success', data: 'PAT0001' });
});

// 挂号列表查询
app.get('/api/registrations', (req, res) => {
  const { patientId, page = 1, pageSize = 10, status } = req.query;
  if (!patientId) return res.status(400).json({ code: 400, message: '缺少 patientId' });
  let list = registrations.filter(r => r.patientId === patientId);
  if (status && status !== '全部') list = list.filter(r => r.status === status);
  const p = Number(page);
  const ps = Number(pageSize);
  const start = (p - 1) * ps;
  const paged = list.slice(start, start + ps);
  res.json({ page: p, pageSize: ps, total: list.length, items: paged });
});

// 预约挂号
app.post('/api/registrations', (req, res) => {
  const { patientId, scheduleRecordId } = req.body;
  if (!patientId || !scheduleRecordId) return res.status(400).json({ code: 400, message: '参数缺失' });

  // 调试日志：输出当前挂号记录
  console.log('Current registrations:', registrations);

  const exists = registrations.find(r => r.patientId === patientId && r.scheduleRecordId === scheduleRecordId);
  if (exists) return res.status(409).json({ code: 409, message: '已存在挂号' });

  // 查找医生并减少剩余名额
  const doctor = doctorList.find(doc => doc.schedules.some(s => s.scheduleRecordId === scheduleRecordId));
  if (doctor) {
    const schedule = doctor.schedules.find(s => s.scheduleRecordId === scheduleRecordId);
    if (schedule && schedule.leftSourceCount > 0) {
      schedule.leftSourceCount -= 1;
    } else {
      return res.status(400).json({ code: 400, message: '号源不足' });
    }
  }

  registrations.push({
    patientId,
    scheduleRecordId,
    scheduleDate: new Date().toISOString().split('T')[0],
    timePeriodName: '下午',
    registerTime: new Date().toISOString(),
    status: '已预约',
    departmentId: 'DEP002',
    doctorId: 'DOC002'
  });
  res.status(201).json({ code: 201, message: 'created' });
});

// 取消挂号
app.post('/api/registrations/cancel/:id', (req, res) => {
  const { id } = req.params;
  const target = registrations.find(r => r.scheduleRecordId === id);
  if (!target) return res.status(404).json({ code: 404, message: '未找到挂号' });
  target.status = '已取消';
  res.json({ code: 200, message: '取消成功' });
});

// 创建候补挂号
app.post('/api/registrations/waiting', (req, res) => {
  const { patientId, scheduleRecordId } = req.body;
  if (!patientId || !scheduleRecordId) return res.status(400).json({ code: 400, message: '参数缺失' });
  const queue = waitingQueueBySchedule[scheduleRecordId] || [];
  if (queue.find(w => w.patientId === patientId)) {
    return res.status(409).json({ code: 409, message: '不可重复候补' });
  }
  const waitingId = 'WAIT' + Math.floor(Math.random() * 100000);
  const waitingObj = {
    waitingId,
    patientId,
    scheduleRecordId,
    applyTime: new Date().toISOString(),
    status: '排队中',
    position: queue.length + 1
  };
  queue.push(waitingObj);
  waitingQueueBySchedule[scheduleRecordId] = queue;
  res.json(waitingObj);
});

// 查询候补挂号队列
app.get('/api/registrations/waiting', (req, res) => {
  const { scheduleRecordId } = req.query;
  if (!scheduleRecordId) return res.status(400).json({ code: 400, message: '缺少 scheduleRecordId' });
  const queue = waitingQueueBySchedule[scheduleRecordId] || [];
  res.json({ scheduleRecordId, waitingCount: queue.length, waitingList: queue });
});

// 查询患者候补挂号记录
app.get('/api/registrations/waiting/patient', (req, res) => {
  const { patientId } = req.query;
  if (!patientId) return res.status(400).json({ code: 400, message: '缺少 patientId' });
  const all = Object.values(waitingQueueBySchedule).flat();
  const mine = all.filter(w => w.patientId === patientId);
  res.json({ patientId, items: mine });
});

// 取消候补挂号
app.delete('/api/registrations/waiting', (req, res) => {
  const { waitingId, patientId } = req.query;
  if (!waitingId || !patientId) return res.status(400).json({ code: 400, message: '缺少参数' });
  for (const [key, queue] of Object.entries(waitingQueueBySchedule)) {
    const idx = queue.findIndex(w => w.waitingId === waitingId && w.patientId === patientId);
    if (idx !== -1) {
      queue[idx].status = '已取消';
      return res.json({ waitingId, patientId, status: '已取消' });
    }
  }
  res.status(404).json({ code: 404, message: '未找到候补记录' });
});

// 简单医生排班模拟
app.get('/api/registration/doctors', (req, res) => {
  const { departmentId, date } = req.query;
  const schedules = doctorList.map(doc => ({
    doctorId: doc.doctorId,
    doctorName: doc.name,
    doctorTitle: doc.title,
    schedules: doc.schedules.map(s => ({
      scheduleRecordId: s.scheduleRecordId,
      timePeriodName: s.timePeriodName,
      startTime: s.startTime,
      endTime: s.endTime,
      registrationFee: s.registrationFee,
      leftSourceCount: s.leftSourceCount
    }))
  }));
  res.json(schedules);
});

// 医生详情模拟
app.get('/api/doctors/:id', (req, res) => {
  res.json({ id: req.params.id, name: '张医生', title: '主任医师', specialty: '内科综合', details: '多年临床经验' });
});

// 获取科室列表
app.get('/api/departments', (req, res) => {
  res.json([
    {
      "id": "DEP001",
      "name": "内科",
      "subDepartments": [
        { "id": "DEP005", "name": "心内科门诊" },
        { "id": "DEP006", "name": "肾内科门诊" },
        { "id": "DEP007", "name": "血液科门诊" },
        { "id": "DEP008", "name": "感染内科门诊" },
        { "id": "DEP009", "name": "肝炎门诊" }
      ]
    },
    {
      "id": "DEP002",
      "name": "外科",
      "subDepartments": [
        { "id": "DEP010", "name": "普外科门诊" },
        { "id": "DEP011", "name": "骨科门诊" }
      ]
    }
  ]);
});

// 查询单条挂号（按复合键）
app.get('/api/registrations/by-key', (req, res) => {
  const { patientId, scheduleRecordId } = req.query;
  if (!patientId || !scheduleRecordId) {
    return res.status(400).json({ code: 400, message: '参数缺失' });
  }
  const registration = registrations.find(r => r.patientId === patientId && r.scheduleRecordId === scheduleRecordId);
  if (registration) {
    res.json(registration);
  } else {
    // 返回一个符合文档格式的示例数据，即使在 registrations 数组中找不到
    res.json({
      "patientId": patientId,
      "scheduleRecordId": scheduleRecordId,
      "registerTime": "2025-11-15 09:30:12",
      "status": "已预约",
      "doctorId": "DOC0023",
      "departmentId": "DEP005",
      "scheduleDate": "2025-11-15",
      "timePeriodName": "上午"
    });
  }
});

// 取消挂号（按复合键）
app.delete('/api/registrations', (req, res) => {
  const { patientId, scheduleRecordId } = req.query;
  if (!patientId || !scheduleRecordId) {
    return res.status(400).json({ code: 400, message: '参数缺失' });
  }
  const index = registrations.findIndex(r => r.patientId === patientId && r.scheduleRecordId === scheduleRecordId);
  if (index !== -1) {
    registrations[index].status = '已取消';
  }
  // 无论是否找到，都返回成功取消的响应
  res.json({
    "patientId": patientId,
    "scheduleRecordId": scheduleRecordId,
    "status": "已取消"
  });
});

// 候补转正
app.post('/api/registrations/waiting/confirm', (req, res) => {
    const { waitingId } = req.body;
    if (!waitingId) {
        return res.status(400).json({ code: 400, message: '缺少 waitingId' });
    }

    // 模拟操作，不实现具体逻辑
    console.log(`候补转正请求: ${waitingId}`);

    res.json({
        "waitingId": waitingId,
        "status": "已成功预约",
        "registrationId": "REG" + Math.floor(Math.random() * 10000) // 模拟一个新的挂号ID
    });
});

// 用户登录 (严格模拟 UserController 行为)
app.post('/user/login', (req, res) => {
  const { account, password } = req.body || {};
  if (!account || !password) {
    return res.status(404).json({ code: 404, message: '用户不存在', data: null });
  }
  const user = users.find(u => u.account === account);
  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在', data: null });
  }
  if (user.password !== password) {
    return res.status(401).json({ code: 401, message: '密码错误', data: null });
  }
  // 登录成功，返回一个模拟 token（Result<String> 的 data 部分当作 token）
  return res.json({ code: 200, message: '登录成功', data: 'mock-token-' + account });
});

// 用户注册 (严格模拟 UserController 行为，兼容前端 Register.vue 字段)
app.post('/user/register', (req, res) => {
  let { account, password, userAccount, userPassword } = req.body || {};
  // 兼容前端提交字段名 userAccount/userPassword
  account = account || userAccount;
  password = password || userPassword;
  if (!account || !password) {
    return res.status(400).json({ code: 400, message: '注册失败', data: null });
  }
  const exists = users.find(u => u.account === account);
  if (exists) {
    return res.status(409).json({ code: 409, message: '账户已存在', data: null });
  }
  users.push({ account, password });
  return res.json({
    code: 200,
    message: '注册成功',
    data: {
      userId: 'mock-user-id-' + (users.length + 1000),
      account,
      createdAt: new Date().toISOString()
    }
  });
});

// 回退获取当前患者信息（供 ensurePatientId 兼容）
app.get('/api/patients/me', (req, res) => {
  // 简单返回与登录账号关联的 patientId；未登录时返回 401
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer mock-token-')) {
    return res.status(401).json({ code: 401, message: '未登录', data: null });
  }
  const account = auth.replace('Bearer mock-token-', '') || 'testuser';
  res.json({
    code: 200,
    message: 'ok',
    data: {
      patientId: 'PAT0001',
      account,
      id: 'PAT0001'
    }
  });
});

// 忘记密码
app.post('/api/forget-pwd', (req, res) => {
    const { phone, newPassword } = req.body;
    if (phone && newPassword) {
        res.json({ code: 200, message: '密码重置成功' });
    } else {
        res.status(400).json({ code: 400, message: '缺少必要信息' });
    }
});

// 获取用户信息
app.get('/api/profile', (req, res) => {
  res.json({
    id: 'USER001',
    name: '张三',
    phone: '13800138000',
    idCard: '11010119900307001X',
    gender: '男'
  });
});

// 更新用户信息
app.put('/api/profile', (req, res) => {
  res.json({ code: 200, message: '用户信息更新成功' });
});

// 获取就诊人列表
app.get('/api/patients', (req, res) => {
  res.json([
    { id: 'PAT001', name: '李四', relation: '本人', idCard: '11010119900307002X', phone: '13800138001', isDefault: true },
    { id: 'PAT002', name: '王五', relation: '家属', idCard: '11010119900307003X', phone: '13800138002', isDefault: false }
  ]);
});

// 添加就诊人
app.post('/api/patients', (req, res) => {
    res.status(201).json({ code: 201, message: '就诊人添加成功' });
});

// 获取处方列表
app.get('/api/prescriptions', (req, res) => {
    res.json([
        { id: 'PRE001', date: '2025-11-10', department: '心内科', doctor: '王医生', diagnosis: '高血压', status: '已缴费' },
        { id: 'PRE002', date: '2025-11-12', department: '骨科', doctor: '李医生', diagnosis: '骨折', status: '待缴费' }
    ]);
});

// 获取病历列表
app.get('/api/records', (req, res) => {
    res.json([
        { id: 'REC001', date: '2025-11-10', department: '心内科', doctor: '王医生', diagnosis: '高血压' },
        { id: 'REC002', date: '2025-11-12', department: '骨科', doctor: '李医生', diagnosis: '骨折' }
    ]);
});

// 获取检查报告列表
app.get('/api/inspections', (req, res) => {
    res.json([
        { id: 'INSP001', date: '2025-11-11', name: '血常规', department: '检验科', status: '报告已出' },
        { id: 'INSP002', date: '2025-11-13', name: 'X光胸片', department: '放射科', status: '检查中' }
    ]);
});

// 获取检查报告详情
app.get('/api/inspections/:id', (req, res) => {
    res.json({
        id: req.params.id,
        name: '血常规',
        patientName: '李四',
        date: '2025-11-11',
        department: '检验科',
        doctor: '检验医师A',
        details: [
            { item: '白细胞计数', value: '8.5', unit: 'x10^9/L', range: '4.0-10.0' },
            { item: '血红蛋白', value: '150', unit: 'g/L', range: '120-160' }
        ],
        conclusion: '各项指标在正常范围内。'
    });
});

const PORT = 8082;
app.listen(PORT, () => console.log(`Mock server running at http://localhost:${PORT}`));
