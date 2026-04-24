<template>
  <view class="container">
   

    <view class="game-list">
      <!-- 掷圣杯 -->
      <view class="game-card" @click="goToGame('shengbei')">
        <view class="game-icon shengbei-icon">🏺</view>
        <view class="game-info">
          <text class="game-name">掷圣杯</text>
          <text class="game-desc">传统占卜游戏，预测你的运势</text>
        </view>
        <view class="arrow">›</view>
      </view>

      <!-- 塔罗牌 -->
      <view class="game-card" @click="goToGame('tarot')">
        <view class="game-icon tarot-icon">🃏</view>
        <view class="game-info">
          <text class="game-name">今日罗牌</text>
          <text class="game-desc">神秘塔罗牌，揭示内心答案</text>
        </view>
        <view class="arrow">›</view>
      </view>

      <!-- 今日合拍度 -->
      <view class="game-card" @click="goToGame('compatibility')">
        <view class="game-icon compatibility-icon">💕</view>
        <view class="game-info">
          <text class="game-name">今日合拍度</text>
          <text class="game-desc">解锁你和YQ的TMI，包含YQ小剧场</text>
        </view>
        <view class="arrow">›</view>
      </view>

      <!-- 青宇对对碰 -->
      <view class="game-card" @click="goToGame('match')">
        <view class="game-icon match-icon">🎴</view>
        <view class="game-info">
          <text class="game-name">青宇对对碰</text>
          <text class="game-desc">翻牌配对，考验记忆力</text>
        </view>
        <view class="arrow">›</view>
      </view>

      <!-- 创意画板 -->
      <!-- <view class="game-card" @click="goToGame('draw')">
        <view class="game-icon draw-icon">🎨</view>
        <view class="game-info">
          <text class="game-name">创意画板</text>
          <text class="game-desc">自由绘画，释放你的创意</text>
        </view>
        <view class="arrow">›</view>
      </view> -->
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {}
  },
  methods: {
    goToGame(gameType) {
      const routes = {
        'shengbei': '/pages/game/shengbei',
        'tarot': '/pages/game/tarot',
        'compatibility': '/pages/game/compatibility',
        'match': '/pages/game/match',
        'draw': '/pages/game/draw'
      }
      
      if (routes[gameType]) {
        uni.navigateTo({
          url: routes[gameType]
        })
      }
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.header {
  text-align: center;
  padding: 30px 0;
}

.title {
  display: block;
  font-size: 32px;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 10px;
}

.subtitle {
  display: block;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.game-list {
  margin-top: 20px;
}

.game-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.game-card:active {
  transform: scale(0.98);
}

.game-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-right: 15px;
}

.shengbei-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.tarot-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.compatibility-icon {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.match-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.draw-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.game-info {
  flex: 1;
}

.game-name {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.game-desc {
  display: block;
  font-size: 13px;
  color: #999;
}

.arrow {
  font-size: 24px;
  color: #ccc;
  margin-left: 10px;
}
</style>
