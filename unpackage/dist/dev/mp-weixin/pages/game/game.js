"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {};
  },
  methods: {
    goToGame(gameType) {
      const routes = {
        "shengbei": "/pages/game/shengbei",
        "tarot": "/pages/game/tarot",
        "compatibility": "/pages/game/compatibility",
        "match": "/pages/game/match",
        "draw": "/pages/game/draw"
      };
      if (routes[gameType]) {
        common_vendor.index.navigateTo({
          url: routes[gameType]
        });
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o(($event) => $options.goToGame("shengbei")),
    b: common_vendor.o(($event) => $options.goToGame("tarot")),
    c: common_vendor.o(($event) => $options.goToGame("compatibility")),
    d: common_vendor.o(($event) => $options.goToGame("match"))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-84820fe1"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/game/game.js.map
