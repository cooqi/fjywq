# 权限控制系统说明

## 概述

本项目实现了基于角色的权限控制系统（RBAC），通过用户字段 `role` 来控制不同功能的访问权限。

## 角色定义

| 角色 | 标识 | 说明 |
|------|------|------|
| 超级管理员 | `s_admin` | 拥有系统所有权限 |
| 管理员 | `admin` | 拥有大部分增删改权限 |
| 普通用户 | `user` | 仅能查看和操作自己的数据 |

## 权限工具类

位置：`common/js/permission.js`

### 核心函数

```javascript
// 获取用户角色
getUserRole(userInfo)

// 检查是否为超级管理员
isSuperAdmin(userInfo)

// 检查是否为管理员（包括超级管理员）
isAdmin(userInfo)

// 检查日历模块权限
hasCalendarPermission(userInfo, action)
// action: 'add', 'edit', 'delete', 'view'
// admin: 只有新增权限
// s_admin: 所有权限

// 检查建议管理权限
hasSuggestionPermission(userInfo, action)
// action: 'reply', 'view'
// admin/s_admin: 可回复
// user: 只能查看已回复的建议

// 检查演唱会管理权限
hasConcertPermission(userInfo, action)
// admin/s_admin: 可管理

// 检查消费记录权限
hasPayRecordPermission(userInfo, recordUserId, action)
// s_admin: 可操作所有记录
// admin/user: 只能操作自己的记录
```

## 前端页面权限控制

### 1. 日历页面 (rili.vue)

```javascript
import { hasCalendarPermission } from '@/common/js/permission.js'

// 检查编辑权限
this.canEditCalendar = hasCalendarPermission(this.userInfo, 'add') || 
                       hasCalendarPermission(this.userInfo, 'edit')

// 模板中使用
<view class="edit" @click="edit" v-if="canEditCalendar">编辑</view>
```

**权限规则：**
- `s_admin`: 可以新增、编辑、删除
- `admin`: 只能新增
- `user`: 无编辑权限

### 2. 通知公告 (notice.vue)

```javascript
import { hasCalendarPermission } from '@/common/js/permission.js'

this.canEditNotice = hasCalendarPermission(this.userInfo, 'add') || 
                     hasCalendarPermission(this.userInfo, 'edit')
```

**权限规则：** 同日历模块

### 3. 个人中心 (profile.vue)

```javascript
import { hasConcertPermission } from '@/common/js/permission.js'

this.canManageConcert = hasConcertPermission(this.userInfo, 'manage')
```

**权限规则：**
- `s_admin/admin`: 可进入演唱会管理后台
- `user`: 不显示入口

### 4. 建议反馈 (suggestion.vue)

```javascript
import { hasSuggestionPermission } from '@/common/js/permission.js'

this.isAdmin = hasSuggestionPermission(this.userInfo, 'reply')
```

**权限规则：**
- `s_admin/admin`: 可查看所有待处理建议并回复
- `user`: 只能查看自己已收到回复的建议

## 云函数权限控制

### 1. 建议管理 (suggestion/index.js)

```javascript
// 角色常量
const ROLES = {
    SUPER_ADMIN: 's_admin',
    ADMIN: 'admin',
    USER: 'user'
}

// 权限检查函数
function isAdmin(userInfo) {
    if (!userInfo || !userInfo.role) return false
    return userInfo.role === ROLES.SUPER_ADMIN || userInfo.role === ROLES.ADMIN
}

// 使用时传递 userInfo
uniCloud.callFunction({
    name: 'suggestion',
    data: {
        type: 'getAll',
        userId: this.userInfo._id,
        userInfo: this.userInfo  // 重要：传递完整用户信息
    }
})
```

**权限规则：**
- `getAll`: 
  - admin/s_admin: 查看所有待处理建议
  - user: 只查看自己已回复的建议
- `adminReply`:
  - admin/s_admin: 可回复
  - user: 无权操作（返回 403）

## 使用示例

### 前端调用云函数时传递用户信息

```javascript
// ✅ 正确做法
uniCloud.callFunction({
    name: 'pay-record',
    data: {
        type: 'add',
        userId: this.userInfo._id,
        userInfo: this.userInfo,  // 传递用户信息
        ...formData
    }
})

// ❌ 错误做法（无法进行角色判断）
uniCloud.callFunction({
    name: 'pay-record',
    data: {
        type: 'add',
        userId: this.userInfo._id,
        ...formData
    }
})
```

### 云函数中检查权限

```javascript
exports.main = async (event, context) => {
    const { type, userId, userInfo } = event
    
    // 检查是否为超级管理员
    if (userInfo && userInfo.role === 's_admin') {
        // 超级管理员逻辑
    }
    
    // 检查是否为管理员
    if (userInfo && (userInfo.role === 's_admin' || userInfo.role === 'admin')) {
        // 管理员逻辑
    }
}
```

## 数据库用户字段

需要在 `uni-id-users` 表中添加 `role` 字段：

```json
{
    "_id": "用户ID",
    "role": "s_admin",  // 或 "admin" 或 "user"
    "nickName": "用户名",
    ...
}
```

## 权限矩阵

| 功能模块 | s_admin | admin | user |
|---------|---------|-------|------|
| 日历-新增 | ✅ | ✅ | ❌ |
| 日历-编辑 | ✅ | ❌ | ❌ |
| 日历-删除 | ✅ | ❌ | ❌ |
| 通知-新增 | ✅ | ✅ | ❌ |
| 通知-编辑 | ✅ | ❌ | ❌ |
| 通知-删除 | ✅ | ❌ | ❌ |
| 演唱会管理 | ✅ | ✅ | ❌ |
| 建议-回复 | ✅ | ✅ | ❌ |
| 建议-查看 | 全部 | 全部 | 仅自己已回复 |
| 消费记录-自己的 | ✅ | ✅ | ✅ |
| 消费记录-他人的 | ✅ | ❌ | ❌ |

## 注意事项

1. **前端权限控制只是UI层面的隐藏**，真正的权限验证必须在云函数中进行
2. **云函数必须接收 `userInfo` 参数**，不能仅依赖 `userId`
3. **默认角色为 `user`**，如果用户没有 `role` 字段，视为普通用户
4. **超级管理员优先级最高**，在任何权限检查中都应首先判断
5. **修改用户角色后需要重新登录**，因为用户信息存储在本地 Storage

## 扩展新模块权限

如果要为新模块添加权限控制：

1. 在 `permission.js` 中添加新的权限检查函数
2. 在页面中导入并使用该函数
3. 在云函数中添加相应的权限验证逻辑
4. 确保前端调用时传递 `userInfo` 参数

```javascript
// permission.js 中添加
export function hasNewModulePermission(userInfo, action) {
    const role = getUserRole(userInfo)
    
    if (role === ROLES.SUPER_ADMIN) {
        return true
    }
    
    if (role === ROLES.ADMIN) {
        // admin 的权限逻辑
        return action === 'add' || action === 'view'
    }
    
    // user 的权限逻辑
    return action === 'view'
}
```

## 调试技巧

可以使用 `getPermissionInfo()` 函数查看当前用户的权限状态：

```javascript
import { getPermissionInfo } from '@/common/js/permission.js'

console.log('当前用户权限:', getPermissionInfo(this.userInfo))
// 输出：
// {
//   userId: "xxx",
//   role: "admin",
//   isSuperAdmin: false,
//   isAdmin: true,
//   permissions: { ... }
// }
```
