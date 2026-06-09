"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      list: [],
      formData: {
        title: "",
        bz: "",
        top: "",
        type: "",
        content: "",
        hide: "",
        is_today_important: "",
        classType: "",
        imgs: "",
        url: "",
        is_countdown: "",
        is_countdown_date: ""
      },
      search: {
        title: ""
      },
      id: "",
      range: [
        { value: "news", text: "新闻类" },
        { value: "task", text: "任务类" }
      ],
      range2: [
        { value: "0", text: "通知" },
        { value: "1", text: "商务" },
        { value: "2", text: "作品" },
        { value: "3", text: "演出活动" }
      ],
      sf: [
        { value: "0", text: "否" },
        { value: "1", text: "是" }
      ],
      userInfo: {}
    };
  },
  onLoad(option) {
    let id = option.id;
    if (id) {
      this.getDetail(id);
    }
    const userInfo = common_vendor.index.getStorageSync("userInfo");
    this.userInfo = JSON.parse(userInfo);
  },
  methods: {
    editInfo(item) {
      this.formData = { ...item };
    },
    add() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      let params = { ...this.formData, add_czr: this.userInfo._id };
      common_vendor._r.callFunction({
        name: "notice-add",
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
        this.reset();
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `添加数据失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/edit/notice.vue:178", err);
      });
    },
    remove(id) {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor._r.callFunction({
        name: "notice-add",
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
        this.reset();
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `删除失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/edit/notice.vue:205", err);
      });
    },
    update() {
      let params = { ...this.formData, update_czr: this.userInfo._id };
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor._r.callFunction({
        name: "notice-add",
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
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `更新操作执行失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/edit/notice.vue:232", err);
      });
    },
    submit(type) {
      if (type === "add") {
        this.add();
      } else if (type === "update") {
        this.update();
      }
    },
    getDetail(id) {
      this.reset();
      this.id = id;
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor._r.callFunction({
        name: "notice-add",
        data: {
          type: "view",
          id
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        this.formData = res.result.data[0];
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `查询失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/edit/notice.vue:263", err);
      });
    },
    getList() {
      this.reset();
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor._r.callFunction({
        name: "notice-add",
        data: {
          type: "get",
          title: this.search.title
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
        common_vendor.index.__f__("error", "at pages/edit/notice.vue:287", err);
      });
    },
    reset() {
      this.formData = {
        title: "",
        bz: "",
        top: "",
        type: "",
        content: "",
        hide: "",
        is_today_important: "",
        classType: "",
        imgs: "",
        url: "",
        is_countdown: "",
        is_countdown_date: ""
      };
    }
  }
};
if (!Array) {
  const _easycom_uni_data_select2 = common_vendor.resolveComponent("uni-data-select");
  const _easycom_uni_datetime_picker2 = common_vendor.resolveComponent("uni-datetime-picker");
  (_easycom_uni_data_select2 + _easycom_uni_datetime_picker2)();
}
const _easycom_uni_data_select = () => "../../uni_modules/uni-data-select/components/uni-data-select/uni-data-select.js";
const _easycom_uni_datetime_picker = () => "../../uni_modules/uni-datetime-picker/components/uni-datetime-picker/uni-datetime-picker.js";
if (!Math) {
  (_easycom_uni_data_select + _easycom_uni_datetime_picker)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.getList && $options.getList(...args), "5c"),
    b: $data.search.title,
    c: common_vendor.o(($event) => $data.search.title = $event.detail.value, "f5"),
    d: common_vendor.f($data.list, (item, i, i0) => {
      return {
        a: common_vendor.t(item.title),
        b: i,
        c: common_vendor.o(($event) => $options.editInfo(item), i)
      };
    }),
    e: $data.formData.title,
    f: common_vendor.o(($event) => $data.formData.title = $event.detail.value, "7f"),
    g: $data.formData.content,
    h: common_vendor.o(($event) => $data.formData.content = $event.detail.value, "3b"),
    i: $data.formData.top,
    j: common_vendor.o(($event) => $data.formData.top = $event.detail.value, "6c"),
    k: common_vendor.o(($event) => $data.formData.hide = $event, "c1"),
    l: common_vendor.p({
      localdata: $data.sf,
      modelValue: $data.formData.hide
    }),
    m: common_vendor.o(($event) => $data.formData.is_today_important = $event, "4d"),
    n: common_vendor.p({
      localdata: $data.sf,
      modelValue: $data.formData.is_today_important
    }),
    o: common_vendor.o(($event) => $data.formData.is_countdown = $event, "45"),
    p: common_vendor.p({
      localdata: $data.sf,
      modelValue: $data.formData.is_countdown
    }),
    q: common_vendor.o(($event) => $data.formData.is_countdown_date = $event, "4e"),
    r: common_vendor.p({
      type: "date",
      placeholder: "请选择倒计时目标时间",
      modelValue: $data.formData.is_countdown_date
    }),
    s: common_vendor.o(($event) => $data.formData.classType = $event, "54"),
    t: common_vendor.p({
      localdata: $data.range2,
      modelValue: $data.formData.classType
    }),
    v: common_vendor.o(($event) => $data.formData.type = $event, "79"),
    w: common_vendor.p({
      localdata: $data.range,
      modelValue: $data.formData.type
    }),
    x: $data.formData.imgs,
    y: common_vendor.o(($event) => $data.formData.imgs = $event.detail.value, "2d"),
    z: $data.formData.url,
    A: common_vendor.o(($event) => $data.formData.url = $event.detail.value, "2b"),
    B: $data.formData.bz,
    C: common_vendor.o(($event) => $data.formData.bz = $event.detail.value, "ca"),
    D: $data.formData._id
  }, $data.formData._id ? {
    E: common_vendor.o(($event) => $options.submit("update"), "09")
  } : {}, {
    F: $data.formData._id
  }, $data.formData._id ? {
    G: common_vendor.o(($event) => $options.remove($data.formData._id), "47")
  } : {
    H: common_vendor.o(($event) => $options.submit("add"), "6d")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/edit/notice.js.map
