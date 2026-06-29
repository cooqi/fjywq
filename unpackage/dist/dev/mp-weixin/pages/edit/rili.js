"use strict";
const common_vendor = require("../../common/vendor.js");
const common_js_permission = require("../../common/js/permission.js");
const _sfc_main = {
  data() {
    return {
      list: [],
      formData: {
        title: "",
        bz: "",
        date: "",
        imgurl: "",
        type: ""
      },
      search: {
        date: ""
      },
      searchDatePicker: "",
      formDatePicker: "",
      customGreeting: {
        title: ""
      },
      userInfo: null
    };
  },
  onLoad() {
    const userInfo = common_vendor.index.getStorageSync("userInfo");
    this.userInfo = JSON.parse(userInfo);
  },
  methods: {
    isCalendarPermission(type) {
      return common_js_permission.hasCalendarPermission(this.userInfo, type);
    },
    editInfo(data) {
      this.formData = { ...data };
      this.formDatePicker = data.date ? this.formatToPicker(data.date) : "";
    },
    formatToPicker(dateStr) {
      if (!dateStr)
        return "";
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`;
      }
      return dateStr;
    },
    formatDate(dateStr) {
      if (!dateStr)
        return "";
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[0]}-${parseInt(parts[1])}-${parseInt(parts[2])}`;
      }
      return dateStr;
    },
    onSearchDateChange() {
      this.search.date = this.formatDate(this.searchDatePicker);
      this.getList();
    },
    onFormDateChange() {
      this.formData.date = this.formatDate(this.formDatePicker);
    },
    add_customGreeting() {
      if (!this.customGreeting.title && !this.customGreeting.bgcolor) {
        common_vendor.index.showModal({
          content: `请输入有效数据`,
          showCancel: false
        });
        return;
      }
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor._r.callFunction({
        name: "welcome",
        data: {
          type: "update",
          params: this.customGreeting
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `问候语修改成功`,
          showCancel: false
        });
        this.clearForm();
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `修改数据失败`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/edit/rili.vue:251", err);
      });
    },
    async setImg() {
      const isEdit = !!this.formData._id;
      const result = await this.$refs.imageUpload.processImages(isEdit);
      if (result !== null) {
        this.formData.imgurl = result;
      }
    },
    async add() {
      if (!this.formData.date) {
        common_vendor.index.showModal({
          content: `请选择日期`,
          showCancel: false
        });
        return;
      }
      if (!this.formData.title) {
        common_vendor.index.showModal({
          content: `请输入标题`,
          showCancel: false
        });
        return;
      }
      await this.setImg();
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      let params = { ...this.formData, add_czr: this.userInfo._id };
      common_vendor._r.callFunction({
        name: "rili-add",
        data: {
          type: "add",
          params
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `成功添加一条数据，文档id为：${res.result.id}`,
          showCancel: false
        });
        this.clearForm();
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `添加数据失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/edit/rili.vue:300", err);
      });
    },
    remove(id) {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor._r.callFunction({
        name: "rili-add",
        data: {
          type: "del",
          params: this.formData._id
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `删除成功`,
          showCancel: false
        });
        this.getList();
        this.clearForm();
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `删除失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/edit/rili.vue:328", err);
      });
    },
    async update() {
      if (!this.formData.date) {
        common_vendor.index.showModal({
          content: `请选择日期`,
          showCancel: false
        });
        return;
      }
      if (!this.formData.title) {
        common_vendor.index.showModal({
          content: `请输入标题`,
          showCancel: false
        });
        return;
      }
      await this.setImg();
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      let params = { ...this.formData, update_czr: this.userInfo._id };
      common_vendor._r.callFunction({
        name: "rili-add",
        data: {
          type: "update",
          params
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `更新成功`,
          showCancel: false
        });
        this.getList();
        this.clearForm();
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `更新操作执行失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/edit/rili.vue:372", err);
      });
    },
    submit(type) {
      if (type === "add") {
        this.add();
      } else if (type === "update") {
        this.update();
      }
    },
    getList() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor._r.callFunction({
        name: "rili-get",
        data: {
          search: this.search
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        this.list = res.result.data || [];
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `查询失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/edit/rili.vue:402", err);
      });
    },
    clearForm() {
      delete this.formData._id;
      this.formDatePicker = "";
      this.searchDatePicker = "";
      this.formData.date = "";
      this.formData.title = "";
      this.formData.bz = "";
      this.formData.imgurl = "";
      if (this.$refs.imageUpload) {
        this.$refs.imageUpload.clearImages();
      }
    }
  }
};
if (!Array) {
  const _easycom_uni_datetime_picker2 = common_vendor.resolveComponent("uni-datetime-picker");
  const _easycom_image_upload2 = common_vendor.resolveComponent("image-upload");
  (_easycom_uni_datetime_picker2 + _easycom_image_upload2)();
}
const _easycom_uni_datetime_picker = () => "../../uni_modules/uni-datetime-picker/components/uni-datetime-picker/uni-datetime-picker.js";
const _easycom_image_upload = () => "../../components/image-upload/image-upload.js";
if (!Math) {
  (_easycom_uni_datetime_picker + _easycom_image_upload)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o($options.onSearchDateChange, "e2"),
    b: common_vendor.o(($event) => $data.searchDatePicker = $event, "56"),
    c: common_vendor.p({
      type: "date",
      placeholder: "请选择日期",
      modelValue: $data.searchDatePicker
    }),
    d: common_vendor.f($data.list, (item, i, i0) => {
      return {
        a: common_vendor.t(item.date),
        b: common_vendor.t(item.title),
        c: i,
        d: common_vendor.o(($event) => $options.editInfo(item), i)
      };
    }),
    e: !$data.list.length
  }, !$data.list.length ? {} : {}, {
    f: common_vendor.o($options.onFormDateChange, "5d"),
    g: common_vendor.o(($event) => $data.formDatePicker = $event, "90"),
    h: common_vendor.p({
      type: "date",
      placeholder: "请选择日期",
      modelValue: $data.formDatePicker
    }),
    i: $data.formData.title,
    j: common_vendor.o(($event) => $data.formData.title = $event.detail.value, "b5"),
    k: $data.formData.bz,
    l: common_vendor.o(($event) => $data.formData.bz = $event.detail.value, "22"),
    m: $data.formData.type,
    n: common_vendor.o(($event) => $data.formData.type = $event.detail.value, "6f"),
    o: $data.formData.imgurl,
    p: common_vendor.o(($event) => $data.formData.imgurl = $event.detail.value, "4b"),
    q: common_vendor.sr("imageUpload", "7559c173-2"),
    r: common_vendor.p({
      title: "上传图片",
      optionalText: "优先外链",
      maxCount: "3",
      uploadPath: "rili",
      modelValue: $data.formData.imgurl
    }),
    s: $data.formData._id
  }, $data.formData._id ? common_vendor.e({
    t: common_vendor.o(($event) => $options.submit("update"), "b1"),
    v: $options.isCalendarPermission("del")
  }, $options.isCalendarPermission("del") ? {
    w: common_vendor.o(($event) => $options.remove($data.formData._id), "8f")
  } : {}, {
    x: common_vendor.o((...args) => $options.clearForm && $options.clearForm(...args), "e2")
  }) : {
    y: common_vendor.o(($event) => $options.submit("add"), "a8")
  }, {
    z: $data.customGreeting.title,
    A: common_vendor.o(($event) => $data.customGreeting.title = $event.detail.value, "12"),
    B: common_vendor.o((...args) => $options.add_customGreeting && $options.add_customGreeting(...args), "d9")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/edit/rili.js.map
