## 接口列表

### 1. 提交加号申请
- URL: `POST /api/extra-apply`
- 请求体 (application/json):
    - `patientId` (string) 必填
    - `departmentId` (string) 必填
    - `doctorId` (string) 必填
    - `appointmentDate` (String, yyyy-MM-dd) 必填（仅当天允许）
    - `reason` (String) 必填
- 返回: 201 Created，body 包含创建记录 `id` 与完整记录

### 2. 查询申请详情
- URL: `GET /api/extra-apply/{id}`
- 返回: 200 OK，body 为申请记录

### 3. 按患者列出申请
- URL: `GET /api/extra-apply?patientId={patientId}`
- 返回: 200 OK，body 为申请列表

---

## 错误码（常见）
- 400 Bad Request：参数缺失或 appointmentDate 非当天
- 404 Not Found：记录不存在
- 409 Conflict：尝试审批已处理的申请
- 500 Internal Server Error：服务器异常
