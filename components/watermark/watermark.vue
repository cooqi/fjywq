<template>
  <view class="watermark-container" v-if="showWatermark">
    <view 
      v-for="(item, index) in watermarkList" 
      :key="index"
      class="watermark-item"
      :style="{
        left: item.left + 'px',
        top: item.top + 'px'
      }"
    >
      {{ watermarkText }}
    </view>
  </view>
</template>

<script>
export default {
  name: 'Watermark',
  props: {
    showWatermark: {
      type: Boolean,
      default: true
    },
    watermarkText: {
      type: String,
      default: '青宇99'
    }
  },
  data() {
    return {
      watermarkList: []
    }
  },
  mounted() {
    this.generateWatermarks()
  },
  methods: {
    generateWatermarks() {
      // 获取系统信息
      uni.getSystemInfo({
        success: (res) => {
          const screenWidth = res.windowWidth
          const screenHeight = res.windowHeight
          
          const watermarks = []
          const spacing = 150 // 水印间距
          const rows = Math.ceil(screenHeight / spacing) + 2
          const cols = Math.ceil(screenWidth / spacing) + 2
          
          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
              watermarks.push({
                left: j * spacing,
                top: i * spacing
              })
            }
          }
          
          this.watermarkList = watermarks
        }
      })
    }
  }
}
</script>

<style scoped>
.watermark-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.watermark-item {
  position: absolute;
  font-size: 28rpx;
  color: rgba(0, 0, 0, 0.06);
  transform: rotate(-30deg);
  white-space: nowrap;
  font-weight: bold;
  user-select: none;
}
</style>
