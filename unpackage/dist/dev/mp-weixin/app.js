"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/rili/rili.js";
  "./pages/notice/notice.js";
  "./pages/myTodo/myTodo.js";
  "./pages/meet/meet.js";
  "./pages/edit/rili.js";
  "./pages/edit/notice.js";
  "./pages/game/game.js";
  "./pages/game/shengbei.js";
  "./pages/game/tarot.js";
  "./pages/game/compatibility.js";
  "./pages/game/match.js";
  "./pages/game/draw.js";
}
const _sfc_main = {
  onLaunch: async function() {
    common_vendor.index.__f__("log", "at App.vue:5", "App Launch");
    common_vendor.tr.initSecureNetworkByWeixin();
    this.initScreenshotWatermark();
  },
  mounted() {
  },
  onShow: function() {
    common_vendor.index.__f__("log", "at App.vue:21", "App Show");
  },
  onHide: function() {
    common_vendor.index.__f__("log", "at App.vue:24", "App Hide");
  },
  methods: {
    // 初始化截图水印功能
    initScreenshotWatermark() {
      common_vendor.wx$1.onUserCaptureScreen(() => {
        common_vendor.index.__f__("log", "at App.vue:32", "用户截屏了");
        this.showScreenshotWatermark();
      });
    },
    // 显示截图水印提示
    showScreenshotWatermark() {
      common_vendor.index.showToast({
        title: "青宇99",
        icon: "none",
        duration: 2e3,
        image: ""
      });
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        if (currentPage.$vm && currentPage.$vm.showTemporaryWatermark) {
          currentPage.$vm.showTemporaryWatermark();
        }
      }
    }
  }
};
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
//# sourceMappingURL=../.sourcemap/mp-weixin/app.js.map
