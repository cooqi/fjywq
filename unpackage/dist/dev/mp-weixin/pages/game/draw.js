"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      ctx: null,
      canvasWidth: 0,
      canvasHeight: 0,
      isDrawing: false,
      lastX: 0,
      lastY: 0,
      currentColor: "#000000",
      brushSize: 3,
      colors: [
        "#000000",
        "#FF0000",
        "#FF6B6B",
        "#FFA500",
        "#FFD700",
        "#4CAF50",
        "#00BCD4",
        "#2196F3",
        "#9C27B0",
        "#E91E63",
        "#FFFFFF",
        "#8B4513"
      ],
      history: [],
      // 撤销历史
      maxHistory: 20
      // 最大历史记录数
    };
  },
  onReady() {
    this.initCanvas();
  },
  methods: {
    initCanvas() {
      const query = common_vendor.index.createSelectorQuery().in(this);
      query.select(".drawing-canvas").boundingClientRect((rect) => {
        if (rect) {
          this.canvasWidth = rect.width;
          this.canvasHeight = rect.height;
          this.ctx = common_vendor.index.createCanvasContext("drawingCanvas", this);
          this.ctx.setStrokeStyle(this.currentColor);
          this.ctx.setLineWidth(this.brushSize);
          this.ctx.setLineCap("round");
          this.ctx.setLineJoin("round");
          this.ctx.setFillStyle("#FFFFFF");
          this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
          this.ctx.draw();
          this.saveToHistory();
        }
      }).exec();
    },
    onTouchStart(e) {
      this.isDrawing = true;
      const touch = e.touches[0];
      this.lastX = touch.x;
      this.lastY = touch.y;
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(this.lastX, this.lastY);
      this.ctx.stroke();
      this.ctx.draw(true);
    },
    onTouchMove(e) {
      if (!this.isDrawing)
        return;
      const touch = e.touches[0];
      const currentX = touch.x;
      const currentY = touch.y;
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(currentX, currentY);
      this.ctx.stroke();
      this.ctx.draw(true);
      this.lastX = currentX;
      this.lastY = currentY;
    },
    onTouchEnd() {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.ctx.closePath();
        this.saveToHistory();
      }
    },
    selectColor(color) {
      this.currentColor = color;
      this.ctx.setStrokeStyle(color);
    },
    onBrushSizeChange(e) {
      this.brushSize = e.detail.value;
      this.ctx.setLineWidth(this.brushSize);
    },
    clearCanvas() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要清空画布吗？",
        success: (res) => {
          if (res.confirm) {
            this.ctx.setFillStyle("#FFFFFF");
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            this.ctx.draw();
            this.history = [];
            this.saveToHistory();
            common_vendor.index.showToast({
              title: "已清空",
              icon: "success"
            });
          }
        }
      });
    },
    undo() {
      if (this.history.length <= 1) {
        common_vendor.index.showToast({
          title: "无法撤销",
          icon: "none"
        });
        return;
      }
      this.history.pop();
      const previousState = this.history[this.history.length - 1];
      this.ctx.putImageData(previousState, 0, 0);
      this.ctx.draw();
      common_vendor.index.showToast({
        title: "已撤销",
        icon: "success"
      });
    },
    saveToHistory() {
      if (this.history.length >= this.maxHistory) {
        this.history.shift();
      }
    },
    saveImage() {
      common_vendor.index.canvasToTempFilePath({
        canvasId: "drawingCanvas",
        success: (res) => {
          common_vendor.index.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              common_vendor.index.showToast({
                title: "保存成功",
                icon: "success"
              });
            },
            fail: (err) => {
              common_vendor.index.__f__("error", "at pages/game/draw.vue:239", "保存失败:", err);
              common_vendor.index.showToast({
                title: "保存失败",
                icon: "none"
              });
            }
          });
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/game/draw.vue:248", "生成图片失败:", err);
          common_vendor.index.showToast({
            title: "生成失败",
            icon: "none"
          });
        }
      }, this);
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.f($data.colors, (color, index, i0) => {
      return {
        a: index,
        b: $data.currentColor === color ? 1 : "",
        c: color,
        d: common_vendor.o(($event) => $options.selectColor(color), index)
      };
    }),
    b: $data.brushSize,
    c: common_vendor.o((...args) => $options.onBrushSizeChange && $options.onBrushSizeChange(...args)),
    d: common_vendor.t($data.brushSize),
    e: common_vendor.o((...args) => $options.onTouchStart && $options.onTouchStart(...args)),
    f: common_vendor.o((...args) => $options.onTouchMove && $options.onTouchMove(...args)),
    g: common_vendor.o((...args) => $options.onTouchEnd && $options.onTouchEnd(...args)),
    h: common_vendor.o((...args) => $options.clearCanvas && $options.clearCanvas(...args)),
    i: common_vendor.o((...args) => $options.undo && $options.undo(...args)),
    j: common_vendor.o((...args) => $options.saveImage && $options.saveImage(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-93056f99"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/game/draw.js.map
