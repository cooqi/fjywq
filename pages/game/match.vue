<template>
  <view class="container">
    <!-- 难度选择界面 -->
    <view class="difficulty-selector" v-if="!gameStarted">
      <view class="selector-header">
        <text class="selector-title">🎴 青宇对对碰</text>
        <text class="selector-subtitle">选择难度开始游戏</text>
      </view>
      
      <view class="difficulty-options">
        <view 
          class="difficulty-card" 
          :class="{ 'selected': selectedDifficulty === 'easy' }"
          @click="selectDifficulty('easy')"
        >
          <view class="difficulty-icon">😊</view>
          <text class="difficulty-name">简单</text>
          <text class="difficulty-desc">14张卡片 · 7对</text>
          <text class="difficulty-grid">4×4 网格</text>
        </view>
        
        <view 
          class="difficulty-card" 
          :class="{ 'selected': selectedDifficulty === 'medium' }"
          @click="selectDifficulty('medium')"
        >
          <view class="difficulty-icon">😐</view>
          <text class="difficulty-name">中等</text>
          <text class="difficulty-desc">20张卡片 · 10对</text>
          <text class="difficulty-grid">4×5 网格</text>
        </view>
        
        <view 
          class="difficulty-card" 
          :class="{ 'selected': selectedDifficulty === 'hard' }"
          @click="selectDifficulty('hard')"
        >
          <view class="difficulty-icon">😰</view>
          <text class="difficulty-name">困难</text>
          <text class="difficulty-desc">30张卡片 · 15对</text>
          <text class="difficulty-grid">5×6 网格</text>
        </view>
      </view>
      
      <button class="start-btn" @click="startGame" :disabled="!selectedDifficulty">
        开始游戏
      </button>
    </view>

    <!-- 游戏界面 -->
    <view class="game-content" v-else>
      <view class="game-info">
        <view class="info-item">
          <text class="info-label">步数</text>
          <text class="info-value">{{ moves }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">时间</text>
          <text class="info-value">{{ formatTime(time) }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">配对</text>
          <text class="info-value">{{ matchedPairs }}/{{ totalPairs }}</text>
        </view>
      </view>

      <view class="game-board" :class="'grid-' + currentGrid">
        <view 
          v-for="(card, index) in cards" 
          :key="index"
          class="card"
          :class="{ 'flipped': card.flipped, 'matched': card.matched }"
          @click="flipCard(index)"
        >
          <view class="card-inner">
            <view class="card-front">
              <text class="card-emoji">🎴</text>
            </view>
            <view class="card-back">
              <image class="card-image" :src="card.image" mode="aspectFit"></image>
            </view>
          </view>
        </view>
      </view>

      <view class="controls">
        <button class="back-btn" @click="backToMenu">返回菜单</button>
        <button class="restart-btn" @click="restartGame">重新开始</button>
      </view>

      <!-- 胜利弹窗 -->
      <view class="win-modal" v-if="showWinModal">
        <view class="modal-content">
          <text class="win-icon">🎉</text>
          <text class="win-title">恭喜通关！</text>
          <view class="win-stats">
            <view class="stat-item">
              <text class="stat-label">难度</text>
              <text class="stat-value">{{ getDifficultyName() }}</text>
            </view>
            <view class="stat-item">
              <text class="stat-label">用时</text>
              <text class="stat-value">{{ formatTime(time) }}</text>
            </view>
            <view class="stat-item">
              <text class="stat-label">步数</text>
              <text class="stat-value">{{ moves }}</text>
            </view>
            <view class="stat-item">
              <text class="stat-label">评级</text>
              <text class="stat-value">{{ getRating() }}</text>
            </view>
          </view>
          <button class="play-again-btn" @click="backToMenu">再来一局</button>
        </view>
      </view>

      <view class="rules">
        <text class="rules-title">游戏规则</text>
        <text class="rules-content">点击卡片翻开，找到相同的图案进行配对。用最少的步数和最短的时间完成所有配对吧！</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      gameStarted: false,
      selectedDifficulty: '',
      currentGrid: '4x4',
      cards: [],
      flippedCards: [],
      matchedPairs: 0,
      totalPairs: 7,
      moves: 0,
      time: 0,
      timer: null,
      isLocked: false,
      showWinModal: false,
      // 难度配置
      difficultyConfig: {
        easy: { pairs: 7, grid: '4x4', columns: 4 },
        medium: { pairs: 10, grid: '4x5', columns: 4 },
        hard: { pairs: 15, grid: '5x6', columns: 5 }
      },
      // 配对图片的网络URL（至少需要15张）
      imageUrls: [
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy1.jpg',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy2.jpg',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy3.jpg',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy4.png',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy5.jpg',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy6.jpg',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy7.jpg',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy8.jpg',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy9.png',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy10.jpg',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy11.jpg',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy12.jpg',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy13.jpg',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy14.jpg',
        'https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy15.jpg'
      ]
    }
  },
  onLoad() {
    // 页面加载时不自动初始化游戏，等待用户选择难度
  },
  onUnload() {
    this.clearTimer()
  },
  methods: {
    // 选择难度
    selectDifficulty(difficulty) {
      this.selectedDifficulty = difficulty
    },
    
    // 开始游戏
    startGame() {
      if (!this.selectedDifficulty) return
      
      const config = this.difficultyConfig[this.selectedDifficulty]
      this.totalPairs = config.pairs
      this.currentGrid = config.grid
      
      this.gameStarted = true
      this.initGame()
    },
    
    // 返回菜单
    backToMenu() {
      this.clearTimer()
      this.showWinModal = false
      this.gameStarted = false
      this.selectedDifficulty = ''
    },
    
    initGame() {
      // 根据难度选择对应数量的图片
      const selectedImages = this.imageUrls.slice(0, this.totalPairs)
      
      // 创建配对卡片（使用图片URL）
      const cardPairs = [...selectedImages, ...selectedImages]
      
      // 洗牌
      this.cards = this.shuffle(cardPairs).map(image => ({
        image,
        flipped: false,
        matched: false
      }))
      
      this.flippedCards = []
      this.matchedPairs = 0
      this.moves = 0
      this.time = 0
      this.isLocked = false
      this.showWinModal = false
      
      this.startTimer()
    },
    
    shuffle(array) {
      const newArray = [...array]
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
      }
      return newArray
    },
    
    flipCard(index) {
      if (this.isLocked) return
      if (this.cards[index].flipped || this.cards[index].matched) return
      
      // 翻开卡片
      this.cards[index].flipped = true
      this.flippedCards.push(index)
      
      // 如果翻开了两张卡片
      if (this.flippedCards.length === 2) {
        this.moves++
        this.checkMatch()
      }
    },
    
    checkMatch() {
      this.isLocked = true
      const [firstIndex, secondIndex] = this.flippedCards
      const firstCard = this.cards[firstIndex]
      const secondCard = this.cards[secondIndex]
      
      if (firstCard.image === secondCard.image) {
        // 配对成功
        setTimeout(() => {
          firstCard.matched = true
          secondCard.matched = true
          this.matchedPairs++
          this.flippedCards = []
          this.isLocked = false
          
          // 检查是否全部配对完成
          if (this.matchedPairs === this.totalPairs) {
            this.gameWin()
          }
        }, 500)
      } else {
        // 配对失败，翻回去
        setTimeout(() => {
          firstCard.flipped = false
          secondCard.flipped = false
          this.flippedCards = []
          this.isLocked = false
        }, 1000)
      }
    },
    
    gameWin() {
      this.clearTimer()
      setTimeout(() => {
        this.showWinModal = true
      }, 500)
    },
    
    restartGame() {
      this.clearTimer()
      this.showWinModal = false
      this.initGame()
    },
    
    startTimer() {
      this.clearTimer()
      this.timer = setInterval(() => {
        this.time++
      }, 1000)
    },
    
    clearTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    },
    
    getRating() {
      const perfectMoves = this.totalPairs * 2
      if (this.moves <= perfectMoves + 4) return '⭐⭐⭐'
      if (this.moves <= perfectMoves + 8) return '⭐⭐'
      return '⭐'
    },
    
    getDifficultyName() {
      const names = {
        easy: '简单',
        medium: '中等',
        hard: '困难'
      }
      return names[this.selectedDifficulty] || ''
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

/* 难度选择界面 */
.difficulty-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.selector-header {
  text-align: center;
  margin-bottom: 40px;
}

.selector-title {
  display: block;
  font-size: 32px;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 10px;
}

.selector-subtitle {
  display: block;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.difficulty-options {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.difficulty-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 3px solid transparent;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.difficulty-card:active {
  transform: scale(0.98);
}

.difficulty-card.selected {
  border-color: #f093fb;
  background: #ffffff;
  box-shadow: 0 8px 25px rgba(240, 147, 251, 0.3);
}

.difficulty-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.difficulty-name {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.difficulty-desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 2px;
}

.difficulty-grid {
  font-size: 12px;
  color: #999;
}

.start-btn {
  width: 100%;
  max-width: 400px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #ffffff;
  border: none;
  border-radius: 25px;
  padding: 15px 40px;
  font-size: 18px;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
}

.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 游戏内容区域 */
.game-content {
  display: block;
}

.header {
  text-align: center;
  padding: 20px 0;
}

.title {
  display: block;
  font-size: 28px;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 8px;
}

.subtitle {
  display: block;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.game-info {
  display: flex;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 15px;
  margin: 20px 0;
  backdrop-filter: blur(10px);
}

.info-item {
  text-align: center;
}

.info-label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 5px;
}

.info-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #ffffff;
}

.game-board {
  display: grid;
  gap: 10px;
  margin: 20px 0;
}

/* 简单模式 4x4 */
.game-board.grid-4x4 {
  grid-template-columns: repeat(4, 1fr);
}

/* 中等模式 4x5 */
.game-board.grid-4x5 {
  grid-template-columns: repeat(4, 1fr);
}

/* 困难模式 5x6 */
.game-board.grid-5x6 {
  grid-template-columns: repeat(5, 1fr);
}

.card {
  aspect-ratio: 1;
  perspective: 1000px;
  cursor: pointer;
}

.card-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s;
}

.card.flipped .card-inner {
  transform: rotateY(180deg);
}

.card.matched .card-inner {
  transform: rotateY(180deg);
}

.card.matched {
  opacity: 0.6;
}

.card-front,
.card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.card-front {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.card-back {
  background: #ffffff;
  transform: rotateY(180deg);
}

.card-emoji {
  font-size: 32px;
  color: rgba(255, 255, 255, 0.8);
}

.card-image {
  width: 90%;
  height: 90%;
  border-radius: 8px;
}

.controls {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.back-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.9);
  color: #667eea;
  border: none;
  border-radius: 25px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: bold;
}

.restart-btn {
  flex: 1;
  background: #ffffff;
  color: #667eea;
  border: none;
  border-radius: 25px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: bold;
}

.win-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #ffffff;
  border-radius: 20px;
  padding: 40px 30px;
  text-align: center;
  max-width: 320px;
  width: 90%;
  animation: modalPop 0.3s ease-out;
}

@keyframes modalPop {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.win-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 15px;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.win-title {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 20px;
}

.win-stats {
  margin-bottom: 25px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #667eea;
}

.play-again-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border: none;
  border-radius: 25px;
  padding: 12px 40px;
  font-size: 16px;
  font-weight: bold;
  width: 100%;
}

.rules {
  margin-top: 30px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.rules-title {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 10px;
}

.rules-content {
  display: block;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}
</style>
