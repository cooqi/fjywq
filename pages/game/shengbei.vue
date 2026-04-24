<template>
  <view class="container">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="title">🎲 赛博掷杯 🎲</text>
    </view>

    <!-- 圣杯显示区域 -->
    <view class="cup-area">
      <image 
        id="cupDisplay" 
        class="cup-image" 
        :src="currentCupImage" 
        mode="aspectFit"
        :class="{ 'bouncing': isThrowing }"
      ></image>
    </view>

    <!-- 结果文本 -->
    <view class="result-text" :class="resultClass">{{ resultText }}</view>

    <!-- 按钮区域 -->
    <view class="button-group">
      <button class="btn btn-throw" @click="throwCups" :disabled="isThrowing">掷杯</button>
      <button class="btn btn-reset" @click="resetGame">重置</button>
    </view>

    <!-- 统计区域 -->
    <view class="stats">
      <view class="stat-item">
        <text class="stat-number">{{ stats.smile }}</text>
        <text class="stat-label">笑杯</text>
      </view>
      <view class="stat-item">
        <text class="stat-number">{{ stats.holy }}</text>
        <text class="stat-label">圣杯</text>
      </view>
      <view class="stat-item">
        <text class="stat-number">{{ stats.cry }}</text>
        <text class="stat-label">哭杯</text>
      </view>
      <view class="stat-item">
        <text class="stat-number stat-silly">{{ stats.silly }}</text>
        <text class="stat-label">傻杯</text>
      </view>
    </view>

    <!-- 说明区域 -->
    <view class="tips">
      <text class="tips-title">📖 说明：</text>
      <view 
        v-for="item in cupResults" 
        :key="item.type" 
        class="tip-item" 
        :class="item.tipClass"
      >
        <image 
          class="tip-icon" 
          :src="item.type === 'holy' ? holyTipImage : item.image" 
          mode="aspectFit"
        ></image>
        <view class="tip-content">
          <text class="tip-name">{{ item.emoji }} {{ item.text }}</text>
          <text class="tip-desc">{{ item.message }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      isThrowing: false,
      currentCupImage: 'https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei4.png',
      resultText: '准备掷杯',
      resultClass: '',
      holyTipImage: 'https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei1.png',
      stats: {
        smile: 0,
        holy: 0,
        cry: 0,
        silly: 0
      },
      // 统一的圣杯结果配置数据
      cupResults: [
        { 
          type: 'smile', 
          text: '笑杯', 
          message: '态度不明，可重新掷', 
          image: 'https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei4.png',
          class: 'result-smile',
          tipClass: 'tip-smile',
          emoji: '😄'
        },
        { 
          type: 'holy', 
          text: '圣杯', 
          message: 'OK，行事顺利', 
          images: [
            'https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei1.png',
            'https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei13.png'
          ],
          class: 'result-holy',
          tipClass: 'tip-holy',
          emoji: '🙏'
        },
        { 
          type: 'cry', 
          text: '哭杯', 
          message: 'No No，行事不顺', 
          image: 'https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei12.png',
          class: 'result-cry',
          tipClass: 'tip-cry',
          emoji: '😢'
        },
        { 
          type: 'silly', 
          text: '傻杯', 
          message: 'WTF，重开吧', 
          image: 'https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei5.png',
          class: 'result-silly',
          tipClass: 'tip-silly',
          emoji: '🤪'
        }
      ]
    }
  },
  onShareAppMessage: function () {
    return {
        title: '宇青青宇全肯定',
        path: '/pages/game/game'
    }
    },
    onShareTimeline: function () {
    return {
        title: '宇青青宇全肯定'
    }
},
  methods: {
    throwCups() {
      if (this.isThrowing) return
      
      this.isThrowing = true
      
      // 触发弹跳动画
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * this.cupResults.length)
        const result = this.cupResults[randomIndex]
        
        // 设置图片
        if (result.type === 'holy') {
          const randomHolyImage = Math.floor(Math.random() * result.images.length)
          this.currentCupImage = result.images[randomHolyImage]
          // 同时更新圣杯提示图标
          const randomTipImage = Math.floor(Math.random() * result.images.length)
          this.holyTipImage = result.images[randomTipImage]
        } else {
          this.currentCupImage = result.image
        }
        
        // 设置结果文本和样式
        this.resultText = `${result.text} - ${result.message}`
        this.resultClass = result.class
        
        // 更新统计
        this.stats[result.type]++
        
        this.isThrowing = false
      }, 500)
    },
    
    resetGame() {
      this.stats = { smile: 0, holy: 0, cry: 0, silly: 0 }
      this.currentCupImage = 'https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei_smile.png'
      this.resultText = '准备掷杯'
      this.resultClass = ''
      this.holyTipImage = 'https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei_holy1.png'
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #ffe4e1 0%, #ffb6c1 100%);
  padding: 20px;
}

.header {
  text-align: center;
  padding: 20px 0;
}

.title {
  display: block;
  font-size: 28px;
  font-weight: bold;
  color: #ff6b6b;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.cup-area {
  background: linear-gradient(135deg, #fff5e6 0%, #ffe4cc 100%);
  border: 3px solid #ffb347;
  border-radius: 15px;
  padding: 30px;
  margin: 20px 0;
  min-height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.cup-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.cup-image.bouncing {
  animation: bounce 0.5s ease-in-out;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.result-text {
  font-size: 24px;
  font-weight: bold;
  margin: 20px 0;
  padding: 15px;
  border-radius: 10px;
  text-align: center;
}

.result-smile {
  color: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
}

.result-holy {
  color: #FF9800;
  background: rgba(255, 152, 0, 0.1);
}

.result-cry {
  color: #f44336;
  background: rgba(244, 67, 54, 0.1);
}

.result-silly {
  color: #9c27b0;
  background: rgba(156, 39, 176, 0.1);
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 20px 0;
}

.btn {
  color: white;
  border: none;
  padding: 15px 40px;
  font-size: 16px;
  border-radius: 50px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.btn-throw {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.btn-reset {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.stats {
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.stat-item {
  padding: 10px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-number {
  font-size: 20px;
  font-weight: bold;
  color: #667eea;
  display: block;
  margin-bottom: 5px;
}

.stat-silly {
  color: #9c27b0;
}

.stat-label {
  font-size: 12px;
  color: #666;
  display: block;
}

.tips {
  margin-top: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
}

.tips-title {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #ff6b6b;
  margin-bottom: 15px;
}

.tip-item {
  margin: 10px 0;
  padding: 10px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 5px;
  border-left: 4px solid;
  display: flex;
  align-items: center;
  gap: 10px;
}

.tip-icon {
  width: 50px;
  height: 50px;
  object-fit: contain;
  flex-shrink: 0;
}

.tip-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tip-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 3px;
}

.tip-desc {
  font-size: 12px;
  color: #666;
}

.tip-smile {
  border-left-color: #4CAF50;
}

.tip-holy {
  border-left-color: #FF9800;
}

.tip-cry {
  border-left-color: #f44336;
}

.tip-silly {
  border-left-color: #9c27b0;
}
</style>
