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
      // 配对图片的本地路径（至少需要30张）
      imageUrls: [
        "http://47.115.211.166:8032/img/game/qy1.jpg",
        "http://47.115.211.166:8032/img/game/qy2.jpg",
        "http://47.115.211.166:8032/img/game/qy3.jpg",
        "http://47.115.211.166:8032/img/game/qy4.png",
        "http://47.115.211.166:8032/img/game/qy5.jpg",
        "http://47.115.211.166:8032/img/game/qy6.jpg",
        "http://47.115.211.166:8032/img/game/qy7.jpg",
        "http://47.115.211.166:8032/img/game/qy8.jpg",
        "http://47.115.211.166:8032/img/game/qy9.png",
        "http://47.115.211.166:8032/img/game/qy10.jpg",
        "http://47.115.211.166:8032/img/game/qy11.jpg",
        "http://47.115.211.166:8032/img/game/qy12.jpg",
        "http://47.115.211.166:8032/img/game/qy13.jpg",
        "http://47.115.211.166:8032/img/game/qy14.jpg",
        "http://47.115.211.166:8032/img/game/qy15.jpg",
        "http://47.115.211.166:8032/img/game/qy16.jpg",
        "http://47.115.211.166:8032/img/game/qy17.jpg",
        "http://47.115.211.166:8032/img/game/qy18.jpg",
        "http://47.115.211.166:8032/img/game/qy19.jpg",
        "http://47.115.211.166:8032/img/game/qy20.jpg",
        "http://47.115.211.166:8032/img/game/qy21.jpg",
        "http://47.115.211.166:8032/img/game/qy22.jpg",
        "http://47.115.211.166:8032/img/game/qy23.jpg",
        "http://47.115.211.166:8032/img/game/qy24.jpg",
        "http://47.115.211.166:8032/img/game/qy25.jpg",
        "http://47.115.211.166:8032/img/game/qy26.jpg",
        "http://47.115.211.166:8032/img/game/qy27.jpg",
        "http://47.115.211.166:8032/img/game/qy28.jpg",
        "http://47.115.211.166:8032/img/game/qy29.jpg",
        "http://47.115.211.166:8032/img/game/qy30.jpg"
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
