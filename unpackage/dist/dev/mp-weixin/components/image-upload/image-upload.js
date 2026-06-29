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
      cloudDomain: "https://env-00jy66xyyok3.normal.cloudstatic.cn",
      canvasId: `compressCanvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
        }
      }
    }
  },
  methods: {
    initImages(imgUrl) {
      const urls = imgUrl.split(";").filter((img) => img);
      this.imageList = urls;
    },
    chooseImage() {
      common_vendor.index.chooseImage({
        count: this.maxCount - this.imageList.length,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          common_vendor.index.showLoading({
            title: "处理中..."
          });
          try {
            const compressedPaths = [];
            for (const filePath of res.tempFilePaths) {
              const compressedPath = await this.compressImage(filePath);
              compressedPaths.push(compressedPath);
            }
            this.imageList = this.imageList.concat(compressedPaths);
          } catch (err) {
            common_vendor.index.__f__("error", "at components/image-upload/image-upload.vue:85", "图片处理失败:", err);
            common_vendor.index.showToast({
              title: "图片处理失败",
              icon: "none"
            });
          } finally {
            common_vendor.index.hideLoading();
          }
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at components/image-upload/image-upload.vue:95", "chooseImage失败:", err);
        }
      });
    },
    compressImage(filePath) {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          common_vendor.index.__f__("error", "at components/image-upload/image-upload.vue:102", "压缩超时，使用原图");
          resolve(filePath);
        }, 1e4);
        common_vendor.index.getImageInfo({
          src: filePath,
          success: (info) => {
            this.compressImageByCanvas(filePath, info).then((compressedPath) => {
              clearTimeout(timeout);
              resolve(compressedPath);
            }).catch(() => {
              clearTimeout(timeout);
              resolve(filePath);
            });
          },
          fail: (err) => {
            clearTimeout(timeout);
            common_vendor.index.__f__("error", "at components/image-upload/image-upload.vue:119", "获取图片信息失败:", err);
            resolve(filePath);
          }
        });
      });
    },
    compressImageByCanvas(filePath, info) {
      return new Promise((resolve, reject) => {
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
                common_vendor.index.__f__("error", "at components/image-upload/image-upload.vue:159", "Canvas压缩失败:", err);
                reject(err);
              }
            }, this);
          }, 300);
        });
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
            common_vendor.index.__f__("log", "at components/image-upload/image-upload.vue:177", "选中了第" + (data.tapIndex + 1) + "个按钮,第" + (data.index + 1) + "张图片");
          },
          fail: function(err) {
            common_vendor.index.__f__("log", "at components/image-upload/image-upload.vue:180", err.errMsg);
          }
        }
      });
    },
    async processImages(isEdit) {
      let newImageFiles = [];
      let keptUrls = [];
      if (this.imageList.length > 0) {
        this.imageList.forEach((imgPath) => {
          if (imgPath.startsWith("http://tmp/") || imgPath.startsWith("wxfile://")) {
            newImageFiles.push(imgPath);
          } else if (imgPath.startsWith("http://") || imgPath.startsWith("https://")) {
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
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                common_vendor.index.__f__("error", "at components/image-upload/image-upload.vue:210", "上传超时:", filePath);
                reject(new Error("上传超时"));
              }, 3e4);
              common_vendor._r.uploadFile({
                filePath,
                cloudPath: `${this.uploadPath}/${timestamp}_${index}_${Math.random().toString(36).substr(2, 9)}.jpg`,
                success: (res) => {
                  clearTimeout(timeout);
                  common_vendor.index.__f__("log", "at components/image-upload/image-upload.vue:219", "上传返回 fileID:", res.fileID);
                  const parts = res.fileID.split("/");
                  const cloudPath = parts.slice(3).join("/");
                  const finalUrl = `${this.cloudDomain}/${cloudPath}`;
                  common_vendor.index.__f__("log", "at components/image-upload/image-upload.vue:223", "最终URL:", finalUrl);
                  resolve(finalUrl);
                },
                fail: (err) => {
                  clearTimeout(timeout);
                  common_vendor.index.__f__("error", "at components/image-upload/image-upload.vue:228", "单个文件上传失败:", filePath, err);
                  reject(err);
                }
              });
            });
          });
          const newUrls = await Promise.all(uploadPromises);
          const allUrls = [...keptUrls, ...newUrls];
          const result = allUrls.join(";");
          common_vendor.index.hideLoading();
          return result;
        } catch (err) {
          common_vendor.index.hideLoading();
          common_vendor.index.__f__("error", "at components/image-upload/image-upload.vue:241", "图片上传失败详情:", err);
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
    clearImages() {
      this.imageList = [];
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
