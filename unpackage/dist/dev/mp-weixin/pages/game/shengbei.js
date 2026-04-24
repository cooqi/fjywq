"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      isThrowing: false,
      currentCupImage: "https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei4.png",
      resultText: "准备掷杯",
      resultClass: "",
      holyTipImage: "https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei1.png",
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
          image: "https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei4.png",
          class: "result-smile",
          tipClass: "tip-smile",
          emoji: "😄"
        },
        {
          type: "holy",
          text: "圣杯",
          message: "OK，行事顺利",
          images: [
            "https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei1.png",
            "https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei13.png"
          ],
          class: "result-holy",
          tipClass: "tip-holy",
          emoji: "🙏"
        },
        {
          type: "cry",
          text: "哭杯",
          message: "No No，行事不顺",
          image: "https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei12.png",
          class: "result-cry",
          tipClass: "tip-cry",
          emoji: "😢"
        },
        {
          type: "silly",
          text: "傻杯",
          message: "WTF，重开吧",
          image: "https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei5.png",
          class: "result-silly",
          tipClass: "tip-silly",
          emoji: "🤪"
        }
      ]
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
      this.currentCupImage = "https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei_smile.png";
      this.resultText = "准备掷杯";
      this.resultClass = "";
      this.holyTipImage = "https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/shengbei_holy1.png";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: $data.currentCupImage,
    b: $data.isThrowing ? 1 : "",
    c: common_vendor.t($data.resultText),
    d: common_vendor.n($data.resultClass),
    e: common_vendor.o((...args) => $options.throwCups && $options.throwCups(...args)),
    f: $data.isThrowing,
    g: common_vendor.o((...args) => $options.resetGame && $options.resetGame(...args)),
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
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/game/shengbei.js.map
