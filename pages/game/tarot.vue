<template>
  <view class="container">
   
    <!-- 每日塔罗 - 扇形牌堆 -->
    <view class="fan-deck-container" v-if="!drawnCards.length">
      <view class="question-area">
        <text class="question-text">"{{ dailyQuestion || '随机抽取一张开启今日塔罗...' }}"</text>
      </view>
      
      <view class="fan-deck">
        <view 
          v-for="(card, index) in fanCards" 
          :key="index"
          class="fan-card"
          :style="getFanCardStyle(index)"
          @click="drawDailyCard(index)"
        >
          <view class="fan-card-back">
            <text class="fan-card-pattern">✦</text>
          </view>
        </view>
      </view>
      
      <view class="hint-text">点击任意一张牌进行抽取</view>
    </view>

    <!-- 每日塔罗结果 -->
    <view class="result-container" v-if="drawnCards.length">
      <view class="result-header">
        <text class="result-title">今日塔罗</text>
        <text class="result-date">{{ currentDate }}</text>
      </view>
      
      <view class="single-card-result">
        <view class="card-display" @click="previewCardImage">
          <!-- 正位显示 -->
          <template v-if="!drawnCards[0].isReversed">
            <image v-if="drawnCards[0].image" class="card-image" :src="drawnCards[0].image" mode="aspectFit"></image>
            <text v-else class="card-emoji">{{ drawnCards[0].emoji }}</text>
          </template>
          <!-- 逆位显示 -->
          <template v-else>
            <image v-if="drawnCards[0].reversed_image || drawnCards[0].image" 
                   class="card-image card-reversed" 
                   :src="drawnCards[0].reversed_image || drawnCards[0].image" 
                   mode="aspectFit"></image>
            <text v-else class="card-emoji card-emoji-reversed">{{ drawnCards[0].reversed_emoji || drawnCards[0].emoji }}</text>
          </template>
        </view>
        <text class="card-name">{{ drawnCards[0].name }}</text>
        <text class="card-position" :class="{ 'position-reversed': drawnCards[0].isReversed }">
          {{ drawnCards[0].isReversed ? '逆位' : '正位' }}
        </text>
        <view class="card-info">
          <text class="info-label">牌义</text>
          <text class="info-content">
            {{ drawnCards[0].isReversed ? (drawnCards[0].meaning_reversed || drawnCards[0].meaning) : (drawnCards[0].meaning_upright || drawnCards[0].meaning) }}
          </text>
        </view>
        <view class="card-interpretation-box">
          <text class="interpretation-text">
            {{ drawnCards[0].isReversed ? (drawnCards[0].interpretation_reversed || drawnCards[0].interpretation_upright || drawnCards[0].interpretation) : (drawnCards[0].interpretation_upright || drawnCards[0].interpretation) }}
          </text>
        </view>
      </view>
      
      <button class="action-btn" @click="resetGame">重新抽牌</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      tarotCards: [],
      dailyQuestion: '', // 每日问题
      isLoading: true,
      drawnCards: [],
      fanCards: Array(12).fill(null)
    }
  },
  computed: {
    currentDate() {
      const now = new Date()
      return `${now.getMonth() + 1}月${now.getDate()}日`
    }
  },
  onLoad() {
    this.loadTarotCards()
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
    goBack() {
      uni.navigateBack()
    },
    
    showHistory() {
      uni.showToast({
        title: '解读记录功能开发中',
        icon: 'none'
      })
    },
    
    async loadTarotCards() {
      try {
        uni.showLoading({ title: '加载中...' })
        
        const res = await uniCloud.callFunction({
          name: 'tarot-config',
          data: {}
        })
        
        if (res.result && res.result.code === 0) {
          const data = res.result.data
          this.tarotCards = data.cards || []
          this.dailyQuestion = data.dailyQuestion || ''
        } else {
          throw new Error(res.result.msg || '获取塔罗牌数据失败')
        }
      } catch (error) {
        console.error('加载塔罗牌数据异常:', error)
        uni.showToast({
          title: error.message || '加载失败，请重试',
          icon: 'none',
          duration: 3000
        })
        setTimeout(() => {
          uni.navigateBack()
        }, 2000)
      } finally {
        this.isLoading = false
        uni.hideLoading()
      }
    },
    
    getFanCardStyle(index) {
      const totalCards = this.fanCards.length
      const angle = (index - (totalCards - 1) / 2) * 8 // 每张牌间隔8度
      const translateY = Math.abs(angle) * 2
      
      return {
        transform: `rotate(${angle}deg) translateY(${translateY}px)`,
        zIndex: totalCards - Math.abs(index - (totalCards - 1) / 2)
      }
    },
    
    drawDailyCard(index) {
      if (this.drawnCards.length > 0) return
      
      const randomIndex = Math.floor(Math.random() * this.tarotCards.length)
      const card = { ...this.tarotCards[randomIndex] }
      // 随机正位或逆位，50%概率
      card.isReversed = Math.random() > 0.5
      
      this.drawnCards = [card]
      
      uni.showToast({
        title: `抽到了：${card.name}${card.isReversed ? '（逆位）' : '（正位）'}`,
        icon: 'none',
        duration: 2000
      })
    },
    
    resetGame() {
      this.drawnCards = []
    },
    
    previewCardImage() {
      const card = this.drawnCards[0]
      if (!card) return
      
      // 获取要预览的图片URL
      let imageUrl = ''
      if (card.isReversed) {
        imageUrl = card.reversed_image || card.image
      } else {
        imageUrl = card.image
      }
      
      // 如果没有图片，只显示提示
      if (!imageUrl) {
        uni.showToast({
          title: '暂无高清图片',
          icon: 'none'
        })
        return
      }
      
      // 使用uni.previewImage预览图片
      uni.previewImage({
        urls: [imageUrl],
        current: imageUrl,
        longPressActions: {
          itemList: ['保存图片'],
          success: function(data) {
            console.log('选择了第' + (data.tapIndex + 1) + '个按钮')
          },
          fail: function(err) {
            console.log(err.errMsg)
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
  background: linear-gradient(180deg, #e9d5ff 0%, #f3e8ff 50%, #ffffff 100%);
  padding-bottom: 20px;
}

/* 顶部导航 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.header-left, .header-right {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 32px;
  color: #7c3aed;
  font-weight: bold;
}

.history-icon {
  font-size: 24px;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
  color: #7c3aed;
}

/* 扇形牌堆 */
.fan-deck-container {
  padding: 20px;
  min-height: 500px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.question-area {
  text-align: center;
  margin-bottom: 40px;
}

.question-text {
  font-size: 18px;
  color: #7c3aed;
  font-weight: 500;
}

.fan-deck {
  position: relative;
  width: 100%;
  height: 250px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  margin-bottom: 30px;
}

.fan-card {
  position: absolute;
  bottom: 0;
  width: 80px;
  height: 130px;
  transition: transform 0.3s;
}

.fan-card:active {
  transform: translateY(-20px) !important;
}

.fan-card-back {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.fan-card-pattern {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.6);
}

.hint-text {
  font-size: 14px;
  color: #9ca3af;
  text-align: center;
}

/* 结果容器 */
.result-container {
  padding: 20px;
}

.result-header {
  text-align: center;
  margin-bottom: 20px;
}

.result-title {
  font-size: 24px;
  font-weight: bold;
  color: #7c3aed;
  display: block;
}

.result-date, .result-question {
  font-size: 14px;
  color: #9ca3af;
  margin-top: 5px;
  display: block;
}

.single-card-result {
  background: #ffffff;
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.15);
}

.card-display {
  width: 150px;
  height: 220px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
  cursor: pointer;
  position: relative;
}

.card-display::after {
  content: '🔍';
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 20px;
  opacity: 0.7;
}

.card-emoji {
  font-size: 80px;
  line-height: 1;
  transition: transform 0.5s ease;
}

.card-emoji-reversed {
  transform: rotate(180deg);
}

.card-image {
  width: 90%;
  height: 90%;
  border-radius: 8px;
  transition: transform 0.5s ease;
}

.card-reversed {
  transform: rotate(180deg);
}

.card-position {
  font-size: 14px;
  color: #a78bfa;
  display: block;
  margin-bottom: 15px;
  font-weight: bold;
}

.position-reversed {
  color: #ef4444;
}

.card-name {
  font-size: 24px;
  font-weight: bold;
  color: #7c3aed;
  display: block;
  margin-bottom: 5px;
}

.card-info {
  margin-bottom: 20px;
}

.info-label {
  font-size: 14px;
  color: #9ca3af;
  display: block;
  margin-bottom: 5px;
}

.info-content {
  font-size: 15px;
  color: #6b7280;
  display: block;
}

.card-interpretation-box {
  background: #f3e8ff;
  border-radius: 12px;
  padding: 15px;
}

.interpretation-text {
  font-size: 14px;
  color: #7c3aed;
  line-height: 1.6;
}

.action-btn {
  margin-top: 20px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: #ffffff;
  border: none;
  border-radius: 25px;
  padding: 12px 40px;
  font-size: 16px;
  font-weight: bold;
}
</style>
