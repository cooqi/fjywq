<template>
  <view class="container">
   

    <view class="game-list">
      <!-- 掷圣杯 -->
      <view class="game-card" @click="goToGame('shengbei')">
        <view class="game-icon shengbei-icon">🏺</view>
        <text class="game-name">掷圣杯</text>
        <text class="game-desc">宇宇青青的指示</text>
      </view>

      <!-- 塔罗牌 -->
      <view class="game-card" @click="goToGame('tarot')">
        <view class="game-icon tarot-icon">🃏</view>
        <text class="game-name">今日卡牌</text>
        <text class="game-desc">神秘卡牌占卜</text>
      </view>

      <!-- 今日合拍度 -->
      <view class="game-card" @click="goToGame('compatibility')">
        <view class="game-icon compatibility-icon">💕</view>
        <text class="game-name">合拍度</text>
        <text class="game-desc">YQ 小剧场</text>
      </view>

      <!-- 青宇对对碰 -->
      <view class="game-card" @click="goToGame('match')">
        <view class="game-icon match-icon">🎴</view>
        <text class="game-name">对对碰</text>
        <text class="game-desc">翻牌配对记忆</text>
      </view>

      <!-- 华容道 -->
      <view class="game-card" @click="goToGame('huarongdao')">
        <view class="game-icon huarongdao-icon">🧩</view>
        <text class="game-name">宇青大逃亡</text>
        <text class="game-desc">经典益智华容道</text>
      </view>

      <!-- 青宇问答 -->
      <view class="game-card" @click="goToGame('qa')">
        <view class="game-icon qa-icon">📝</view>
        <text class="game-name">青宇问答</text>
        <text class="game-desc">25题限时挑战</text>
      </view>

      <!-- 答案之书 -->
      <view class="game-card" @click="goToGame('answerBook')">
        <view class="game-icon answer-book-icon">📖</view>
        <text class="game-name">答案之书</text>
        <text class="game-desc">寻找你的答案</text>
      </view>

      <!-- 创意画板 -->
      <!-- <view class="game-card" @click="goToGame('draw')">
        <view class="game-icon draw-icon">🎨</view>
        <text class="game-name">创意画板</text>
        <text class="game-desc">自由绘画</text>
      </view> -->
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {}
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
    goToGame(gameType) {
      const routes = {
        'shengbei': '/pages/game/shengbei',
        'tarot': '/pages/game/tarot',
        'compatibility': '/pages/game/compatibility',
        'match': '/pages/game/match',
        'draw': '/pages/game/draw',
        'huarongdao': '/pages/game/huarongdao',
        'qa': '/pages/game/QA/qa-exam',
        'answerBook': '/pages/game/answer-book'
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
  background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
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
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.game-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 18px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 130px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.game-card:active {
  transform: scale(0.96);
}

.game-icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 10px;
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

.huarongdao-icon {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.qa-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.answer-book-icon {
  background: linear-gradient(135deg, #4aa8b8 0%, #6f5bd8 100%);
}

.game-info {
  display: none;
}

.game-name {
  display: block;
  font-size: 15px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
  text-align: center;
}

.game-desc {
  display: block;
  font-size: 11px;
  color: #999;
  text-align: center;
  line-height: 1.3;
  padding: 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.arrow {
  display: none;
}
</style>
