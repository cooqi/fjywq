"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      tarotCards: [],
      dailyQuestion: "",
      // 每日问题
      isLoading: true,
      drawnCards: [],
      fanCards: Array(12).fill(null)
    };
  },
  computed: {
    currentDate() {
      const now = /* @__PURE__ */ new Date();
      return `${now.getMonth() + 1}月${now.getDate()}日`;
    }
  },
  onLoad() {
    this.loadTarotCards();
  },
  methods: {
    goBack() {
      common_vendor.index.navigateBack();
    },
    showHistory() {
      common_vendor.index.showToast({
        title: "解读记录功能开发中",
        icon: "none"
      });
    },
    async loadTarotCards() {
      try {
        common_vendor.index.showLoading({ title: "加载中..." });
        const res = await common_vendor.tr.callFunction({
          name: "tarot-config",
          data: {}
        });
        if (res.result && res.result.code === 0) {
          const data = res.result.data;
          this.tarotCards = data.cards || [];
          this.dailyQuestion = data.dailyQuestion || "";
        } else {
          throw new Error(res.result.msg || "获取塔罗牌数据失败");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/game/tarot.vue:121", "加载塔罗牌数据异常:", error);
        common_vendor.index.showToast({
          title: error.message || "加载失败，请重试",
          icon: "none",
          duration: 3e3
        });
        setTimeout(() => {
          common_vendor.index.navigateBack();
        }, 2e3);
      } finally {
        this.isLoading = false;
        common_vendor.index.hideLoading();
      }
    },
    getFanCardStyle(index) {
      const totalCards = this.fanCards.length;
      const angle = (index - (totalCards - 1) / 2) * 8;
      const translateY = Math.abs(angle) * 2;
      return {
        transform: `rotate(${angle}deg) translateY(${translateY}px)`,
        zIndex: totalCards - Math.abs(index - (totalCards - 1) / 2)
      };
    },
    drawDailyCard(index) {
      if (this.drawnCards.length > 0)
        return;
      const randomIndex = Math.floor(Math.random() * this.tarotCards.length);
      const card = { ...this.tarotCards[randomIndex] };
      card.isReversed = Math.random() > 0.5;
      this.drawnCards = [card];
      common_vendor.index.showToast({
        title: `抽到了：${card.name}${card.isReversed ? "（逆位）" : "（正位）"}`,
        icon: "none",
        duration: 2e3
      });
    },
    resetGame() {
      this.drawnCards = [];
    },
    previewCardImage() {
      const card = this.drawnCards[0];
      if (!card)
        return;
      let imageUrl = "";
      if (card.isReversed) {
        imageUrl = card.reversed_image || card.image;
      } else {
        imageUrl = card.image;
      }
      if (!imageUrl) {
        common_vendor.index.showToast({
          title: "暂无高清图片",
          icon: "none"
        });
        return;
      }
      common_vendor.index.previewImage({
        urls: [imageUrl],
        current: imageUrl,
        longPressActions: {
          itemList: ["保存图片"],
          success: function(data) {
            common_vendor.index.__f__("log", "at pages/game/tarot.vue:196", "选择了第" + (data.tapIndex + 1) + "个按钮");
          },
          fail: function(err) {
            common_vendor.index.__f__("log", "at pages/game/tarot.vue:199", err.errMsg);
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.drawnCards.length
  }, !$data.drawnCards.length ? {
    b: common_vendor.t($data.dailyQuestion || "随机抽取一张开启今日塔罗..."),
    c: common_vendor.f($data.fanCards, (card, index, i0) => {
      return {
        a: index,
        b: common_vendor.s($options.getFanCardStyle(index)),
        c: common_vendor.o(($event) => $options.drawDailyCard(index), index)
      };
    })
  } : {}, {
    d: $data.drawnCards.length
  }, $data.drawnCards.length ? common_vendor.e({
    e: common_vendor.t($options.currentDate),
    f: !$data.drawnCards[0].isReversed
  }, !$data.drawnCards[0].isReversed ? common_vendor.e({
    g: $data.drawnCards[0].image
  }, $data.drawnCards[0].image ? {
    h: $data.drawnCards[0].image
  } : {
    i: common_vendor.t($data.drawnCards[0].emoji)
  }) : common_vendor.e({
    j: $data.drawnCards[0].reversed_image || $data.drawnCards[0].image
  }, $data.drawnCards[0].reversed_image || $data.drawnCards[0].image ? {
    k: $data.drawnCards[0].reversed_image || $data.drawnCards[0].image
  } : {
    l: common_vendor.t($data.drawnCards[0].reversed_emoji || $data.drawnCards[0].emoji)
  }), {
    m: common_vendor.o((...args) => $options.previewCardImage && $options.previewCardImage(...args)),
    n: common_vendor.t($data.drawnCards[0].name),
    o: common_vendor.t($data.drawnCards[0].isReversed ? "逆位" : "正位"),
    p: $data.drawnCards[0].isReversed ? 1 : "",
    q: common_vendor.t($data.drawnCards[0].isReversed ? $data.drawnCards[0].meaning_reversed || $data.drawnCards[0].meaning : $data.drawnCards[0].meaning_upright || $data.drawnCards[0].meaning),
    r: common_vendor.t($data.drawnCards[0].isReversed ? $data.drawnCards[0].interpretation_reversed || $data.drawnCards[0].interpretation_upright || $data.drawnCards[0].interpretation : $data.drawnCards[0].interpretation_upright || $data.drawnCards[0].interpretation),
    s: common_vendor.o((...args) => $options.resetGame && $options.resetGame(...args))
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-35557016"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/game/tarot.js.map
