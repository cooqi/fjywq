<script>
  import checkUpdate from '@/uni_modules/uni-upgrade-center-app/utils/check-update';
  export default {
    onLaunch: async function() {
      console.log('App Launch')
		// #ifdef MP-WEIXIN
		uniCloud.initSecureNetworkByWeixin()
		// #endif
      checkUpdate() //更新升级
      
      // 初始化截图水印功能
      this.initScreenshotWatermark()
    },
    mounted() {
      // #ifdef H5
      //const VConsole = require('@/common/js/vconsole.min.js')
      //new VConsole()
      // #endif
    },
    onShow: function() {
      console.log('App Show')
    },
    onHide: function() {
      console.log('App Hide')
    },
    methods: {
      // 初始化截图水印功能
      initScreenshotWatermark() {
        // #ifdef MP-WEIXIN
        // 微信小程序监听用户截屏事件
        wx.onUserCaptureScreen(() => {
          console.log('用户截屏了')
          this.showScreenshotWatermark()
        })
        // #endif
      },
      
      // 显示截图水印提示
      showScreenshotWatermark() {
        // #ifdef MP-WEIXIN
        uni.showToast({
          title: '青宇99',
          icon: 'none',
          duration: 2000,
          image: ''
        })
        
        // 在页面底部显示水印文字
        const pages = getCurrentPages()
        if (pages.length > 0) {
          const currentPage = pages[pages.length - 1]
          // 触发页面的水印显示方法
          if (currentPage.$vm && currentPage.$vm.showTemporaryWatermark) {
            currentPage.$vm.showTemporaryWatermark()
          }
        }
        // #endif
      }
    }
  }
</script>

<style>
  /*每个页面公共css */
  /* #ifndef APP-NVUE */
  view {
    box-sizing: border-box;
  }

  @font-face {
    font-family: "iconfont";
    src: url('https://at.alicdn.com/t/font_2354462_s00xh8caffp.ttf');
  }

  .ico {
    font-family: iconfont;
  }

  /* 截图水印全局样式 */
  .screenshot-watermark {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    pointer-events: none;
    background: rgba(255, 255, 255, 0.1);
  }

  .watermark-text-large {
    font-size: 80px;
    font-weight: bold;
    color: rgba(0, 0, 0, 0.15);
    transform: rotate(-45deg);
    user-select: none;
  }

  /* #endif */
</style>
