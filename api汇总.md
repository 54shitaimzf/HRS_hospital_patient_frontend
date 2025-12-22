**汇总**

**患者端接口汇总文档**

**文档说明**

本文档汇总了患者端所有功能模块的接口定义，包括候补挂号、评价反馈、消息通知、订单管理和支付功能。

**生成时间**: 2025-12-20
**来源文档数量**: 9个

**目录**

候补挂号接口

评价与反馈接口

消息通知接口

挂号接口

订单管理接口

支付相关接口

接口冲突说明

前端实现问题修复记录

**1. 候补挂号接口**

**1.1 创建候补挂号**

**接口**: POST /api/registrations/waiting

**功能**: 患者申请候补挂号

**请求体**:

JSON
{
  "patientId": "PAT0001",
  "scheduleRecordId": "SCH7890"
}

**成功响应** (200):

JSON
{
  "waitingId": "WAIT1234",
  "patientId": "PAT0001",
  "scheduleRecordId": "SCH7890",
  "applyTime": "2025-11-19T13:30:00",
  "status": "排队中",
  "position": 2,
  "limitCount": 3
}

**错误响应**:

400: 已达到今日候补次数上限

404: 排班记录不存在

409: 不可重复候补

**1.2 查询候补挂号队列**

**接口**: GET /api/registrations/waiting

**参数**: scheduleRecordId (required)

**功能**: 查看某个排班的候补队列

**1.3 查询患者候补挂号记录**

**接口**: GET /api/registrations/waiting/patient

**参数**:

patientId (required)

date (optional, YYYY-MM-DD)

**功能**: 查看患者的候补记录

**1.4 取消候补挂号**

**接口**: DELETE /api/registrations/waiting

**参数**:

patientId (required)

waitingId (required)

**1.5 候补转正（系统自动）**

**接口**: POST /api/registrations/waiting/confirm

**功能**: 后端服务自动调用，将候补转为正式挂号

**说明**: 前端不直接调用，由后台定时任务或号源释放时触发

**2. 评价与反馈接口**

**2.1 医生评价功能**

**2.1.1 提交评价**

**接口**: POST /api/reviews

**请求体**:

JSON
{
  "registrationId": "REG0123",
  "patientId": "PAT0001",
  "doctorId": "DOC0023",
  "rating": 5,
  "comment": "医生诊疗很认真",
  "anonymous": false
}

**成功响应** (201):

JSON
{
  "code": 201,
  "msg": "created",
  "data": {
    "reviewId": 1001,
    "rating": 5,
    "comment": "医生诊疗很认真",
    "createdAt": "2025-11-28T14:00:00"
  }
}

**校验要点**:

registrationId 必须存在且状态为"已就诊"

rating 范围 1-5

同一 registrationId 不允许重复评价

**2.1.2 查询医生评价列表**

**接口**: GET /api/doctors/{doctorId}/reviews

**参数**:

page (default: 1)

pageSize (default: 20)

**2.1.3 查询单条评价**

**接口**: GET /api/reviews/{reviewId}

**2.1.4 医生评价汇总统计**

**接口**: GET /api/doctors/{doctorId}/reviews/stat

**响应**:

JSON
{
  "code": 200,
  "data": {
    "doctorId": "DOC0023",
    "averageRating": 4.6,
    "ratingCount": 123,
    "distribution": { "5": 80, "4": 25, "3": 10, "2": 6, "1": 2 }
  }
}

**2.2 系统反馈功能**

**2.2.1 提交反馈**

**接口**: POST /api/feedbacks

**请求体**:

JSON
{
  "userId": "USER123",
  "type": "系统问题 | 建议 | 其他",
  "title": "登录异常",
  "description": "在 XX 场景下无法登录，提示 500",
  "contact": "13800138000"
}

**2.2.2 查询用户反馈列表**

**接口**: GET /api/feedbacks?userId={userId}&page=1&pageSize=20

**2.2.3 管理员查询所有反馈**

**接口**: GET /api/feedbacks/admin?status=OPEN&type=系统问题&page=1

**权限**: 需管理员或客服权限

**2.2.4 获取反馈详情**

**接口**: GET /api/feedbacks/{feedbackId}

**2.2.5 更新反馈状态（管理员）**

**接口**: PUT /api/feedbacks/{feedbackId}/status

**请求体**:

JSON
{
  "status": "IN_PROGRESS|RESOLVED|CLOSED",
  "operatorId": "ADMIN001",
  "comment": "处理说明"
}

**3. 消息通知接口**

**3.1 获取并处理患者未读消息**

**接口**: POST /api/patients/{patientId}/messages

**方法**: POST（会将消息标记为已发送）

**成功响应** (200):

JSON
{
  "code": 200,
  "message": "success",
  "data": {
    "status": true,
    "messages": [
      {
        "title": "预约成功",
        "content": "您的预约已成功，请准时就诊。",
        "timestamp": "2025-12-11T10:00:00Z"
      }
    ]
  }
}

**无消息响应**:

JSON
{
  "code": 200,
  "data": {
    "status": false,
    "messages": []
  }
}

**3.2**

1

邮箱验证码（注册用）

约定：
*- *验证码为 6 位数字字符串。
*- *验证码有效期：默认 5 分钟（后端可配置）。
*- *同一邮箱发送频率限制：默认 60 秒内只能发一次（后端可配置）。

实现说明：
*- *当前已接入 SMTP 真发送能力（*`*spring-boot-starter-mail*`*）。
*- *是否真的发邮件由配置开关控制：*`*patient.emailVerification.realSendEnabled*`*。
  *- `*false*`*：不实际发邮件（方便本地没 SMTP 时调通流程，验证码仍会生成并保存）。
  *- `*true*`*：调用 SMTP 发送验证码邮件（发送失败会返回 500 并回滚删除验证码）。
*- ***不要把 *`*spring.mail.password*` *提交到 git****，建议用环境变量或 *`*application-local.properties*` *管理。

**

3.2.1 发送邮箱验证码
**

SQL
*- *URL: *`*/api/email-verification/send*`*
*- *Method: *`*POST*`*
*- *Request Body:
  *```*json
  {
    "email": "test@example.com",
    "scene": "REGISTER"
  }
*  ```*
*- *字段说明：
  *- `*email*`*：必填，邮箱地址
  *- `*scene*`*：可选，业务场景枚举：*`*REGISTER*`*（默认）

*- *Success Response (200)：发送成功
  *```*json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "email": "test@example.com",
      "scene": "REGISTER",
      "expireSeconds": 300
    }
  }
*  ```*

*- *Error Responses：
  *- *参数错误（邮箱为空/格式不合法）
    *```*json
    { "code": 400, "msg": "邮箱格式不正确", "data": null }
*    ```*
*  - *触发频率限制
    *```*json
    { "code": 429, "msg": "发送过于频繁，请稍后再试", "data": null }
*    ```*
*  - *发送失败（SMTP/配置问题等）
    *```*json
    { "code": 500, "msg": "验证码发送失败", "data": null }
*    ```*

**3.2.2校验邮箱验证码**

SQL
*- *URL: *`*/api/email-verification/verify*`*
*- *Method: *`*POST*`*
*- *Request Body:
  *```*json
  {
    "email": "test@example.com",
    "scene": "REGISTER",
    "code": "123456"
  }
*  ```*
*- *字段说明：
  *- `*email*`*：必填
  *- `*scene*`*：可选，默认 *`*REGISTER*`*
*  - `*code*`*：必填，6 位数字

*- *Success Response (200)：校验通过
  *```*json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "verified": true,
      "email": "test@example.com",
      "scene": "REGISTER"
    }
  }
*  ```*

*- *Error Responses：
  *- *校验失败（验证码错误）
    *```*json
    { "code": 400, "msg": "验证码错误", "data": { "verified": false } }
*    ```*
*  - *验证码过期/不存在
    *```*json
    { "code": 410, "msg": "验证码已过期或不存在", "data": { "verified": false } }
*    ```*
*  - *参数错误
    *```*json
    { "code": 400, "msg": "验证码格式不正确", "data": null }
*    ```*

**
3.3**

**3.3.1忘记密码（邮箱验证码找回，v1）**

SQL

约定：
*- *验证码为 6 位数字字符串。
*- *验证码有效期：默认 5 分钟（可配置）。
*- *同一邮箱发送频率限制：默认 60 秒内只能发一次（可配置）。
*- *忘记密码场景使用 *`*scene = RESET_PASSWORD*`*。
*- ***重置密码必须先校验验证码通过****；校验通过后验证码立即失效。

实现说明：
*- *复用邮箱验证码模块（Redis 存储 + 可选 SMTP 真发送）。
*- *密码字段当前系统为明文 *`*user.pass*`*（与现有登录/注册保持一致）；如后续要改为加密存储，可在该接口统一升级。

* *1.6.1 发送“重置密码”邮箱验证码
*- *URL: *`*/api/password-reset/send*`*
*- *Method: *`*POST*`*
*- *Description: 向指定邮箱发送 6 位验证码，用于后续重置密码。
*- *Request Body:
  *```*json
  {
    "email": "test@example.com"
  }
*  ```*

*- *Success Response (200)：
  *```*json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "email": "test@example.com",
      "scene": "RESET_PASSWORD",
      "expireSeconds": 300
    }
  }
*  ```*

*- *Error Responses：
  *- *邮箱格式不合法 / 为空
    *```*json
    { "code": 400, "msg": "邮箱格式不正确", "data": null }
*    ```*
*  - *发送过于频繁
    *```*json
    { "code": 429, "msg": "发送过于频繁，请稍后再试", "data": null }
*    ```*
*  - *邮箱未注册（可选策略：为了避免枚举攻击，也可统一返回 success；本项目先返回 404 以便前端提示）
    *```*json
    { "code": 404, "msg": "该邮箱未注册", "data": null }
*    ```*
*  - *SMTP 发送失败
    *```*json
    { "code": 500, "msg": "验证码发送失败", "data": null }
*    ```*

*### *1.6.2 校验验证码并重置密码
*- *URL: *`*/api/password-reset/confirm*`*
*- *Method: *`*POST*`*
*- *Description: 校验邮箱验证码，校验通过后将该邮箱对应账号的密码更新为新密码。
*- *Request Body:
  *```*json
  {
    "email": "test@example.com",
    "code": "123456",
    "newPassword": "newPass123",
    "confirmPassword": "newPass123"
  }
*  ```*

*- *Success Response (200)：
  *```*json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "reset": true,
      "email": "test@example.com"
    }
  }
*  ```*

*- *Error Responses：
  *- *参数错误（验证码格式 / 新密码为空 / 两次密码不一致）
    *```*json
    { "code": 400, "msg": "两次密码不一致", "data": { "reset": false } }
*    ```*
*  - *验证码错误
    *```*json
    { "code": 400, "msg": "验证码错误", "data": { "reset": false } }
*    ```*
*  - *验证码过期/不存在
    *```*json
    { "code": 410, "msg": "验证码已过期或不存在", "data": { "reset": false } }
*    ```*
*  - *邮箱未注册
    *```*json
    { "code": 404, "msg": "该邮箱未注册", "data": { "reset": false } }
*    ```*
*  - *更新密码失败
    *```*json
    { "code": 500, "msg": "重置密码失败", "data": { "reset": false } }
*    ```*

*---*

**4. 挂号接口**

**4.1 创建挂号请求（自动生成订单）**

**接口**: POST /api/registrations

**功能**: 患者发起挂号，锁定排班资源，自动生成支付订单

**请求体**:

JSON
{
  "patientId": "PAT0001",
  "scheduleRecordId": "SCH7890"
}

**成功响应** (200):

JSON
{
  "code": 200,
  "msg": "success",
  "data": {
    "patientId": "PAT0001",
    "scheduleRecordId": "SCH20251218001",
    "status": true,
    "paymentId": "uuid-string",
    "amount": 70.00,
    "registerTime": "2025-12-18T10:30:00.000+08:00"
  }
}

**号源不足响应** (200):

JSON
{
  "code": 200,
  "data": {
    "status": false
  }
}

**⚠️ 重要变更**: 订单不再由前端单独创建，挂号成功时后端自动生成

**5. 订单管理接口**

**5.1 订单列表**

**接口**: GET /api/payments?patientId={patientId}

**功能**: 获取患者所有订单

**响应**:

JSON
{
  "code": 200,
  "data": {
    "total": 2,
    "payments": [
      {
        "paymentId": "uuid-1",
        "patientId": "PAT0001",
        "scheduleRecordId": "SCH001",
        "doctorName": "张医生",
        "departmentName": "内科",
        "payTime": "2025-12-18T10:30:00.000+08:00",
        "payStatus": "已支付",
        "oriAmount": 100.00,
        "askPayAmount": 70.00,
        "reimbursePercent": 30.00,
        "reimburseType": "职工医保"
      }
    ]
  }
}

**订单状态**: 待支付、已支付、已取消

**5.2 订单详情**

**接口**: GET /api/payments/{paymentId}

**功能**: 查看订单详细信息

**字段说明**:

oriAmount: 原始金额（挂号费）

reimbursePercent: 报销比例

askPayAmount: 实际支付金额

payTime: 订单时间（所有状态均返回）

**5.3 订单支付**

**接口**: POST /api/payments/{paymentId}/pay

**功能**: 支付订单，扣除医保余额

**成功响应** (200):

JSON
{
  "code": 200,
  "data": {
    "paymentId": "uuid-string",
    "payStatus": "已支付",
    "payTime": "2025-12-18T10:35:00.000+08:00",
    "oriAmount": 100.00,
    "askPayAmount": 70.00
  }
}

**失败响应** (400):

JSON
{
  "code": 400,
  "message": "医保余额不足，当前余额：50.00，需支付：70.00"
}

**支付逻辑**:

检查订单状态是否为"待支付"

查询患者医保账户余额

验证余额是否充足

扣减医保余额

更新订单状态为"已支付"

更新挂号记录状态为"已挂号"

**5.4 取消订单**

**接口**: DELETE /api/payments/{paymentId}

**功能**: 取消订单，同时取消挂号记录

**取消逻辑**:

更新订单状态为"已取消"

更新挂号记录状态为"已取消"

如订单原状态为"已支付"，回补号源

**6. 支付相关接口**

**6.1 金额计算逻辑**

**实付金额 = 原价 × (1 - 报销比例/100)**

例如：原价100元，报销比例30%，实付 = 100 × (1 - 0.3) = 70元

**6.2 数据库表关系**

Plaintext
patient
├─ reimburse_id → reimburse_type.id (获取报销比例)
└─ medical_insuranceid → medical_insurance.id (医保余额)

pay_record
├─ patient_id → patient.id
├─ doc_id → doctor.id
└─ sch_id → doc_schedule_record.id

register_record
├─ patient_id, sch_id (联合主键)
└─ 与 pay_record 通过 (patient_id, sch_id) 关联

**6.3 完整业务流程**

Plaintext
1. 用户发起挂号 (POST /api/registrations)
   → 扣减号源
   → 创建挂号记录（状态=待支付）
   → 自动创建订单（状态=待支付）
   ↓
2. 用户查看订单 (GET /api/payments)
   → 显示原价、报销比例、实付金额
   ↓
3. 用户支付订单 (POST /api/payments/{id}/pay)
   → 验证医保余额
   → 扣减医保余额
   → 更新订单状态（待支付→已支付）
   → 更新挂号状态（待支付→已挂号）
   ↓
4. 用户可取消订单 (DELETE /api/payments/{id})
   → 更新订单状态（→已取消）
   → 更新挂号状态（→已取消）
   → 如已支付则回补号源

**7. 接口冲突说明**

**⚠️ 冲突1: 挂号接口的返回字段不一致**

**位置1: 消息通知文档**

**接口**: POST /api/registrations

**返回字段**:

JSON
{
  "patientId": "PAT0001",
  "scheduleRecordId": "SCH1031",
  "registerTime": "2025-12-11T11:01:58.2054396+08:00",
  "status": true  // 仅表示挂号成功/失败
}

**位置2: 患者端订单API文档**

**接口**: POST /api/registrations

**返回字段**:

JSON
{
  "patientId": "PAT0001",
  "scheduleRecordId": "SCH20251218001",
  "status": true,
  "paymentId": "uuid-string",        // 新增字段
  "amount": 70.00,                   // 新增字段
  "registerTime": "2025-12-18T10:30:00.000+08:00"
}

**冲突说明**:

消息通知文档中的挂号接口**不包含** paymentId 和 amount 字段

订单API文档中的挂号接口**包含**订单相关字段

**推荐方案**:
采用订单API文档的返回结构（包含 paymentId 和 amount），因为订单创建已集成到挂号流程中。

**⚠️ 冲突2: 候补转正后的处理不一致**

**候补挂号文档**

候补转正后生成 registrationId

未明确是否同时生成订单

**订单管理文档**

强调"挂号成功时自动生成订单"

候补转正应该也生成订单

**推荐方案**:
候补转正时应同时：

创建正式挂号记录

自动生成支付订单

通知患者（通过消息接口）

**8. 前端实现问题修复记录**

**8.1 支付页面导入错误修复（2025-12-19）**

**问题**: getUserInfo 函数不存在
**修复**: 改用 getUser 函数

JavaScript
// 修改前
import { getUserInfo } from '../../store/userUtil.js'

// 修改后
import { getUser } from '../../store/userUtil.js'

**8.2 支付状态判断增强（2025-12-19）**

**问题**: 仅检查 HTTP 200 就显示支付成功，未验证业务状态
**修复**: 增加三重验证机制

检查 HTTP 状态码

验证返回数据中的 payStatus === '已支付'

重新加载订单详情二次确认

**8.3 支付页面UI优化（2025-12-19）**

**改进内容**:

新增订单状态卡片

医保余额实时显示

余额不足校验

支付确认弹窗

支付后状态刷新

**8.4 错误数据结构显示（2025-12-19）**

**功能**: 当支付状态异常时，在控制台和弹窗中显示完整的返回数据结构
**用途**: 方便调试和后端问题排查

**9. 统一返回结构**

**成功响应**

JSON
{
  "code": 200,  // 或 201 (创建成功)
  "msg": "success",
  "data": { /* 业务数据 */ }
}

**失败响应**

JSON
{
  "code": 400,  // 或其他错误码
  "msg": "错误信息",
  "data": null
}

**常见错误码**

**200**: 成功

**201**: 创建成功

**400**: 请求参数错误或业务逻辑错误

**403**: 无权限

**404**: 资源不存在

**409**: 冲突（如重复操作）

**500**: 服务器内部错误

**10. 重要注意事项**

**10.1 订单创建方式变更**

⚠️ **订单不再由前端单独创建**，而是在挂号成功时由后端自动生成。前端只需调用挂号接口即可。

**10.2 支付状态验证**

前端必须验证：

HTTP 状态码

返回数据中的 payStatus 字段

支付后重新查询订单确认状态

**10.3 医保余额管理**

支付前必须验证余额充足

支付成功后扣减余额

取消已支付订单不退款（业务规则）

**10.4 候补转正机制**

由后端定时任务或号源释放触发

前端需轮询或通过消息通知获知转正结果

转正后自动生成订单

**10.5 评价功能限制**

仅"已就诊"状态的挂号可评价

每条挂号只能评价一次

评分范围 1-5 星

**11. 前端集成建议**

**11.1 典型业务流程**

JavaScript
// 1. 患者挂号（自动创建订单）
const result = await createRegistration('PAT0001', 'SCH001');
if (result.data.status) {
  const paymentId = result.data.paymentId;
  const amount = result.data.amount;

  // 2. 跳转到支付页面
  router.push({ name: 'Payment', params: { paymentId, amount } });

  // 3. 用户支付订单
  const payResult = await payOrder(paymentId);

  // 4. 验证支付状态
  if (payResult.payment.payStatus === '已支付') {
    router.push({ name: 'PaymentSuccess' });
  }
} else {
  alert('号源已满，请选择候补挂号');
}

**11.2 错误处理**

JavaScript
try {
  await payOrder(paymentId);
} catch (error) {
  if (error.message.includes('余额不足')) {
    // 提示充值
  } else if (error.message.includes('状态异常')) {
    // 刷新页面或联系客服
  }
}

**12. 后续优化建议**

**支付方式扩展**: 支持微信、支付宝等第三方支付

**退款功能**: 支持已支付订单退款

**订单超时**: 待支付订单自动取消

**支付通知**: 集成消息通知接口

**账单汇总**: 月度/年度账单功能

**电子发票**: 开具电子发票功能

**文档版本**: v1.0
**最后更新**: 2025-12-20
**维护者**: Claude Code

根据 xx 查邮箱和手机号