"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      gameStarted: false,
      selectedDifficulty: "",
      currentGrid: "4x4",
      cards: [],
      flippedCards: [],
      matchedPairs: 0,
      totalPairs: 7,
      moves: 0,
      time: 0,
      timer: null,
      isLocked: false,
      showWinModal: false,
      // 难度配置
      difficultyConfig: {
        easy: { pairs: 7, grid: "4x4", columns: 4 },
        medium: { pairs: 10, grid: "4x5", columns: 4 },
        hard: { pairs: 15, grid: "5x6", columns: 5 }
      },
      // 配对图片的网络URL（至少需要15张）
      imageUrls: [
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy1.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy2.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy3.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy4.png",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy5.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy6.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy7.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy8.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy9.png",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy10.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy11.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy12.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy13.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy14.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy15.jpg"
      ]
    };
  },
  onLoad() {
  },
  onUnload() {
    this.clearTimer();
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
    // 选择难度
    selectDifficulty(difficulty) {
      this.selectedDifficulty = difficulty;
    },
    // 开始游戏
    startGame() {
      if (!this.selectedDifficulty)
        return;
      const config = this.difficultyConfig[this.selectedDifficulty];
      this.totalPairs = config.pairs;
      this.currentGrid = config.grid;
      this.gameStarted = true;
      this.initGame();
    },
    // 返回菜单
    backToMenu() {
      this.clearTimer();
      this.showWinModal = false;
      this.gameStarted = false;
      this.selectedDifficulty = "";
    },
    initGame() {
      const selectedImages = this.imageUrls.slice(0, this.totalPairs);
      const cardPairs = [...selectedImages, ...selectedImages];
      this.cards = this.shuffle(cardPairs).map((image) => ({
        image,
        flipped: false,
        matched: false
      }));
      this.flippedCards = [];
      this.matchedPairs = 0;
      this.moves = 0;
      this.time = 0;
      this.isLocked = false;
      this.showWinModal = false;
      this.startTimer();
    },
    shuffle(array) {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    },
    flipCard(index) {
      if (this.isLocked)
        return;
      if (this.cards[index].flipped || this.cards[index].matched)
        return;
      this.cards[index].flipped = true;
      this.flippedCards.push(index);
      if (this.flippedCards.length === 2) {
        this.moves++;
        this.checkMatch();
      }
    },
    checkMatch() {
      this.isLocked = true;
      const [firstIndex, secondIndex] = this.flippedCards;
      const firstCard = this.cards[firstIndex];
      const secondCard = this.cards[secondIndex];
      if (firstCard.image === secondCard.image) {
        setTimeout(() => {
          firstCard.matched = true;
          secondCard.matched = true;
          this.matchedPairs++;
          this.flippedCards = [];
          this.isLocked = false;
          if (this.matchedPairs === this.totalPairs) {
            this.gameWin();
          }
        }, 500);
      } else {
        setTimeout(() => {
          firstCard.flipped = false;
          secondCard.flipped = false;
          this.flippedCards = [];
          this.isLocked = false;
        }, 1e3);
      }
    },
    gameWin() {
      this.clearTimer();
      setTimeout(() => {
        this.showWinModal = true;
      }, 500);
    },
    restartGame() {
      this.clearTimer();
      this.showWinModal = false;
      this.initGame();
    },
    startTimer() {
      this.clearTimer();
      this.timer = setInterval(() => {
        this.time++;
      }, 1e3);
    },
    clearTimer() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    },
    getRating() {
      const perfectMoves = this.totalPairs * 2;
      if (this.moves <= perfectMoves + 4)
        return "⭐⭐⭐";
      if (this.moves <= perfectMoves + 8)
        return "⭐⭐";
      return "⭐";
    },
    getDifficultyName() {
      const names = {
        easy: "简单",
        medium: "中等",
        hard: "困难"
      };
      return names[this.selectedDifficulty] || "";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.gameStarted
  }, !$data.gameStarted ? {
    b: $data.selectedDifficulty === "easy" ? 1 : "",
    c: common_vendor.o(($event) => $options.selectDifficulty("easy")),
    d: $data.selectedDifficulty === "medium" ? 1 : "",
    e: common_vendor.o(($event) => $options.selectDifficulty("medium")),
    f: $data.selectedDifficulty === "hard" ? 1 : "",
    g: common_vendor.o(($event) => $options.selectDifficulty("hard")),
    h: common_vendor.o((...args) => $options.startGame && $options.startGame(...args)),
    i: !$data.selectedDifficulty
  } : common_vendor.e({
    j: common_vendor.t($data.moves),
    k: common_vendor.t($options.formatTime($data.time)),
    l: common_vendor.t($data.matchedPairs),
    m: common_vendor.t($data.totalPairs),
    n: common_vendor.f($data.cards, (card, index, i0) => {
      return {
        a: card.image,
        b: index,
        c: card.flipped ? 1 : "",
        d: card.matched ? 1 : "",
        e: common_vendor.o(($event) => $options.flipCard(index), index)
      };
    }),
    o: common_vendor.n("grid-" + $data.currentGrid),
    p: common_vendor.o((...args) => $options.backToMenu && $options.backToMenu(...args)),
    q: common_vendor.o((...args) => $options.restartGame && $options.restartGame(...args)),
    r: $data.showWinModal
  }, $data.showWinModal ? {
    s: common_vendor.t($options.getDifficultyName()),
    t: common_vendor.t($options.formatTime($data.time)),
    v: common_vendor.t($data.moves),
    w: common_vendor.t($options.getRating()),
    x: common_vendor.o((...args) => $options.backToMenu && $options.backToMenu(...args))
  } : {}));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-b398df43"]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/game/match.js.map
