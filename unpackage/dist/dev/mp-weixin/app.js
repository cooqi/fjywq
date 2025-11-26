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
}
const _sfc_main = {
  onLaunch: async function() {
    common_vendor.index.__f__("log", "at App.vue:5", "App Launch");
    common_vendor.tr.initSecureNetworkByWeixin();
  },
  mounted() {
  },
  onShow: function() {
    common_vendor.index.__f__("log", "at App.vue:18", "App Show");
  },
  onHide: function() {
    common_vendor.index.__f__("log", "at App.vue:21", "App Hide");
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
