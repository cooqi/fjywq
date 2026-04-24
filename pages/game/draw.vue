<template>
  <view class="container">
    <!-- 顶部工具栏 -->
    <view class="toolbar">
      <!-- 颜色选择 -->
      <view class="color-picker">
        <view 
          v-for="(color, index) in colors" 
          :key="index"
          class="color-item"
          :class="{ 'active': currentColor === color }"
          :style="{ backgroundColor: color }"
          @click="selectColor(color)"
        ></view>
      </view>
      
      <!-- 画笔大小 -->
      <view class="brush-size">
        <text class="size-label">画笔:</text>
        <slider 
          class="size-slider"
          :value="brushSize" 
          min="1" 
          max="20" 
          step="1"
          activeColor="#667eea"
          @change="onBrushSizeChange"
        />
        <text class="size-value">{{ brushSize }}px</text>
      </view>
    </view>

    <!-- 画布区域 -->
    <view class="canvas-container">
      <canvas 
        canvas-id="drawingCanvas" 
        class="drawing-canvas"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        disable-scroll="true"
        type="2d"
      ></canvas>
    </view>

    <!-- 底部操作栏 -->
    <view class="action-bar">
      <button class="action-btn btn-clear" @click="clearCanvas">
        <text class="btn-icon">🗑️</text>
        <text class="btn-text">清空</text>
      </button>
      <button class="action-btn btn-undo" @click="undo">
        <text class="btn-icon">↩️</text>
        <text class="btn-text">撤销</text>
      </button>
      <button class="action-btn btn-save" @click="saveImage">
        <text class="btn-icon">💾</text>
        <text class="btn-text">保存</text>
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      ctx: null,
      canvasWidth: 0,
      canvasHeight: 0,
      isDrawing: false,
      lastX: 0,
      lastY: 0,
      currentColor: '#000000',
      brushSize: 3,
      colors: [
        '#000000',
        '#FF0000',
        '#FF6B6B',
        '#FFA500',
        '#FFD700',
        '#4CAF50',
        '#00BCD4',
        '#2196F3',
        '#9C27B0',
        '#E91E63',
        '#FFFFFF',
        '#8B4513'
      ],
      history: [], // 撤销历史
      maxHistory: 20 // 最大历史记录数
    }
  },
  onReady() {
    this.initCanvas()
  },
  methods: {
    initCanvas() {
      const query = uni.createSelectorQuery().in(this)
      query.select('.drawing-canvas').boundingClientRect(rect => {
        if (rect) {
          this.canvasWidth = rect.width
          this.canvasHeight = rect.height
          
          this.ctx = uni.createCanvasContext('drawingCanvas', this)
          this.ctx.setStrokeStyle(this.currentColor)
          this.ctx.setLineWidth(this.brushSize)
          this.ctx.setLineCap('round')
          this.ctx.setLineJoin('round')
          
          // 设置白色背景
          this.ctx.setFillStyle('#FFFFFF')
          this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
          this.ctx.draw()
          
          // 保存初始状态
          this.saveToHistory()
        }
      }).exec()
    },
    
    onTouchStart(e) {
      this.isDrawing = true
      const touch = e.touches[0]
      this.lastX = touch.x
      this.lastY = touch.y
      
      // 绘制起点
      this.ctx.beginPath()
      this.ctx.moveTo(this.lastX, this.lastY)
      this.ctx.lineTo(this.lastX, this.lastY)
      this.ctx.stroke()
      this.ctx.draw(true)
    },
    
    onTouchMove(e) {
      if (!this.isDrawing) return
      
      const touch = e.touches[0]
      const currentX = touch.x
      const currentY = touch.y
      
      this.ctx.beginPath()
      this.ctx.moveTo(this.lastX, this.lastY)
      this.ctx.lineTo(currentX, currentY)
      this.ctx.stroke()
      this.ctx.draw(true)
      
      this.lastX = currentX
      this.lastY = currentY
    },
    
    onTouchEnd() {
      if (this.isDrawing) {
        this.isDrawing = false
        this.ctx.closePath()
        // 保存到历史记录
        this.saveToHistory()
      }
    },
    
    selectColor(color) {
      this.currentColor = color
      this.ctx.setStrokeStyle(color)
    },
    
    onBrushSizeChange(e) {
      this.brushSize = e.detail.value
      this.ctx.setLineWidth(this.brushSize)
    },
    
    clearCanvas() {
      uni.showModal({
        title: '提示',
        content: '确定要清空画布吗？',
        success: (res) => {
          if (res.confirm) {
            this.ctx.setFillStyle('#FFFFFF')
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
            this.ctx.draw()
            this.history = []
            this.saveToHistory()
            
            uni.showToast({
              title: '已清空',
              icon: 'success'
            })
          }
        }
      })
    },
    
    undo() {
      if (this.history.length <= 1) {
        uni.showToast({
          title: '无法撤销',
          icon: 'none'
        })
        return
      }
      
      // 移除当前状态
      this.history.pop()
      // 获取上一个状态
      const previousState = this.history[this.history.length - 1]
      
      // 恢复画布
      this.ctx.putImageData(previousState, 0, 0)
      this.ctx.draw()
      
      uni.showToast({
        title: '已撤销',
        icon: 'success'
      })
    },
    
    saveToHistory() {
      // 由于uni-app的canvas不支持getImageData，这里简化处理
      // 实际项目中可以考虑使用offscreen canvas或其他方案
      if (this.history.length >= this.maxHistory) {
        this.history.shift()
      }
      // 这里暂时不实现完整的撤销功能，因为uni-app canvas限制
    },
    
    saveImage() {
      uni.canvasToTempFilePath({
        canvasId: 'drawingCanvas',
        success: (res) => {
          uni.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              uni.showToast({
                title: '保存成功',
                icon: 'success'
              })
            },
            fail: (err) => {
              console.error('保存失败:', err)
              uni.showToast({
                title: '保存失败',
                icon: 'none'
              })
            }
          })
        },
        fail: (err) => {
          console.error('生成图片失败:', err)
          uni.showToast({
            title: '生成失败',
            icon: 'none'
          })
        }
      }, this)
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

.toolbar {
  background: rgba(255, 255, 255, 0.95);
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.color-item {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #ddd;
  cursor: pointer;
  transition: all 0.2s;
}

.color-item.active {
  border-color: #667eea;
  transform: scale(1.2);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.brush-size {
  display: flex;
  align-items: center;
  gap: 10px;
}

.size-label {
  font-size: 14px;
  color: #333;
  font-weight: bold;
}

.size-slider {
  flex: 1;
}

.size-value {
  font-size: 14px;
  color: #667eea;
  font-weight: bold;
  min-width: 50px;
  text-align: right;
}

.canvas-container {
  flex: 1;
  padding: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.drawing-canvas {
  width: 100%;
  height: 100%;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.action-bar {
  display: flex;
  justify-content: space-around;
  padding: 15px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 10px 20px;
  border-radius: 12px;
  transition: all 0.2s;
}

.action-btn:active {
  transform: scale(0.95);
  background: rgba(102, 126, 234, 0.1);
}

.btn-icon {
  font-size: 24px;
  margin-bottom: 5px;
}

.btn-text {
  font-size: 12px;
  color: #333;
}

.btn-clear {
  background: rgba(244, 67, 54, 0.1);
}

.btn-undo {
  background: rgba(255, 152, 0, 0.1);
}

.btn-save {
  background: rgba(76, 175, 80, 0.1);
}
</style>
