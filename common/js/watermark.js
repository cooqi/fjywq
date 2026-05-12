/**
 * 全局截图水印混入
 * 用户截图时显示临时水印，截完图后自动消失
 */

export default {
  data() {
    return {
      showScreenshotWatermark: false,
      watermarkText: '青宇99'
    }
  },
  
  onReady() {
    // #ifdef MP-WEIXIN
    // 监听截图事件
    wx.onUserCaptureScreen(() => {
      this.showTemporaryWatermark()
    })
    // #endif
  },
  
  methods: {
    // 显示临时水印（截图时调用）
    showTemporaryWatermark() {
      this.showScreenshotWatermark = true
      
      // 2秒后自动隐藏
      setTimeout(() => {
        this.showScreenshotWatermark = false
      }, 2000)
    }
  }
}
