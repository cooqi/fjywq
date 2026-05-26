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
        hard: { pairs: 15, grid: "5x6", columns: 5 },
        ultimate: { pairs: 21, grid: "6x7", columns: 6 },
        extreme: { pairs: 30, grid: "6x10", columns: 6 }
      },
      // 配对图片的网络URL（至少需要30张）
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
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy15.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy16.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy17.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy18.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy19.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy20.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy21.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy22.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy23.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy24.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy25.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy26.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy27.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy28.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy29.jpg",
        "https://env-00jy66xyyok3.normal.cloudstatic.cn/游戏/qy30.jpg"
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
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要返回菜单吗？当前进度将丢失",
        success: (res) => {
          if (res.confirm) {
            this.clearTimer();
            this.showWinModal = false;
            this.gameStarted = false;
            this.selectedDifficulty = "";
          }
        }
      });
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
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要重新开始吗？当前进度将丢失",
        success: (res) => {
          if (res.confirm) {
            this.clearTimer();
            this.showWinModal = false;
            this.initGame();
          }
        }
      });
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
        hard: "困难",
        ultimate: "地域",
        extreme: "极限"
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
    c: common_vendor.o(($event) => $options.selectDifficulty("easy"), "ee"),
    d: $data.selectedDifficulty === "medium" ? 1 : "",
    e: common_vendor.o(($event) => $options.selectDifficulty("medium"), "10"),
    f: $data.selectedDifficulty === "hard" ? 1 : "",
    g: common_vendor.o(($event) => $options.selectDifficulty("hard"), "2f"),
    h: $data.selectedDifficulty === "ultimate" ? 1 : "",
    i: common_vendor.o(($event) => $options.selectDifficulty("ultimate"), "e0"),
    j: $data.selectedDifficulty === "extreme" ? 1 : "",
    k: common_vendor.o(($event) => $options.selectDifficulty("extreme"), "70"),
    l: common_vendor.o((...args) => $options.startGame && $options.startGame(...args), "e7"),
    m: !$data.selectedDifficulty
  } : common_vendor.e({
    n: common_vendor.t($data.moves),
    o: common_vendor.t($options.formatTime($data.time)),
    p: common_vendor.t($data.matchedPairs),
    q: common_vendor.t($data.totalPairs),
    r: common_vendor.f($data.cards, (card, index, i0) => {
      return {
        a: card.image,
        b: index,
        c: card.flipped ? 1 : "",
        d: card.matched ? 1 : "",
        e: common_vendor.o(($event) => $options.flipCard(index), index)
      };
    }),
    s: common_vendor.n("grid-" + $data.currentGrid),
    t: common_vendor.o((...args) => $options.backToMenu && $options.backToMenu(...args), "9d"),
    v: common_vendor.o((...args) => $options.restartGame && $options.restartGame(...args), "83"),
    w: $data.showWinModal
  }, $data.showWinModal ? {
    x: common_vendor.t($options.getDifficultyName()),
    y: common_vendor.t($options.formatTime($data.time)),
    z: common_vendor.t($data.moves),
    A: common_vendor.t($options.getRating()),
    B: common_vendor.o((...args) => $options.backToMenu && $options.backToMenu(...args), "ee")
  } : {}));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-b398df43"]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/game/match.js.map
