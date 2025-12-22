# Payment.vue 错误修复说明

## ❌ 原始错误

```
"getUserInfo" is not exported by "../../../../Documents/GitHub/HRS_hospital_patient_frontend/store/userUtil.js"
```

## 🔍 问题分析

`userUtil.js` 文件中实际导出的函数是：
- ✅ `storeUser()` - 存储用户信息
- ✅ `getUser()` - 获取用户信息
- ✅ `getPatientId()` - 获取患者ID

**没有** `getUserInfo()` 这个函数！

## ✅ 修复方案

### 1. 修正导入语句
```javascript
// ❌ 错误
import { getUserInfo } from '../../store/userUtil.js'

// ✅ 正确
import { getUser } from '../../store/userUtil.js'
```

### 2. 修正函数调用
```javascript
async function loadMedicalBalance() {
  try {
    // ❌ 错误：const userInfo = await getUserInfo()
    // ✅ 正确：
    const userInfo = getUser()
    
    if (userInfo && userInfo.medicalBalance !== undefined) {
      medicalBalance.value = Number(userInfo.medicalBalance) || 0
    }
  } catch (e) {
    console.error('获取医保余额失败:', e)
  }
}
```

### 3. 注意事项
- `getUser()` 是**同步函数**，不是异步的，所以不需要 `await`
- `getUser()` 从本地存储（uni.getStorageSync）读取用户信息
- 返回的用户对象包含 `medicalBalance` 字段（医保余额）

## 📋 userUtil.js 函数说明

### getUser()
```javascript
// 功能：从本地存储获取用户信息
// 返回：用户对象或 null
// 特点：自动归一化 patientId 字段

const user = getUser()
// user = {
//   patientId: "PAT0001",
//   medicalBalance: 1000.00,
//   name: "张三",
//   ...
// }
```

### storeUser(raw)
```javascript
// 功能：存储用户信息到本地
// 参数：用户对象或 JSON 字符串
// 特点：自动归一化并冗余存储到 'user' 和 'userInfo'

storeUser({
  id: "PAT0001",
  medicalBalance: 1000.00,
  name: "张三"
})
```

### getPatientId()
```javascript
// 功能：快速获取患者ID
// 返回：patientId 字符串或 null

const patientId = getPatientId() // "PAT0001"
```

## 🎯 修复结果

✅ **编译错误已修复**  
✅ **代码可以正常运行**  
⚠️ 仅剩余不影响功能的警告（导入路径优化、未使用的CSS选择器）

## 💡 后续优化建议

如果用户信息需要从服务器实时获取，可以考虑：

```javascript
async function loadMedicalBalance() {
  try {
    // 先从本地获取
    let userInfo = getUser()
    
    // 如果需要最新数据，可以从服务器刷新
    if (userInfo && userInfo.patientId) {
      const freshUserInfo = await api.get(`/api/patients/${userInfo.patientId}`)
      if (freshUserInfo.data.medicalBalance !== undefined) {
        medicalBalance.value = Number(freshUserInfo.data.medicalBalance) || 0
        // 更新本地缓存
        storeUser(freshUserInfo.data)
      }
    } else if (userInfo && userInfo.medicalBalance !== undefined) {
      // 使用本地缓存
      medicalBalance.value = Number(userInfo.medicalBalance) || 0
    }
  } catch (e) {
    console.error('获取医保余额失败:', e)
  }
}
```

---

**修复时间**: 2025-12-19  
**修复状态**: ✅ 完成

