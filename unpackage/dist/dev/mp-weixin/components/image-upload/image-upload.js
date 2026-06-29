"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  name: "image-upload",
  props: {
    title: {
      type: String,
      default: "上传图片"
    },
    optionalText: {
      type: String,
      default: ""
    },
    maxCount: {
      type: Number,
      default: 1
    },
    uploadPath: {
      type: String,
      default: "upload"
    },
    modelValue: {
      type: String,
      default: ""
    }
  },
  data() {
    return {
      imageList: [],
      originalFileIDs: [],
      canvasId: `compressCanvas_${Date.now()}`,
      cloudDomain: "https://env-00jy66xyyok3.normal.cloudstatic.cn"
    };
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.initImages(newVal);
        } else {
          this.imageList = [];
          this.originalFileIDs = [];
        }
      }
    }
  },
  methods: {
    initImages(imgUrl) {
      const urls = imgUrl.split(";").filter((img) => img);
      this.imageList = urls;
    },
    async chooseImage() {
      common_vendor.index.chooseImage({
        count: this.maxCount - this.imageList.length,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        type: "image",
        success: async (res) => {
          const compressedImages = [];
          for (let i = 0; i < res.tempFilePaths.length; i++) {
            const compressedPath = await this.compressImage(res.tempFilePaths[i]);
            compressedImages.push(compressedPath);
          }
          this.imageList = this.imageList.concat(compressedImages);
        }
      });
    },
    deleteImage(index) {
      this.imageList.splice(index, 1);
    },
    previewImage(index) {
      common_vendor.index.previewImage({
        urls: this.imageList,
        current: index,
        longPressActions: {
          itemList: ["发送给朋友", "保存图片", "收藏"],
          success: function(data) {
            common_vendor.index.__f__("log", "at components/image-upload/image-upload.vue:96", "选中了第" + (data.tapIndex + 1) + "个按钮,第" + (data.index + 1) + "张图片");
          },
          fail: function(err) {
            common_vendor.index.__f__("log", "at components/image-upload/image-upload.vue:99", err.errMsg);
          }
        }
      });
    },
    async processImages(isEdit) {
      let newImageFiles = [];
      let keptUrls = [];
      if (this.imageList.length > 0) {
        this.imageList.forEach((imgPath) => {
          if (imgPath.startsWith("http://") || imgPath.startsWith("https://")) {
            keptUrls.push(imgPath);
          } else {
            newImageFiles.push(imgPath);
          }
        });
      }
      if (newImageFiles.length > 0) {
        common_vendor.index.showLoading({
          title: "上传中..."
        });
        try {
          const timestamp = Date.now();
          const uploadPromises = newImageFiles.map((filePath, index) => {
            return common_vendor._r.uploadFile({
              filePath,
              cloudPath: `${this.uploadPath}/${timestamp}_${index}_${Math.random().toString(36).substr(2, 9)}.jpg`
            }).then((res) => {
              const cloudPath = res.fileID.replace("cloud://", "");
              return `${this.cloudDomain}/${cloudPath}`;
            });
          });
          const newUrls = await Promise.all(uploadPromises);
          const allUrls = [...keptUrls, ...newUrls];
          const result = allUrls.join(";");
          common_vendor.index.hideLoading();
          return result;
        } catch (err) {
          common_vendor.index.hideLoading();
          common_vendor.index.__f__("error", "at components/image-upload/image-upload.vue:140", "图片上传失败详情:", err);
          common_vendor.index.showModal({
            content: `图片上传失败：${err.message || "未知错误"}`,
            showCancel: false
          });
          return null;
        }
      } else {
        if (isEdit) {
          return keptUrls.join(";");
        } else if (keptUrls.length > 0) {
          return keptUrls.join(";");
        }
        return "";
      }
    },
    compressImage(filePath) {
      return new Promise((resolve) => {
        common_vendor.index.getImageInfo({
          src: filePath,
          success: (info) => {
            this.compressImageByCanvas(filePath, info).then(resolve);
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at components/image-upload/image-upload.vue:164", "获取图片信息失败", err);
            resolve(filePath);
          }
        });
      });
    },
    compressImageByCanvas(filePath, info) {
      return new Promise((resolve) => {
        let width = info.width;
        let height = info.height;
        const maxWidth = 500;
        const maxHeight = 800;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const ctx = common_vendor.index.createCanvasContext(this.canvasId, this);
        ctx.setFillStyle("#ffffff");
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(filePath, 0, 0, width, height);
        ctx.draw(false, () => {
          setTimeout(() => {
            common_vendor.index.canvasToTempFilePath({
              canvasId: this.canvasId,
              quality: 0.6,
              fileType: "jpg",
              x: 0,
              y: 0,
              width,
              height,
              destWidth: width,
              destHeight: height,
              success: (res) => {
                resolve(res.tempFilePath);
              },
              fail: (err) => {
                common_vendor.index.__f__("error", "at components/image-upload/image-upload.vue:204", "Canvas压缩失败", err);
                resolve(filePath);
              }
            }, this);
          }, 500);
        });
      });
    },
    clearImages() {
      this.imageList = [];
      this.originalFileIDs = [];
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($props.title),
    b: common_vendor.t($props.optionalText),
    c: common_vendor.f($data.imageList, (img, index, i0) => {
      return {
        a: img,
        b: common_vendor.o(($event) => $options.previewImage(index), index),
        c: common_vendor.o(($event) => $options.deleteImage(index), index),
        d: index
      };
    }),
    d: $data.imageList.length < $props.maxCount
  }, $data.imageList.length < $props.maxCount ? {
    e: common_vendor.t($data.imageList.length),
    f: common_vendor.t($props.maxCount),
    g: common_vendor.o((...args) => $options.chooseImage && $options.chooseImage(...args), "49")
  } : {}, {
    h: $data.canvasId
  });
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-d208e3bc"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/components/image-upload/image-upload.js.map
