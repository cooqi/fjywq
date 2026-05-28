"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      isThrowing: false,
      currentCupImage: "http://47.115.211.166:8032/img/game/shengbei4.png",
      resultText: "准备掷杯",
      resultClass: "",
      holyTipImage: "http://47.115.211.166:8032/img/game/shengbei1.png",
      stats: {
        smile: 0,
        holy: 0,
        cry: 0,
        silly: 0
      },
      // 统一的圣杯结果配置数据
      cupResults: [
        {
          type: "smile",
          text: "笑杯",
          message: "态度不明，可重新掷",
          image: "http://47.115.211.166:8032/img/game/shengbei4.png",
          class: "result-smile",
          tipClass: "tip-smile",
          emoji: "😄"
        },
        {
          type: "holy",
          text: "圣杯",
          message: "OK，行事顺利",
          images: [
            "http://47.115.211.166:8032/img/game/shengbei1.png",
            "http://47.115.211.166:8032/img/game/shengbei13.png"
          ],
          class: "result-holy",
          tipClass: "tip-holy",
          emoji: "🙏"
        },
        {
          type: "cry",
          text: "哭杯",
          message: "No No，行事不顺",
          image: "http://47.115.211.166:8032/img/game/shengbei12.png",
          class: "result-cry",
          tipClass: "tip-cry",
          emoji: "😢"
        },
        {
          type: "silly",
          text: "傻杯",
          message: "WTF，重开吧",
          image: "http://47.115.211.166:8032/img/game/shengbei5.png",
          class: "result-silly",
          tipClass: "tip-silly",
          emoji: "🤪"
        }
      ]
    };
  },
  onShareAppMessage: function() {
    return {
      title: "宇青青宇全肯定",
      path: "/pages/game/game"
    };
  },
  onShareTimeline: function() {
    return {
      title: "宇青青宇全肯定"
    };
  },
  methods: {
    throwCups() {
      if (this.isThrowing)
        return;
      this.isThrowing = true;
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * this.cupResults.length);
        const result = this.cupResults[randomIndex];
        if (result.type === "holy") {
          const randomHolyImage = Math.floor(Math.random() * result.images.length);
          this.currentCupImage = result.images[randomHolyImage];
          const randomTipImage = Math.floor(Math.random() * result.images.length);
          this.holyTipImage = result.images[randomTipImage];
        } else {
          this.currentCupImage = result.image;
        }
        this.resultText = `${result.text} - ${result.message}`;
        this.resultClass = result.class;
        this.stats[result.type]++;
        this.isThrowing = false;
      }, 500);
    },
    resetGame() {
      this.stats = { smile: 0, holy: 0, cry: 0, silly: 0 };
      this.currentCupImage = "http://47.115.211.166:8032/img/game/shengbei4.png";
      this.resultText = "准备掷杯";
      this.resultClass = "";
      this.holyTipImage = "http://47.115.211.166:8032/img/game/shengbei1.png";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: $data.currentCupImage,
    b: $data.isThrowing ? 1 : "",
    c: common_vendor.t($data.resultText),
    d: common_vendor.n($data.resultClass),
    e: common_vendor.o((...args) => $options.throwCups && $options.throwCups(...args), "8f"),
    f: $data.isThrowing,
    g: common_vendor.o((...args) => $options.resetGame && $options.resetGame(...args), "db"),
    h: common_vendor.t($data.stats.smile),
    i: common_vendor.t($data.stats.holy),
    j: common_vendor.t($data.stats.cry),
    k: common_vendor.t($data.stats.silly),
    l: common_vendor.f($data.cupResults, (item, k0, i0) => {
      return {
        a: item.type === "holy" ? $data.holyTipImage : item.image,
        b: common_vendor.t(item.emoji),
        c: common_vendor.t(item.text),
        d: common_vendor.t(item.message),
        e: item.type,
        f: common_vendor.n(item.tipClass)
      };
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-963c17c7"]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/game/shengbei.js.map
