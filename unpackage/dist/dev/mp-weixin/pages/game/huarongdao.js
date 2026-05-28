"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      gameStarted: false,
      selectedLevel: "",
      boardWidth: 4,
      // 4列
      boardHeight: 5,
      // 5行
      cellSize: 70,
      // 每个格子的大小
      blocks: [],
      selectedBlock: -1,
      // 当前选中的棋子索引
      moves: 0,
      time: 0,
      timer: null,
      showWinModal: false,
      // 基础关卡配置（用于随机打乱的起点）
      baseLevels: {
        easy: [
          { type: "caocao", x: 1, y: 0, width: 2, height: 2 },
          { type: "general_h", x: 0, y: 0, width: 1, height: 2 },
          { type: "general_h", x: 3, y: 0, width: 1, height: 2 },
          { type: "soldier", x: 0, y: 2, width: 1, height: 1 },
          { type: "soldier", x: 3, y: 2, width: 1, height: 1 },
          { type: "soldier", x: 1, y: 2, width: 1, height: 1 },
          { type: "soldier", x: 2, y: 2, width: 1, height: 1 },
          { type: "soldier", x: 1, y: 3, width: 1, height: 1 },
          { type: "soldier", x: 2, y: 3, width: 1, height: 1 }
        ],
        medium: [
          { type: "caocao", x: 1, y: 0, width: 2, height: 2 },
          { type: "general_v", x: 0, y: 0, width: 1, height: 2 },
          { type: "general_v", x: 3, y: 0, width: 1, height: 2 },
          { type: "general_h", x: 1, y: 2, width: 2, height: 1 },
          { type: "soldier", x: 0, y: 2, width: 1, height: 1 },
          { type: "soldier", x: 3, y: 2, width: 1, height: 1 },
          { type: "soldier", x: 0, y: 3, width: 1, height: 1 },
          { type: "soldier", x: 3, y: 3, width: 1, height: 1 },
          { type: "soldier", x: 1, y: 3, width: 1, height: 1 },
          { type: "soldier", x: 2, y: 3, width: 1, height: 1 }
        ],
        hard: [
          { type: "caocao", x: 1, y: 0, width: 2, height: 2 },
          { type: "general_v", x: 0, y: 0, width: 1, height: 2 },
          { type: "general_v", x: 3, y: 0, width: 1, height: 2 },
          { type: "general_v", x: 0, y: 2, width: 1, height: 2 },
          { type: "general_v", x: 3, y: 2, width: 1, height: 2 },
          { type: "general_h", x: 1, y: 2, width: 2, height: 1 },
          { type: "soldier", x: 1, y: 3, width: 1, height: 1 },
          { type: "soldier", x: 2, y: 3, width: 1, height: 1 },
          { type: "soldier", x: 0, y: 4, width: 1, height: 1 },
          { type: "soldier", x: 3, y: 4, width: 1, height: 1 }
        ]
      }
    };
  },
  onLoad() {
  },
  onUnload() {
    this.clearTimer();
  },
  methods: {
    // 选择难度
    selectLevel(level) {
      this.selectedLevel = level;
    },
    // 开始游戏
    startGame() {
      if (!this.selectedLevel)
        return;
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
            this.selectedLevel = "";
          }
        }
      });
    },
    initGame() {
      this.blocks = this.generateRandomLayout(this.selectedLevel);
      this.moves = 0;
      this.time = 0;
      this.selectedBlock = -1;
      this.showWinModal = false;
      this.startTimer();
    },
    // 生成随机布局（通过随机移动打乱）
    generateRandomLayout(level) {
      let blocks = JSON.parse(JSON.stringify(this.baseLevels[level]));
      const shuffleSteps = {
        easy: 100,
        medium: 300,
        hard: 600
        // 华容道状态空间大，600步才能保证充分打乱
      };
      const steps = shuffleSteps[level] || 300;
      let lastMovedIndex = -1;
      for (let i = 0; i < steps; i++) {
        let randomIndex = Math.floor(Math.random() * blocks.length);
        if (blocks.length > 1 && randomIndex === lastMovedIndex) {
          randomIndex = (randomIndex + 1) % blocks.length;
        }
        const block = blocks[randomIndex];
        const directions = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 }
        ];
        directions.sort(() => Math.random() - 0.5);
        let moved = false;
        for (const dir of directions) {
          if (this.canMoveForShuffle(blocks, block, dir.dx, dir.dy)) {
            block.x += dir.dx;
            block.y += dir.dy;
            lastMovedIndex = randomIndex;
            moved = true;
            break;
          }
        }
        if (!moved) {
          lastMovedIndex = -1;
        }
      }
      const caocao = blocks.find((b) => b.type === "caocao");
      if (caocao && caocao.y === 3 && caocao.x === 1) {
        if (this.canMoveForShuffle(blocks, caocao, 0, -1)) {
          caocao.y -= 1;
        }
      }
      return blocks;
    },
    // 打乱时检查是否可以移动
    canMoveForShuffle(blocks, block, dx, dy) {
      const newX = block.x + dx;
      const newY = block.y + dy;
      if (newX < 0 || newX + block.width > this.boardWidth)
        return false;
      if (newY < 0 || newY + block.height > this.boardHeight)
        return false;
      for (const other of blocks) {
        if (other === block)
          continue;
        if (this.isOverlap(
          newX,
          newY,
          block.width,
          block.height,
          other.x,
          other.y,
          other.width,
          other.height
        )) {
          return false;
        }
      }
      return true;
    },
    // 选择棋子
    selectBlock(index) {
      if (this.selectedBlock === index) {
        this.selectedBlock = -1;
        return;
      }
      this.selectedBlock = index;
    },
    // 检查指定方向是否可以移动
    canMoveDirection(direction) {
      if (this.selectedBlock === -1)
        return false;
      const block = this.blocks[this.selectedBlock];
      const directions = {
        up: { dx: 0, dy: -1 },
        down: { dx: 0, dy: 1 },
        left: { dx: -1, dy: 0 },
        right: { dx: 1, dy: 0 }
      };
      const dir = directions[direction];
      return this.canMove(block, dir.dx, dir.dy);
    },
    // 移动选中的棋子
    moveSelectedBlock(direction) {
      if (this.selectedBlock === -1)
        return;
      const block = this.blocks[this.selectedBlock];
      const directions = {
        up: { dx: 0, dy: -1 },
        down: { dx: 0, dy: 1 },
        left: { dx: -1, dy: 0 },
        right: { dx: 1, dy: 0 }
      };
      const dir = directions[direction];
      if (this.canMove(block, dir.dx, dir.dy)) {
        block.x += dir.dx;
        block.y += dir.dy;
        this.moves++;
        this.checkWin();
      }
    },
    // 检查是否可以移动
    canMove(block, dx, dy) {
      const newX = block.x + dx;
      const newY = block.y + dy;
      if (newX < 0 || newX + block.width > this.boardWidth)
        return false;
      if (newY < 0 || newY + block.height > this.boardHeight)
        return false;
      for (const other of this.blocks) {
        if (other === block)
          continue;
        if (this.isOverlap(
          newX,
          newY,
          block.width,
          block.height,
          other.x,
          other.y,
          other.width,
          other.height
        )) {
          return false;
        }
      }
      return true;
    },
    // 检查两个矩形是否重叠
    isOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
      return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
    },
    // 检查是否获胜（宇青到达底部出口）
    checkWin() {
      const caocao = this.blocks.find((b) => b.type === "caocao");
      if (caocao && caocao.y === 3 && caocao.x === 1) {
        this.gameWin();
      }
    },
    gameWin() {
      this.clearTimer();
      setTimeout(() => {
        this.showWinModal = true;
      }, 300);
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
    getBlockText(type) {
      const texts = {
        caocao: "宇青",
        general_v: "杯杯儿",
        general_h: "闺女",
        soldier: "黑子"
      };
      return texts[type] || "";
    },
    getLevelName() {
      const names = {
        easy: "初级",
        medium: "中级",
        hard: "高级"
      };
      return names[this.selectedLevel] || "";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.gameStarted
  }, !$data.gameStarted ? {
    b: $data.selectedLevel === "easy" ? 1 : "",
    c: common_vendor.o(($event) => $options.selectLevel("easy"), "4c"),
    d: $data.selectedLevel === "medium" ? 1 : "",
    e: common_vendor.o(($event) => $options.selectLevel("medium"), "47"),
    f: $data.selectedLevel === "hard" ? 1 : "",
    g: common_vendor.o(($event) => $options.selectLevel("hard"), "ef"),
    h: common_vendor.o((...args) => $options.startGame && $options.startGame(...args), "96"),
    i: !$data.selectedLevel
  } : common_vendor.e({
    j: common_vendor.t($data.moves),
    k: common_vendor.t($options.formatTime($data.time)),
    l: common_vendor.f($data.boardHeight, (row, k0, i0) => {
      return {
        a: common_vendor.f($data.boardWidth, (col, k1, i1) => {
          return {
            a: "cell-" + col
          };
        }),
        b: "row-" + row
      };
    }),
    m: common_vendor.f($data.blocks, (block, index, i0) => {
      return {
        a: common_vendor.t($options.getBlockText(block.type)),
        b: index,
        c: common_vendor.n("block-" + block.type),
        d: common_vendor.n({
          "block-selected": $data.selectedBlock === index
        }),
        e: block.x * $data.cellSize + "px",
        f: block.y * $data.cellSize + "px",
        g: block.width * $data.cellSize + "px",
        h: block.height * $data.cellSize + "px",
        i: common_vendor.o(($event) => $options.selectBlock(index), index)
      };
    }),
    n: $data.selectedBlock !== -1
  }, $data.selectedBlock !== -1 ? common_vendor.e({
    o: $options.canMoveDirection("up")
  }, $options.canMoveDirection("up") ? {
    p: common_vendor.o(($event) => $options.moveSelectedBlock("up"), "79")
  } : {}, {
    q: $options.canMoveDirection("down")
  }, $options.canMoveDirection("down") ? {
    r: common_vendor.o(($event) => $options.moveSelectedBlock("down"), "f6")
  } : {}, {
    s: $options.canMoveDirection("left")
  }, $options.canMoveDirection("left") ? {
    t: common_vendor.o(($event) => $options.moveSelectedBlock("left"), "75")
  } : {}, {
    v: $options.canMoveDirection("right")
  }, $options.canMoveDirection("right") ? {
    w: common_vendor.o(($event) => $options.moveSelectedBlock("right"), "cc")
  } : {}) : {}, {
    x: common_vendor.o((...args) => $options.backToMenu && $options.backToMenu(...args), "99"),
    y: common_vendor.o((...args) => $options.restartGame && $options.restartGame(...args), "c7"),
    z: $data.showWinModal
  }, $data.showWinModal ? {
    A: common_vendor.t($options.getLevelName()),
    B: common_vendor.t($options.formatTime($data.time)),
    C: common_vendor.t($data.moves),
    D: common_vendor.o((...args) => $options.backToMenu && $options.backToMenu(...args), "93")
  } : {}));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-9127180b"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/game/huarongdao.js.map
