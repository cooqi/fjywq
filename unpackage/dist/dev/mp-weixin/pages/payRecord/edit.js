"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      isEdit: false,
      recordId: "",
      typeList: ["音乐节", "演唱会", "周边", "专辑", "商务", "其他"],
      concertList: [],
      // 演唱会/音乐节列表
      concertIndex: -1,
      // 选中的演唱会索引
      selectedConcert: null,
      // 选中的演唱会对象
      formData: {
        payTime: this.getCurrentDate(),
        payType: "音乐节",
        payName: "",
        payNum: "1",
        payPrice: "",
        TransportationExpenses: "",
        HotelExpenses: "",
        otherExpenses: "",
        payAmount: "",
        bz: "",
        adress: "",
        Province: "",
        imgs: "",
        sdUrl: "",
        concertID: "",
        isEntry: "",
        // 是否入场：1是/0否
        SeatNumber: ""
        // 座位号
      },
      imageList: [],
      originalFileIDs: [],
      // 存储原始的 fileID 列表
      showDatePicker: false,
      userInfo: {
        _id: ""
      }
    };
  },
  onLoad(options) {
    try {
      const userInfo = common_vendor.index.getStorageSync("userInfo");
      this.userInfo = JSON.parse(userInfo);
    } catch (e) {
    }
    if (options.id) {
      this.isEdit = true;
      this.recordId = options.id;
      this.getRecordDetail(options.id);
    } else {
      this.loadConcertList();
    }
  },
  onShow() {
    const userInfo = common_vendor.index.getStorageSync("userInfo");
    common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:289", "userInfo", userInfo);
    this.userInfo = JSON.parse(userInfo);
    if (!this.userInfo._id) {
      common_vendor.index.navigateBack();
    }
  },
  watch: {
    showDatePicker(newVal) {
      if (newVal) {
        this.$refs.datetimePicker.show();
      }
    }
  },
  methods: {
    getCurrentDate() {
      const date = /* @__PURE__ */ new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    getTypeIcon(type) {
      const iconMap = {
        "音乐节": "🎵",
        "演唱会": "🎤",
        "周边": "🧸",
        "专辑": "💿",
        "商务": "💼",
        "其他": "📦"
      };
      return iconMap[type] || "📦";
    },
    getPlaceholder() {
      const placeholderMap = {
        "音乐节": "如：迷笛音乐节 - 连云港",
        "演唱会": "如：某某演唱会",
        "周边": "如：涂鸦森林黑胶",
        "专辑": "如：专辑名称",
        "商务": "如：ELLEMEN杂志",
        "其他": "请输入名称"
      };
      return placeholderMap[this.formData.payType] || "请输入名称";
    },
    selectType(type) {
      if (this.formData.payType !== type) {
        this.clearFormData();
      }
      this.formData.payType = type;
      if (type === "音乐节" || type === "演唱会") {
        this.loadConcertList();
      }
    },
    // 清空表单数据
    clearFormData() {
      this.formData = {
        payTime: this.getCurrentDate(),
        payType: this.formData.payType,
        // 保留当前类型
        payName: "",
        payNum: "1",
        payPrice: "",
        TransportationExpenses: "",
        HotelExpenses: "",
        otherExpenses: "",
        payAmount: "",
        bz: "",
        adress: "",
        Province: "",
        imgs: "",
        sdUrl: "",
        concertID: "",
        isEntry: "",
        SeatNumber: ""
      };
      this.imageList = [];
      this.originalFileIDs = [];
      this.concertIndex = -1;
      this.selectedConcert = null;
    },
    // 加载演唱会/音乐节列表
    loadConcertList() {
      common_vendor.index.showLoading({ title: "加载中" });
      common_vendor._r.callFunction({
        name: "concert",
        data: {
          action: "getList",
          type: this.formData.payType
          // 根据当前类型筛选
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          this.concertList = res.result.data.map((item) => {
            let displayName = "";
            if (item.ychTheme) {
              displayName = `${item.ychTheme}`;
              if (item.yhcTheme) {
                displayName += ` - ${item.yhcTheme}`;
              }
              if (item.Session) {
                displayName += ` - ${item.Session}`;
              }
              if (item.time) {
                displayName += ` (${item.time})`;
              }
            } else if (item.Session) {
              displayName = `${item.Session}`;
              if (item.address) {
                displayName += ` - ${item.address}`;
              }
              if (item.time) {
                displayName += ` (${item.time})`;
              }
            } else {
              displayName = item.time || "未命名场次";
            }
            return {
              ...item,
              displayName
            };
          });
          common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:422", "演唱会列表:", this.concertList);
        } else {
          common_vendor.index.showToast({
            title: res.result.message || "加载失败",
            icon: "none"
          });
        }
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/payRecord/edit.vue:431", "加载演唱会列表失败", err);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      });
    },
    // 选择是否入场
    selectEntry(value) {
      this.formData.isEntry = value;
      if (value === "否") {
        this.formData.payPrice = "";
        this.calculateTotal();
      }
    },
    // 选择演唱会/音乐节
    onConcertChange(e) {
      const index = e.detail.value;
      this.concertIndex = index;
      this.selectedConcert = this.concertList[index];
      if (this.selectedConcert) {
        this.formData.payName = this.selectedConcert.displayName;
        this.formData.adress = this.selectedConcert.Province + this.selectedConcert.address || "";
        this.formData.concertID = this.selectedConcert._id || "";
        common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:460", "选中的演唱会:", this.selectedConcert);
      }
    },
    calculateTotal() {
      if (this.formData.payType === "音乐节" || this.formData.payType === "演唱会") {
        const payPrice = parseFloat(this.formData.payPrice) || 0;
        const transportation = parseFloat(this.formData.TransportationExpenses) || 0;
        const hotel = parseFloat(this.formData.HotelExpenses) || 0;
        const other = parseFloat(this.formData.otherExpenses) || 0;
        this.formData.payAmount = (payPrice + transportation + hotel + other).toFixed(2);
      } else {
        const price = parseFloat(this.formData.payPrice) || 0;
        const num = parseInt(this.formData.payNum) || 1;
        this.formData.payAmount = (price * num).toFixed(2);
      }
    },
    chooseImage() {
      common_vendor.index.chooseImage({
        count: 1,
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
            common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:503", "选中了第" + (data.tapIndex + 1) + "个按钮,第" + (data.index + 1) + "张图片");
          },
          fail: function(err) {
            common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:506", err.errMsg);
          }
        }
      });
    },
    getRecordDetail(id) {
      if (!this.userInfo._id) {
        common_vendor.index.showModal({
          content: "请先登录！",
          showCancel: false,
          success: () => {
            common_vendor.index.navigateBack();
          }
        });
        return;
      }
      common_vendor.index.showLoading({
        title: "加载中..."
      });
      common_vendor._r.callFunction({
        name: "pay-record",
        data: {
          type: "getDetail",
          id,
          userId: this.userInfo._id
        }
      }).then(async (res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          const data = res.result.data;
          this.formData = {
            payTime: data.payTime || this.getCurrentDate(),
            payType: data.payType || "周边",
            payName: data.payName || "",
            payNum: data.payNum || "1",
            payPrice: data.payPrice || "0",
            TransportationExpenses: data.TransportationExpenses || "0",
            HotelExpenses: data.HotelExpenses || "0",
            otherExpenses: data.otherExpenses || "0",
            payAmount: data.payAmount || "0",
            bz: data.bz || "",
            adress: data.adress || "",
            Province: data.Province || "",
            imgs: data.imgs || "",
            isEntry: data.isEntry || "",
            SeatNumber: data.SeatNumber || ""
          };
          if (data.payType === "音乐节" || data.payType === "演唱会") {
            await this.loadConcertList();
            const matchedIndex = this.concertList.findIndex(
              (item) => item.ychTheme === data.payName || item.Session === data.payName || item.address === data.adress || item.displayName === data.payName
            );
            if (matchedIndex > -1) {
              this.concertIndex = matchedIndex;
              this.selectedConcert = this.concertList[matchedIndex];
            }
          }
          if (data.imgs) {
            const fileIDs = data.imgs.split(";").filter((img) => img);
            this.originalFileIDs = fileIDs;
            common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:575", "需要转换的图片 fileIDs:", fileIDs);
            try {
              const urlRes = await common_vendor._r.getTempFileURL({
                fileList: fileIDs
              });
              common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:581", "获取临时URL成功:", urlRes);
              this.imageList = urlRes.fileList.map((item) => item.tempFileURL);
              common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:585", "图片列表:", this.imageList);
            } catch (err) {
              common_vendor.index.__f__("error", "at pages/payRecord/edit.vue:587", "获取图片临时URL失败:", err);
              this.imageList = fileIDs;
            }
          }
        }
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `加载失败：${err.message}`,
          showCancel: false
        });
      });
    },
    async saveRecord() {
      if (!this.userInfo._id) {
        common_vendor.index.showModal({
          content: "请先登录",
          showCancel: false
        });
        return;
      }
      if (this.formData.payType === "音乐节" || this.formData.payType === "演唱会") {
        if (!this.selectedConcert) {
          common_vendor.index.showModal({
            content: "请选择演唱会/音乐节场次",
            showCancel: false
          });
          return;
        }
        if (!this.formData.isEntry) {
          common_vendor.index.showModal({
            content: "请选择是否入场",
            showCancel: false
          });
          return;
        }
        if (this.formData.isEntry === "1" && !this.formData.payPrice) {
          common_vendor.index.showModal({
            content: "已入场必须填写票价",
            showCancel: false
          });
          return;
        }
        if (!this.isEdit) {
          const isDuplicate = await this.checkDuplicateRecord();
          if (isDuplicate) {
            common_vendor.index.showModal({
              content: "您今天已经添加过该场次的记录了，不能重复添加",
              showCancel: false
            });
            return;
          }
        }
      } else {
        if (!this.formData.payName) {
          common_vendor.index.showModal({
            content: "请输入消费名称",
            showCancel: false
          });
          return;
        }
      }
      let newImageFiles = [];
      let keptFileIDs = [];
      if (this.imageList.length > 0) {
        const urlToFileIDMap = {};
        if (this.originalFileIDs.length > 0 && this.imageList.length > 0) {
          for (let i = 0; i < this.imageList.length; i++) {
            const imgPath = this.imageList[i];
            if ((imgPath.startsWith("http://") || imgPath.startsWith("https://")) && this.originalFileIDs[i]) {
              urlToFileIDMap[imgPath] = this.originalFileIDs[i];
            }
          }
        }
        this.imageList.forEach((imgPath, index) => {
          if ((imgPath.startsWith("http://") || imgPath.startsWith("https://")) && urlToFileIDMap[imgPath]) {
            keptFileIDs.push(urlToFileIDMap[imgPath]);
            common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:686", `保留第${index + 1}张已有图片的fileID:`, urlToFileIDMap[imgPath]);
          } else {
            newImageFiles.push(imgPath);
            common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:690", `第${index + 1}张是新图片，需要上传`);
          }
        });
      }
      common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:695", "保留的fileIDs:", keptFileIDs);
      common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:696", "需要上传的新图片数量:", newImageFiles.length);
      if (newImageFiles.length > 0) {
        common_vendor.index.showLoading({
          title: "上传中..."
        });
        try {
          const uploadPromises = newImageFiles.map((filePath, index) => {
            return common_vendor._r.uploadFile({
              filePath,
              cloudPath: `payRecord/${Date.now()}_${index}.jpg`
            }).then((res) => {
              common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:709", `新图片${index + 1}上传成功:`, res.fileID);
              return res.fileID;
            });
          });
          const newFileIDs = await Promise.all(uploadPromises);
          const allFileIDs = [...keptFileIDs, ...newFileIDs];
          this.formData.imgs = allFileIDs.join(";");
          common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:718", "最终所有图片fileIDs:", this.formData.imgs);
        } catch (err) {
          common_vendor.index.hideLoading();
          common_vendor.index.__f__("error", "at pages/payRecord/edit.vue:721", "图片上传失败详情:", err);
          common_vendor.index.showModal({
            content: `图片上传失败：${err.message || "未知错误"}`,
            showCancel: false
          });
          return;
        }
        common_vendor.index.hideLoading();
      } else {
        if (this.isEdit) {
          this.formData.imgs = keptFileIDs.join(";");
          common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:734", "没有新图片，保留的fileIDs:", this.formData.imgs);
        }
      }
      common_vendor.index.showLoading({
        title: "保存中..."
      });
      const actionType = this.isEdit ? "update" : "add";
      const data = {
        type: actionType,
        userId: this.userInfo._id,
        ...this.formData
      };
      if (this.isEdit) {
        data.id = this.recordId;
      }
      common_vendor._r.callFunction({
        name: "pay-record",
        data
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 0) {
          common_vendor.index.showModal({
            content: this.isEdit ? "更新成功" : "保存成功",
            showCancel: false,
            success: () => {
              common_vendor.index.navigateBack();
            }
          });
        } else {
          common_vendor.index.showModal({
            content: res.result.message,
            showCancel: false
          });
        }
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `保存失败：${err.message}`,
          showCancel: false
        });
      });
    },
    deleteRecord() {
      if (!this.userInfo._id) {
        common_vendor.index.showModal({
          content: "请先登录",
          showCancel: false
        });
        return;
      }
      common_vendor.index.showModal({
        content: "确定要删除这条记录吗？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.showLoading({
              title: "删除中..."
            });
            common_vendor._r.callFunction({
              name: "pay-record",
              data: {
                type: "delete",
                id: this.recordId,
                userId: this.userInfo._id
              }
            }).then((res2) => {
              common_vendor.index.hideLoading();
              if (res2.result.code === 0) {
                common_vendor.index.showModal({
                  content: "删除成功",
                  showCancel: false,
                  success: () => {
                    common_vendor.index.navigateBack();
                  }
                });
              } else {
                common_vendor.index.showModal({
                  content: res2.result.message,
                  showCancel: false
                });
              }
            }).catch((err) => {
              common_vendor.index.hideLoading();
              common_vendor.index.showModal({
                content: `删除失败：${err.message}`,
                showCancel: false
              });
            });
          }
        }
      });
    },
    // 压缩图片
    compressImage(filePath) {
      return new Promise((resolve, reject) => {
        common_vendor.index.getImageInfo({
          src: filePath,
          success: (info) => {
            common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:837", "原始图片信息:", info);
            this.compressImageByCanvas(filePath, info).then(resolve);
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/payRecord/edit.vue:843", "获取图片信息失败", err);
            resolve(filePath);
          }
        });
      });
    },
    // Canvas 压缩（主方案）
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
        common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:865", `原始尺寸: ${info.width}x${info.height}, 压缩后: ${width}x${height}`);
        const ctx = common_vendor.index.createCanvasContext("compressCanvas", this);
        ctx.setFillStyle("#ffffff");
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(filePath, 0, 0, width, height);
        ctx.draw(false, () => {
          setTimeout(() => {
            common_vendor.index.canvasToTempFilePath({
              canvasId: "compressCanvas",
              quality: 0.6,
              fileType: "jpg",
              // 指定导出区域，只导出绘制的内容部分
              x: 0,
              y: 0,
              width,
              height,
              destWidth: width,
              destHeight: height,
              success: (res) => {
                common_vendor.index.__f__("log", "at pages/payRecord/edit.vue:890", "Canvas压缩成功:", res.tempFilePath);
                resolve(res.tempFilePath);
              },
              fail: (err) => {
                common_vendor.index.__f__("error", "at pages/payRecord/edit.vue:894", "Canvas压缩失败", err);
                resolve(filePath);
              }
            }, this);
          }, 500);
        });
      });
    },
    // 检查是否重复添加
    checkDuplicateRecord() {
      return new Promise((resolve) => {
        common_vendor._r.callFunction({
          name: "pay-record",
          data: {
            type: "checkDuplicate",
            userId: this.userInfo._id,
            concertID: this.formData.concertID,
            payTime: this.formData.payTime
          }
        }).then((res) => {
          if (res.result.code === 0) {
            resolve(res.result.isDuplicate || false);
          } else {
            resolve(false);
          }
        }).catch((err) => {
          common_vendor.index.__f__("error", "at pages/payRecord/edit.vue:920", "检查重复记录失败", err);
          resolve(false);
        });
      });
    }
  }
};
if (!Array) {
  const _easycom_uni_datetime_picker2 = common_vendor.resolveComponent("uni-datetime-picker");
  _easycom_uni_datetime_picker2();
}
const _easycom_uni_datetime_picker = () => "../../uni_modules/uni-datetime-picker/components/uni-datetime-picker/uni-datetime-picker.js";
if (!Math) {
  _easycom_uni_datetime_picker();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.f($data.typeList, (item, index, i0) => {
      return {
        a: common_vendor.t($options.getTypeIcon(item)),
        b: common_vendor.t(item),
        c: $data.formData.payType === item ? 1 : "",
        d: index,
        e: common_vendor.o(($event) => !$data.isEdit && $options.selectType(item), index)
      };
    }),
    b: $data.isEdit ? 1 : "",
    c: $data.formData.payType === "音乐节" || $data.formData.payType === "演唱会"
  }, $data.formData.payType === "音乐节" || $data.formData.payType === "演唱会" ? common_vendor.e({
    d: common_vendor.t($data.selectedConcert ? $data.selectedConcert.displayName : "请选择演唱会/音乐节"),
    e: common_vendor.o((...args) => $options.onConcertChange && $options.onConcertChange(...args), "fe"),
    f: $data.concertIndex,
    g: $data.concertList,
    h: $data.selectedConcert
  }, $data.selectedConcert ? common_vendor.e({
    i: $data.selectedConcert.ychTheme
  }, $data.selectedConcert.ychTheme ? {
    j: common_vendor.t($data.selectedConcert.ychTheme)
  } : {}, {
    k: $data.selectedConcert.Session
  }, $data.selectedConcert.Session ? {
    l: common_vendor.t($data.selectedConcert.Session)
  } : {}, {
    m: $data.selectedConcert.yhcTheme
  }, $data.selectedConcert.yhcTheme ? {
    n: common_vendor.t($data.selectedConcert.yhcTheme)
  } : {}, {
    o: common_vendor.t($data.selectedConcert.time || "未设置"),
    p: common_vendor.t($data.selectedConcert.address || "未设置")
  }) : {}, {
    q: $data.formData.isEntry === "1" ? 1 : "",
    r: common_vendor.o(($event) => $options.selectEntry("1"), "39"),
    s: $data.formData.isEntry === "0" ? 1 : "",
    t: common_vendor.o(($event) => $options.selectEntry("0"), "32"),
    v: $data.formData.isEntry === "1"
  }, $data.formData.isEntry === "1" ? {
    w: $data.formData.SeatNumber,
    x: common_vendor.o(($event) => $data.formData.SeatNumber = $event.detail.value, "2a")
  } : {}) : {}, {
    y: $data.formData.payType !== "音乐节" && $data.formData.payType !== "演唱会"
  }, $data.formData.payType !== "音乐节" && $data.formData.payType !== "演唱会" ? {
    z: $options.getPlaceholder(),
    A: $data.formData.payName,
    B: common_vendor.o(($event) => $data.formData.payName = $event.detail.value, "b1")
  } : {}, {
    C: $data.formData.payType === "音乐节" || $data.formData.payType === "演唱会"
  }, $data.formData.payType === "音乐节" || $data.formData.payType === "演唱会" ? {
    D: common_vendor.o([($event) => $data.formData.payPrice = $event.detail.value, (...args) => $options.calculateTotal && $options.calculateTotal(...args)], "29"),
    E: $data.formData.payPrice,
    F: common_vendor.o([($event) => $data.formData.payNum = $event.detail.value, (...args) => $options.calculateTotal && $options.calculateTotal(...args)], "59"),
    G: $data.formData.payNum,
    H: $data.formData.payPrice,
    I: common_vendor.o(($event) => $data.formData.payPrice = $event.detail.value, "34"),
    J: common_vendor.o([($event) => $data.formData.TransportationExpenses = $event.detail.value, (...args) => $options.calculateTotal && $options.calculateTotal(...args)], "02"),
    K: $data.formData.TransportationExpenses,
    L: common_vendor.o([($event) => $data.formData.HotelExpenses = $event.detail.value, (...args) => $options.calculateTotal && $options.calculateTotal(...args)], "51"),
    M: $data.formData.HotelExpenses,
    N: common_vendor.o([($event) => $data.formData.otherExpenses = $event.detail.value, (...args) => $options.calculateTotal && $options.calculateTotal(...args)], "3b"),
    O: $data.formData.otherExpenses
  } : {
    P: common_vendor.o([($event) => $data.formData.payPrice = $event.detail.value, (...args) => $options.calculateTotal && $options.calculateTotal(...args)], "29"),
    Q: $data.formData.payPrice,
    R: common_vendor.o([($event) => $data.formData.payNum = $event.detail.value, (...args) => $options.calculateTotal && $options.calculateTotal(...args)], "59"),
    S: $data.formData.payNum
  }, {
    T: common_vendor.t($data.formData.payAmount),
    U: common_vendor.o(($event) => $data.formData.payTime = $event, "3b"),
    V: common_vendor.p({
      type: "date",
      placeholder: "请选择标时间",
      modelValue: $data.formData.payTime
    }),
    W: $data.formData.payType === "音乐节" || $data.formData.payType === "演唱会"
  }, $data.formData.payType === "音乐节" || $data.formData.payType === "演唱会" ? {
    X: $data.formData.adress,
    Y: common_vendor.o(($event) => $data.formData.adress = $event.detail.value, "df")
  } : {}, {
    Z: $data.formData.sdUrl,
    aa: common_vendor.o(($event) => $data.formData.sdUrl = $event.detail.value, "4b"),
    ab: common_vendor.f($data.imageList, (img, index, i0) => {
      return {
        a: img,
        b: common_vendor.o(($event) => $options.previewImage(index), index),
        c: common_vendor.o(($event) => $options.deleteImage(index), index),
        d: index
      };
    }),
    ac: $data.imageList.length < 1
  }, $data.imageList.length < 1 ? {
    ad: common_vendor.t($data.imageList.length),
    ae: common_vendor.o((...args) => $options.chooseImage && $options.chooseImage(...args), "92")
  } : {}, {
    af: $data.formData.bz,
    ag: common_vendor.o(($event) => $data.formData.bz = $event.detail.value, "fc"),
    ah: common_vendor.t($data.isEdit ? "更新记录" : "保存记录"),
    ai: common_vendor.o((...args) => $options.saveRecord && $options.saveRecord(...args), "99"),
    aj: $data.isEdit
  }, $data.isEdit ? {
    ak: common_vendor.o((...args) => $options.deleteRecord && $options.deleteRecord(...args), "bb")
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/payRecord/edit.js.map
