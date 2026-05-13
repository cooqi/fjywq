<template>
  <view class="container">
    <!-- 难度选择界面 -->
    <view class="difficulty-selector" v-if="!gameStarted">
      <view class="selector-header">
        <text class="selector-title">🧩 青宇大逃亡</text>
        <text class="selector-subtitle">经典益智游戏，帮助青宇逃脱</text>
      </view>
      
      <view class="difficulty-options">
        <view 
          class="difficulty-card" 
          :class="{ 'selected': selectedLevel === 'easy' }"
          @click="selectLevel('easy')"
        >
          <view class="difficulty-icon">😊</view>
          <view class="difficulty-info">
            <text class="difficulty-name">初级</text>
          </view>
          <text class="difficulty-desc">简单布局 · 易上手</text>
        </view>
        
        <view 
          class="difficulty-card" 
          :class="{ 'selected': selectedLevel === 'medium' }"
          @click="selectLevel('medium')"
        >
          <view class="difficulty-icon">😐</view>
          <view class="difficulty-info">
            <text class="difficulty-name">中级</text>
          </view>
          <text class="difficulty-desc">经典布局 · 有挑战</text>
        </view>
        
        <view 
          class="difficulty-card difficulty-card-hard" 
          :class="{ 'selected': selectedLevel === 'hard' }"
          @click="selectLevel('hard')"
        >
          <view class="difficulty-icon">😰</view>
          <view class="difficulty-info">
            <text class="difficulty-name">高级</text>
            <text class="difficulty-badge">烧脑</text>
          </view>
          <text class="difficulty-desc">复杂布局 · 极考验</text>
        </view>
      </view>
      
      <button class="start-btn" @click="startGame" :disabled="!selectedLevel">
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
      </view>

      <!-- 游戏棋盘 -->
      <view class="game-board">
        <!-- 棋盘格子背景 -->
        <view 
          v-for="row in boardHeight" 
          :key="'row-' + row"
          class="board-row"
        >
          <view 
            v-for="col in boardWidth" 
            :key="'cell-' + col"
            class="board-cell"
          ></view>
        </view>
        
        <!-- 棋子 -->
        <view 
          v-for="(block, index) in blocks" 
          :key="index"
          class="block"
          :class="['block-' + block.type, { 'block-selected': selectedBlock === index }]"
          :style="{
            left: block.x * cellSize + 'px',
            top: block.y * cellSize + 'px',
            width: block.width * cellSize + 'px',
            height: block.height * cellSize + 'px'
          }"
          @click="selectBlock(index)"
        >
          <text class="block-text">{{ getBlockText(block.type) }}</text>
        </view>
        
        <!-- 移动方向按钮 -->
        <view class="move-controls" v-if="selectedBlock !== -1">
          <view 
            class="move-btn move-up" 
            v-if="canMoveDirection('up')"
            @click.stop="moveSelectedBlock('up')"
          >
            ↑
          </view>
          <view 
            class="move-btn move-down" 
            v-if="canMoveDirection('down')"
            @click.stop="moveSelectedBlock('down')"
          >
            ↓
          </view>
          <view 
            class="move-btn move-left" 
            v-if="canMoveDirection('left')"
            @click.stop="moveSelectedBlock('left')"
          >
            ←
          </view>
          <view 
            class="move-btn move-right" 
            v-if="canMoveDirection('right')"
            @click.stop="moveSelectedBlock('right')"
          >
            →
          </view>
        </view>
        
        <!-- 出口标记 -->
        <view class="exit-marker">
          <text class="exit-text">出口</text>
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
              <text class="stat-value">{{ getLevelName() }}</text>
            </view>
            <view class="stat-item">
              <text class="stat-label">用时</text>
              <text class="stat-value">{{ formatTime(time) }}</text>
            </view>
            <view class="stat-item">
              <text class="stat-label">步数</text>
              <text class="stat-value">{{ moves }}</text>
            </view>
          </view>
          <button class="play-again-btn" @click="backToMenu">再来一局</button>
        </view>
      </view>

      <view class="rules">
        <text class="rules-title">游戏规则</text>
        <text class="rules-content">点击棋子选中，再点击方向箭头移动。每次游戏都会生成不同的随机布局，目标是让最大的棋子（青宇）从底部出口逃脱！</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      gameStarted: false,
      selectedLevel: '',
      boardWidth: 4, // 4列
      boardHeight: 5, // 5行
      cellSize: 70, // 每个格子的大小
      blocks: [],
      selectedBlock: -1, // 当前选中的棋子索引
      moves: 0,
      time: 0,
      timer: null,
      showWinModal: false,
      // 基础关卡配置（用于随机打乱的起点）
      baseLevels: {
        easy: [
          { type: 'caocao', x: 1, y: 0, width: 2, height: 2 },
          { type: 'general_h', x: 0, y: 0, width: 1, height: 2 },
          { type: 'general_h', x: 3, y: 0, width: 1, height: 2 },
          { type: 'soldier', x: 0, y: 2, width: 1, height: 1 },
          { type: 'soldier', x: 3, y: 2, width: 1, height: 1 },
          { type: 'soldier', x: 1, y: 2, width: 1, height: 1 },
          { type: 'soldier', x: 2, y: 2, width: 1, height: 1 },
          { type: 'soldier', x: 1, y: 3, width: 1, height: 1 },
          { type: 'soldier', x: 2, y: 3, width: 1, height: 1 }
        ],
        medium: [
          { type: 'caocao', x: 1, y: 0, width: 2, height: 2 },
          { type: 'general_v', x: 0, y: 0, width: 1, height: 2 },
          { type: 'general_v', x: 3, y: 0, width: 1, height: 2 },
          { type: 'general_h', x: 1, y: 2, width: 2, height: 1 },
          { type: 'soldier', x: 0, y: 2, width: 1, height: 1 },
          { type: 'soldier', x: 3, y: 2, width: 1, height: 1 },
          { type: 'soldier', x: 0, y: 3, width: 1, height: 1 },
          { type: 'soldier', x: 3, y: 3, width: 1, height: 1 },
          { type: 'soldier', x: 1, y: 3, width: 1, height: 1 },
          { type: 'soldier', x: 2, y: 3, width: 1, height: 1 }
        ],
        hard: [
          { type: 'caocao', x: 1, y: 0, width: 2, height: 2 },
          { type: 'general_v', x: 0, y: 0, width: 1, height: 2 },
          { type: 'general_v', x: 3, y: 0, width: 1, height: 2 },
          { type: 'general_v', x: 0, y: 2, width: 1, height: 2 },
          { type: 'general_v', x: 3, y: 2, width: 1, height: 2 },
          { type: 'general_h', x: 1, y: 2, width: 2, height: 1 },
          { type: 'soldier', x: 1, y: 3, width: 1, height: 1 },
          { type: 'soldier', x: 2, y: 3, width: 1, height: 1 },
          { type: 'soldier', x: 0, y: 4, width: 1, height: 1 },
          { type: 'soldier', x: 3, y: 4, width: 1, height: 1 }
        ]
      }
    }
  },
  onLoad() {
    // 页面加载时不自动初始化游戏
  },
  onUnload() {
    this.clearTimer()
  },
  methods: {
    // 选择难度
    selectLevel(level) {
      this.selectedLevel = level
    },
    
    // 开始游戏
    startGame() {
      if (!this.selectedLevel) return
      
      this.gameStarted = true
      this.initGame()
    },
    
    // 返回菜单
    backToMenu() {
      uni.showModal({
        title: '提示',
        content: '确定要返回菜单吗？当前进度将丢失',
        success: (res) => {
          if (res.confirm) {
            this.clearTimer()
            this.showWinModal = false
            this.gameStarted = false
            this.selectedLevel = ''
          }
        }
      })
    },
    
    initGame() {
      // 从基础关卡生成随机布局
      this.blocks = this.generateRandomLayout(this.selectedLevel)
      this.moves = 0
      this.time = 0
      this.selectedBlock = -1
      this.showWinModal = false
      
      this.startTimer()
    },
    
    // 生成随机布局（通过随机移动打乱）
    generateRandomLayout(level) {
      // 深拷贝基础布局
      let blocks = JSON.parse(JSON.stringify(this.baseLevels[level]))
      
      // 根据难度确定打乱步数
      const shuffleSteps = {
        easy: 50,
        medium: 100,
        hard: 150
      }
      
      const steps = shuffleSteps[level] || 100
      
      // 随机移动棋子来打乱布局
      for (let i = 0; i < steps; i++) {
        // 随机选择一个棋子
        const randomIndex = Math.floor(Math.random() * blocks.length)
        const block = blocks[randomIndex]
        
        // 尝试四个方向
        const directions = [
          { dx: 0, dy: -1 }, // 上
          { dx: 0, dy: 1 },  // 下
          { dx: -1, dy: 0 }, // 左
          { dx: 1, dy: 0 }   // 右
        ]
        
        // 随机打乱方向顺序
        directions.sort(() => Math.random() - 0.5)
        
        // 找到第一个可移动的方向并移动
        for (const dir of directions) {
          if (this.canMoveForShuffle(blocks, block, dir.dx, dir.dy)) {
            block.x += dir.dx
            block.y += dir.dy
            break
          }
        }
      }
      
      return blocks
    },
    
    // 打乱时检查是否可以移动
    canMoveForShuffle(blocks, block, dx, dy) {
      const newX = block.x + dx
      const newY = block.y + dy
      
      // 检查边界
      if (newX < 0 || newX + block.width > this.boardWidth) return false
      if (newY < 0 || newY + block.height > this.boardHeight) return false
      
      // 检查是否与其他棋子碰撞
      for (const other of blocks) {
        if (other === block) continue
        
        if (this.isOverlap(
          newX, newY, block.width, block.height,
          other.x, other.y, other.width, other.height
        )) {
          return false
        }
      }
      
      return true
    },
    
    // 选择棋子
    selectBlock(index) {
      // 如果点击的是已选中的棋子，取消选中
      if (this.selectedBlock === index) {
        this.selectedBlock = -1
        return
      }
      
      // 选中新棋子
      this.selectedBlock = index
    },
    
    // 检查指定方向是否可以移动
    canMoveDirection(direction) {
      if (this.selectedBlock === -1) return false
      
      const block = this.blocks[this.selectedBlock]
      const directions = {
        up: { dx: 0, dy: -1 },
        down: { dx: 0, dy: 1 },
        left: { dx: -1, dy: 0 },
        right: { dx: 1, dy: 0 }
      }
      
      const dir = directions[direction]
      return this.canMove(block, dir.dx, dir.dy)
    },
    
    // 移动选中的棋子
    moveSelectedBlock(direction) {
      if (this.selectedBlock === -1) return
      
      const block = this.blocks[this.selectedBlock]
      const directions = {
        up: { dx: 0, dy: -1 },
        down: { dx: 0, dy: 1 },
        left: { dx: -1, dy: 0 },
        right: { dx: 1, dy: 0 }
      }
      
      const dir = directions[direction]
      if (this.canMove(block, dir.dx, dir.dy)) {
        block.x += dir.dx
        block.y += dir.dy
        this.moves++
        
        // 检查是否获胜
        this.checkWin()
      }
    },
    
    // 检查是否可以移动
    canMove(block, dx, dy) {
      const newX = block.x + dx
      const newY = block.y + dy
      
      // 检查边界
      if (newX < 0 || newX + block.width > this.boardWidth) return false
      if (newY < 0 || newY + block.height > this.boardHeight) return false
      
      // 检查是否与其他棋子碰撞
      for (const other of this.blocks) {
        if (other === block) continue
        
        if (this.isOverlap(
          newX, newY, block.width, block.height,
          other.x, other.y, other.width, other.height
        )) {
          return false
        }
      }
      
      return true
    },
    
    // 检查两个矩形是否重叠
    isOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
      return !(x1 + w1 <= x2 || x2 + w2 <= x1 || 
               y1 + h1 <= y2 || y2 + h2 <= y1)
    },
    
    // 检查是否获胜（青宇到达底部出口）
    checkWin() {
      const caocao = this.blocks.find(b => b.type === 'caocao')
      if (caocao && caocao.y === 3) {
        this.gameWin()
      }
    },
    
    gameWin() {
      this.clearTimer()
      setTimeout(() => {
        this.showWinModal = true
      }, 300)
    },
    
    restartGame() {
      uni.showModal({
        title: '提示',
        content: '确定要重新开始吗？当前进度将丢失',
        success: (res) => {
          if (res.confirm) {
            this.clearTimer()
            this.showWinModal = false
            this.initGame()
          }
        }
      })
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
    
    getBlockText(type) {
      const texts = {
        caocao: '青宇',
        general_v: '杯杯儿',
        general_h: '闺女',
        soldier: '黑子'
      }
      return texts[type] || ''
    },
    
    getLevelName() {
      const names = {
        easy: '初级',
        medium: '中级',
        hard: '高级'
      }
      return names[this.selectedLevel] || ''
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

.difficulty-card-hard {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 107, 107, 0.1) 100%);
  border: 2px solid rgba(255, 107, 107, 0.3);
}

.difficulty-card-hard.selected {
  border-color: #ff4757;
  background: linear-gradient(135deg, #ffffff 0%, #ffe0e0 100%);
  box-shadow: 0 8px 25px rgba(255, 71, 87, 0.4);
}

.difficulty-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.difficulty-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.difficulty-name {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.difficulty-badge {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #ffffff;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: bold;
}

.difficulty-desc {
  font-size: 13px;
  color: #666;
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

/* 游戏棋盘 */
.game-board {
  position: relative;
  width: 280px;
  height: 350px;
  margin: 20px auto;
  background: #8B4513;
  border: 4px solid #654321;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

/* 棋盘格子背景 */
.board-row {
  display: flex;
  width: 100%;
  height: 70px;
}

.board-cell {
  width: 70px;
  height: 70px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
}

.block {
  position: absolute;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  z-index: 10;
}

.block:active {
  transform: scale(0.95);
  opacity: 0.9;
}

.block-selected {
  box-shadow: 0 0 0 3px #FFD700, 0 4px 12px rgba(255, 215, 0, 0.5);
  z-index: 20;
}

.block-caocao {
  background: linear-gradient(135deg, #9817ee 0%, #1cddeb 100%);
  border: 2px solid #5209c9;
}

.block-general_v {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  border: 2px solid #388E3C;
}

.block-general_h {
  background: linear-gradient(135deg, #f8f661 0%, #d3b013 100%);
  border: 2px solid #c0af15;
}

.block-soldier {
  background: linear-gradient(135deg, #9E9E9E 0%, #757575 100%);
  border: 2px solid #616161;
}

.block-text {
  color: #ffffff;
  font-weight: bold;
  font-size: 14px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.exit-marker {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: #ff4757;
  color: #ffffff;
  padding: 4px 15px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  z-index: 5;
}

/* 移动控制按钮 */
.move-controls {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 30;
}

.move-btn {
  position: absolute;
  width: 40px;
  height: 40px;
  background: rgba(255, 215, 0, 0.9);
  border: 2px solid #FFA500;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #ffffff;
  font-weight: bold;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  animation: pulse 1.5s infinite;
}

.move-btn:active {
  transform: scale(0.9);
  background: #FFA500;
}

@keyframes pulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  50% { 
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.6);
  }
}

.move-up {
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
}

.move-down {
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
}

.move-left {
  left: -50px;
  top: 50%;
  transform: translateY(-50%);
}

.move-right {
  right: -50px;
  top: 50%;
  transform: translateY(-50%);
}

.controls {
  margin-top: 40px;
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

/* 胜利弹窗 */
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
