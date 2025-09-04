# EmbedCalendar 日历组件

一个简单易用的 Vue.js 日历组件，支持月视图和周视图切换。

## 🌟 主要功能

- **月视图/周视图**：可以看整月日历，也可以只看一周
- **日期导航**：点击箭头切换月份或周
- **头像问候**：显示头像和自定义问候语
- **今日标记**：今天的日期有特殊标识
- **签到标记**：已签到的日期显示绿色背景和红点
- **响应式**：适配手机和电脑屏幕

## 📱 界面说明

### 顶部区域
- 左侧：头像 + 问候语对话框
- 右侧："今" 按钮，点击跳转到今天

### 日历区域
- 标题：显示年月
- 切换按钮：月/周 视图切换
- 导航箭头：左右切换月份或周
- 日期格子：显示具体日期

## 🎮 基本操作

### 1. 切换视图
- 点击 "月" 按钮：看整个月的日历
- 点击 "周" 按钮：只看一周的日历

### 2. 日期导航  
- 点击左箭头：查看上个月/上周
- 点击右箭头：查看下个月/下周

### 3. 选择日期
- 点击任意日期：选中该日期（变成紫色）
- 点击灰色日期：自动跳转到那个月份

### 4. 快速跳转
- 点击右上角 "今" 按钮：快速跳转到今天

### 5. 日期状态说明
- **紫色 + 半月图标**：今天
- **紫色背景**：选中的日期  
- **绿色 + 红点**：已签到日期
- **灰色**：其他月份的日期

## �📝 使用方法

### 基础用法

```vue
<template>
  <view>
    <EmbedCalendar
      @on-click="handleDateClick"
      @month-change="handleMonthChange"
      @today-plan-click="handleTodayPlanClick"
    />
  </view>
</template>

<script>
export default {
  methods: {
    // 日期点击事件
    handleDateClick(dateInfo) {
      console.log('选中日期:', dateInfo);
      // dateInfo 包含：date, year, month, day, isToday
    },
    
    // 月份变化事件
    handleMonthChange(monthInfo) {
      console.log('月份变化:', monthInfo);
      // monthInfo 包含：year, month
    },
    
    // 今日计划点击事件
    handleTodayPlanClick() {
      console.log('点击了今日计划');
    }
  }
}
</script>
```

### 高级配置

```vue
<template>
  <EmbedCalendar
    :show-top-section="true"
    :avatar-src="userAvatar"
    :greeting-text="customGreeting"
    :signed-dates="signedDates"
    :weekstart="1"
    :open="false"
    @on-click="handleDateClick"
    @month-change="handleMonthChange"
    @today-plan-click="handleTodayPlanClick"
  />
</template>

<script>
export default {
  data() {
    return {
      userAvatar: '/static/user-avatar.png',
      customGreeting: '早安，今天也要加油哦！',
      signedDates: ['2025-7-1', '2025-7-2', '2025-7-3'], // 已签到日期
    }
  }
}
</script>
```

## 🎛️ Props 属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `showTopSection` | Boolean | `true` | 是否显示顶部区域 |
| `avatarSrc` | String | `''` | 头像图片路径 |
| `greetingText` | String | `'我闻着饼香来到到街中央'` | 问候语文本 |
| `signeddates` | Array | `[]` | 已签到日期数组，格式：['2025-7-1'] |
| `weekstart` | Number | `7` | 一周开始的星期几（1-7） |
| `open` | Boolean | `true` | 初始是否展开月视图 |

## 📡 Events 事件

### on-click
用户点击日期时触发

```javascript
// 回调参数
{
  date: "2025-7-2",      // 日期字符串
  year: 2025,            // 年份
  month: 7,              // 月份
  day: 2,                // 日期
  isToday: true          // 是否为今天
}
```

### month-change
月份发生变化时触发（导航切换）

```javascript
// 回调参数
{
  year: 2025,            // 年份
  month: 7               // 月份
}
```

### today-plan-click
点击"今日计划"按钮时触发

```javascript
// 无参数，可用于打开今日计划相关页面
```

## 💡 常见使用场景

### 1. 签到日历
```javascript
data() {
  return {
    signedDates: ['2025-7-1', '2025-7-2'] // 已签到日期
  }
},
methods: {
  handleDateClick(dateInfo) {
    // 执行签到逻辑
    if (!this.signedDates.includes(dateInfo.date)) {
      this.signedDates.push(dateInfo.date);
      console.log('签到成功！');
    }
  }
}
```

### 2. 日程选择
```javascript
methods: {
  handleDateClick(dateInfo) {
    // 跳转到日程页面
    this.$navigate('/schedule?date=' + dateInfo.date);
  }
}
```

### 3. 日期范围限制
```javascript
methods: {
  handleDateClick(dateInfo) {
    const today = new Date();
    const selected = new Date(dateInfo.date);
    
    if (selected < today) {
      console.log('不能选择过去的日期');
      return;
    }
    
    // 处理有效日期
    this.processDate(dateInfo);
  }
}
```
