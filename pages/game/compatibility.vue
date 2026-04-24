<template>
  <view class="container">
    <!-- 顶部日历区域 -->
    <view class="calendar-section">
      <view class="calendar-header">
        <text class="month">{{ currentMonth }}</text>
        <view class="expand-btn" @click="toggleCalendar">
          <text class="expand-text">{{ isExpanded ? '收起' : '展开' }}</text>
          <text class="expand-icon">{{ isExpanded ? '∧' : '∨' }}</text>
        </view>
      </view>
      
      <view class="calendar-body" :class="{ 'expanded': isExpanded }">
        <view class="calendar-days">
          <view class="day-item" v-for="(day, index) in weekDays" :key="index">
            <text class="day-label">{{ day }}</text>
          </view>
        </view>
        
        <view class="calendar-dates">
          <view 
            class="date-item" 
            v-for="(date, index) in displayDates" 
            :key="index"
            :class="{ 
              'today': date.isToday, 
              'has-event': date.hasEvent,
              'empty': !date.day
            }"
          >
            <text class="date-number" v-if="date.day">{{ date.day }}</text>
            <view class="event-dot" v-if="date.hasEvent"></view>
          </view>
        </view>
      </view>
      
      <!-- 波浪装饰 -->
      <view class="wave-decoration"></view>
    </view>

    <!-- 今日合拍度 -->
    <view class="compatibility-section">
      <text class="section-title">今日合拍度</text>
      
      <view class="avatar-area">
        <view class="avatar-item">
          <view class="avatar-circle">
            <text class="avatar-icon">⭐</text>
          </view>
          <text class="avatar-name">{{ name1 || 'YOU' }}</text>
        </view>
        
        <text class="heart-icon">💜</text>
        
        <view class="avatar-item">
          <view class="avatar-circle">
            <text class="avatar-icon">🌟</text>
          </view>
          <text class="avatar-name">{{ name2 || 'YQ' }}</text>
        </view>
      </view>

      <view class="score-display">
        <text class="score-label">在靠近</text>
        <text class="score-number">{{ compatibilityScore }}</text>
        <text class="score-unit">分</text>
      </view>

      <view class="compatibility-desc">
        <text>{{ compatibilityText }}</text>
      </view>
    </view>

    <!-- 宜忌标签 -->
    <view class="yi-ji-section">
      <view class="yi-main">
        <view class="yi-big-label">
          <text class="yi-text">宜</text>
        </view>
        <view class="yi-tags-grid">
          <view class="yi-tag-item" v-for="(tag, index) in randomYiTags" :key="index">
            <text class="yi-tag-text">{{ tag }}</text>
          </view>
        </view>
      </view>
      
      <view class="ji-main">
        <view class="ji-big-label">
          <text class="ji-text">忌</text>
        </view>
        <view class="ji-tags-grid">
          <view class="ji-tag-item" v-for="(tag, index) in randomJiTags" :key="index">
            <text class="ji-tag-text">{{ tag }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 今日AU小剧场 -->
    <view class="au-section">
      <view class="au-header">
        <text class="au-icon">✨</text>
        <text class="au-title">今日YQ小剧场</text>
      </view>
      
      <view class="au-card">
        <text class="au-subtitle">{{ auTitle }}</text>
        <view class="au-content">
          <text>{{ auContent }}</text>
        </view>
      </view>
    </view>

    <!-- 心动瞬间 -->
    <view class="moment-section">
      <view class="moment-header">
        <text class="moment-icon">💗</text>
        <text class="moment-title">心动瞬间</text>
      </view>
      
      <view class="moment-card">
        <text class="moment-text">{{ momentText }}</text>
      </view>
    </view>

    <!-- 财运 -->
    <view class="fortune-section">
      <view class="fortune-card">
        <text class="fortune-label">财运</text>
        <text class="fortune-score">{{ fortuneScore }}</text>
        <text class="fortune-desc">{{ fortuneDesc }}</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="action-buttons">
      <button class="action-btn" @click="retakeTest">
        <text class="btn-icon">🔄</text>
        <text class="btn-text">重新测试</text>
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      name1: '',
      name2: '',
      currentMonth: 'MAY.',
      weekDays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      calendarDates: [],
      displayDates: [], // 显示的日期（当前周或全月）
      isExpanded: false, // 日历是否展开
      compatibilityScore: '',
      compatibilityText: '',
      yiTags: [],
      jiTags: [],
      randomYiTags: [], // 随机选择的宜标签
      randomJiTags: [], // 随机选择的忌标签
      auTitle: '',
      auContent: '',
      momentText: '',
      fortuneScore: '',
      fortuneDesc: '',
      rerollSeed: 0, // 重新投掷的随机种子
      // 从云端获取的配置数据
      configData: {
        yi_tags: [],
        ji_tags: [],
        au_titles: [],
        descriptions: [],
        au_contents: [],
        moments: [],
        fortunes: []
      },
      isLoading: true
    }
  },
  onLoad(options) {
    if (options.name1) this.name1 = options.name1
    if (options.name2) this.name2 = options.name2
    
    this.initCalendar()
    this.loadConfigData()
  },
  methods: {
    // 从云数据库加载配置数据
    async loadConfigData() {
      try {
        uni.showLoading({ title: '加载中...' })
        
        const res = await uniCloud.callFunction({
          name: 'compatibility-config',
          data: {}
        })
        
        if (res.result && res.result.code === 0) {
          const data = res.result.data
          
          // 直接使用云端数据
          this.yiTags = data.yi_tags || []
          this.jiTags = data.ji_tags || []
          this.configData = data
          
          // 生成内容
          this.generateContent()
        } else {
          // 抛出异常
          throw new Error(res.result.msg || '获取配置数据失败')
        }
      } catch (error) {
        console.error('加载配置数据异常:', error)
        uni.hideLoading()
        uni.showToast({
          title: error.message || '加载失败，请重试',
          icon: 'none',
          duration: 3000
        })
        // 延迟返回上一页
        setTimeout(() => {
          uni.navigateBack()
        }, 2000)
      } finally {
        this.isLoading = false
        uni.hideLoading()
      }
    },
    
    initCalendar() {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      const today = now.getDate()
      const currentDayOfWeek = now.getDay() // 0-6，0是周日
      
      const monthNames = ['JAN.', 'FEB.', 'MAR.', 'APR.', 'MAY.', 'JUN.', 
                         'JUL.', 'AUG.', 'SEP.', 'OCT.', 'NOV.', 'DEC.']
      this.currentMonth = monthNames[month]
      
      const firstDay = new Date(year, month, 1).getDay()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      
      this.calendarDates = []
      
      // 添加上月剩余日期
      for (let i = 0; i < firstDay; i++) {
        this.calendarDates.push({ day: '', isToday: false, hasEvent: false })
      }
      
      // 添加本月日期
      for (let i = 1; i <= daysInMonth; i++) {
        this.calendarDates.push({
          day: i,
          isToday: i === today,
          hasEvent: false
        })
      }
      
      // 默认显示当前周
      this.updateDisplayDates()
    },
    
    // 更新显示的日期
    updateDisplayDates() {
      if (this.isExpanded) {
        // 展开时显示全月
        this.displayDates = this.calendarDates
      } else {
        // 收缩时只显示当前周
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()
        const today = now.getDate()
        const currentDayOfWeek = now.getDay() // 0-6，0是周日
        
        // 计算本月1号是星期几
        const firstDay = new Date(year, month, 1).getDay()
        
        // 找到当前周的第一天（周日）在calendarDates中的索引
        const weekStartIndex = firstDay + (today - 1 - currentDayOfWeek)
        
        // 截取当前周的7天
        this.displayDates = this.calendarDates.slice(weekStartIndex, weekStartIndex + 7)
        
        // 如果不足7天，补充空日期
        while (this.displayDates.length < 7) {
          this.displayDates.push({ day: '', isToday: false, hasEvent: false })
        }
      }
    },
    
    // 切换日历展开/收缩
    toggleCalendar() {
      this.isExpanded = !this.isExpanded
      this.updateDisplayDates()
    },
    
    generateContent() {
      const today = new Date().toDateString()
      // 加入rerollSeed让每次重新测试都得到不同结果
      const seed = (this.name1 || 'YOU') + (this.name2 || 'YQ') + today + this.rerollSeed
      
      let hash = 0
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      
      // 生成合拍度分数（60-100分）
      this.compatibilityScore = Math.abs(hash % 41) + 60
      
      // 根据分数选择对应的描述
      if (this.configData.descriptions && this.configData.descriptions.length > 0) {
        this.compatibilityText = this.getDescriptionByScore(this.compatibilityScore)
      }
      
      // 随机选择3条宜标签
      this.randomYiTags = this.getRandomItems(this.yiTags, 3)
      
      // 随机选择3条忌标签
      this.randomJiTags = this.getRandomItems(this.jiTags, 3)
      
      // 随机选择AU小剧场内容
      if (this.configData.au_contents && this.configData.au_contents.length > 0) {
        const randomAuIndex = Math.floor(Math.random() * this.configData.au_contents.length)
        this.auContent = this.configData.au_contents[randomAuIndex]
      }
      
      // 随机选择心动瞬间
      if (this.configData.moments && this.configData.moments.length > 0) {
        const randomMomentIndex = Math.floor(Math.random() * this.configData.moments.length)
        this.momentText = this.configData.moments[randomMomentIndex]
      }
      
      // 生成财运分数（50-100分），确保与合拍度分数不同
      let fortuneHash = hash + 12345 // 使用不同的种子
      this.fortuneScore = Math.abs(fortuneHash % 51) + 50
      
      // 如果两个分数相同，调整财运分数
      if (this.fortuneScore === this.compatibilityScore) {
        this.fortuneScore = this.fortuneScore < 55 ? this.fortuneScore + 1 : this.fortuneScore - 1
      }
      
      // 根据财运分数获取对应的描述
      if (this.configData.fortunes && this.configData.fortunes.length > 0) {
        this.fortuneDesc = this.getFortuneByScore(this.fortuneScore)
      }
    },
    
    // 从数组中随机选择指定数量的元素
    getRandomItems(arr, count) {
      if (!arr || arr.length === 0) return []
      
      // 如果数组长度小于等于count，直接返回副本
      if (arr.length <= count) {
        return [...arr]
      }
      
      // 创建副本并打乱顺序
      const shuffled = [...arr].sort(() => Math.random() - 0.5)
      
      // 返回前count个元素
      return shuffled.slice(0, count)
    },
    
    // 根据财运分数获取对应的描述
    getFortuneByScore(score) {
      const fortunes = this.configData.fortunes
      
      // 找到匹配分数段的财运描述
      for (const fortune of fortunes) {
        const range = fortune.score_range
        if (!range) continue
        
        const [min, max] = range.split('-').map(Number)
        if (score >= min && score <= max) {
          return fortune.content
        }
      }
      
      // 如果没有匹配的，返回第一个
      return fortunes[0]?.content || ''
    },
    
    // 根据分数获取对应的描述
    getDescriptionByScore(score) {
      const descriptions = this.configData.descriptions
      
      // 找到匹配分数段的描述
      for (const desc of descriptions) {
        const range = desc.score_range
        if (!range) continue
        
        const [min, max] = range.split('-').map(Number)
        if (score >= min && score <= max) {
          return desc.content
        }
      }
      
      // 如果没有匹配的，返回第一个
      return descriptions[0]?.content || ''
    },
    
    retakeTest() {
      uni.showModal({
        title: '重新测试',
        content: '确定要重新测试吗？',
        success: (res) => {
          if (res.confirm) {
            // 增加随机种子，让下次生成不同的结果
            this.rerollSeed++
            
            // 重新生成内容（使用新的随机种子）
            this.generateContent()
            
            uni.showToast({
              title: '已更新',
              icon: 'success'
            })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f3e8ff 0%, #ffffff 30%, #ffffff 100%);
  padding: 0 0 20px 0;
}

/* 日历区域 */
.calendar-section {
  background: linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%);
  padding: 30px 20px 50px;
  border-radius: 0 0 30px 30px;
  position: relative;
  overflow: hidden;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.month {
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  letter-spacing: 2px;
}

.expand-btn {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  cursor: pointer;
}

.expand-text {
  font-size: 12px;
  color: #ffffff;
  margin-right: 4px;
}

.expand-icon {
  font-size: 14px;
  color: #ffffff;
}

.calendar-body {
  transition: max-height 0.3s ease;
  overflow: hidden;
}

.calendar-body:not(.expanded) {
  max-height: 120px;
}

.calendar-body.expanded {
  max-height: 400px;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  margin-bottom: 10px;
}

.day-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.calendar-dates {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
}

.date-item {
  width: 100%;
  text-align: center;
  padding: 8px 0;
  position: relative;
  box-sizing: border-box;
}

.date-number {
  font-size: 14px;
  color: #ffffff;
}

.date-item.today .date-number {
  background: #ffffff;
  color: #a78bfa;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.event-dot {
  width: 4px;
  height: 4px;
  background: #ffffff;
  border-radius: 50%;
  margin: 2px auto 0;
}

/* 波浪装饰 */
.wave-decoration {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: linear-gradient(180deg, #f3e8ff 0%, #ffffff 100%);
  clip-path: polygon(
    0% 0%, 
    5% 40%, 
    10% 0%, 
    15% 40%, 
    20% 0%, 
    25% 40%, 
    30% 0%, 
    35% 40%, 
    40% 0%, 
    45% 40%, 
    50% 0%, 
    55% 40%, 
    60% 0%, 
    65% 40%, 
    70% 0%, 
    75% 40%, 
    80% 0%, 
    85% 40%, 
    90% 0%, 
    95% 40%, 
    100% 0%, 
    100% 100%, 
    0% 100%
  );
}

/* 合拍度区域 */
.compatibility-section {
  padding: 30px 20px;
  text-align: center;
}

.section-title {
  font-size: 20px;
  font-weight: bold;
  color: #6b21a8;
  display: block;
  margin-bottom: 25px;
}

.avatar-area {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
}

.avatar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-circle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e9d5ff 0%, #c4b5fd 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 10px rgba(167, 139, 250, 0.3);
}

.avatar-icon {
  font-size: 32px;
}

.avatar-name {
  font-size: 14px;
  color: #6b21a8;
  font-weight: 500;
}

.heart-icon {
  font-size: 36px;
  margin: 0 20px;
  animation: heartbeat 1.5s ease-in-out infinite;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.score-display {
  position: relative;
  margin-bottom: 20px;
}

.score-label {
  display: block;
  font-size: 16px;
  color: #a78bfa;
  margin-bottom: 10px;
}

.score-number {
  font-size: 72px;
  font-weight: bold;
  background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.score-unit {
  font-size: 20px;
  color: #a78bfa;
  margin-left: 5px;
}

.compatibility-desc {
  background: #f3e8ff;
  border-radius: 12px;
  padding: 15px;
  margin-top: 20px;
}

.compatibility-desc text {
  font-size: 13px;
  color: #6b21a8;
  line-height: 1.6;
}

/* 宜忌区域 */
.yi-ji-section {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.yi-main, .ji-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.yi-big-label, .ji-big-label {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.yi-big-label {
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
}

.ji-big-label {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
}

.yi-text, .ji-text {
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
}

.yi-tags-grid, .ji-tags-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.yi-tag-item, .ji-tag-item {
  background: #f3e8ff;
  border: 1px solid #c4b5fd;
  border-radius: 8px;
  padding: 10px 6px;
  text-align: center;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ji-tag-item {
  background: #fef2f2;
  border-color: #fecaca;
}

.yi-tag-text, .ji-tag-text {
  font-size: 12px;
  color: #6b21a8;
  font-weight: 500;
}

.ji-tag-text {
  color: #dc2626;
}

/* AU小剧场 */
.au-section {
  padding: 20px;
}

.au-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.au-icon {
  font-size: 24px;
  margin-right: 8px;
}

.au-title {
  font-size: 18px;
  font-weight: bold;
  color: #6b21a8;
}

.au-card {
  background: #ffffff;
  border: 2px solid #e9d5ff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(167, 139, 250, 0.1);
}

.au-subtitle {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #7c3aed;
  margin-bottom: 12px;
}

.au-content {
  font-size: 13px;
  color: #6b21a8;
  line-height: 1.8;
}

.au-content text {
  display: block;
}

/* 心动瞬间 */
.moment-section {
  padding: 0 20px 20px;
}

.moment-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.moment-icon {
  font-size: 24px;
  margin-right: 8px;
}

.moment-title {
  font-size: 18px;
  font-weight: bold;
  color: #6b21a8;
}

.moment-card {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
  border-radius: 16px;
  padding: 20px;
}

.moment-text {
  font-size: 14px;
  color: #be185d;
  line-height: 1.8;
}

/* 财运 */
.fortune-section {
  padding: 0 20px 20px;
}

.fortune-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
}

.fortune-label {
  display: block;
  font-size: 16px;
  color: #92400e;
  margin-bottom: 10px;
}

.fortune-score {
  display: block;
  font-size: 48px;
  font-weight: bold;
  color: #d97706;
  margin-bottom: 10px;
}

.fortune-desc {
  font-size: 13px;
  color: #92400e;
}

/* 底部按钮 */
.action-buttons {
  padding: 20px;
}

.action-btn {
  background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
  color: #ffffff;
  border: none;
  border-radius: 25px;
  padding: 14px;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon {
  margin-right: 8px;
  font-size: 18px;
}

.btn-text {
  color: #ffffff;
}
</style>
