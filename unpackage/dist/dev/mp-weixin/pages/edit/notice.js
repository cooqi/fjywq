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
        classType: ""
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
      ]
    };
  },
  onLoad(option) {
    let id = option.id;
    common_vendor.index.__f__("log", "at pages/edit/notice.vue:118", option, id);
    if (id) {
      this.getDetail(id);
    }
  },
  methods: {
    editInfo(item) {
      this.formData = { ...item };
    },
    add() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "notice-add",
        data: {
          type: "add",
          params: this.formData
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
        common_vendor.index.__f__("error", "at pages/edit/notice.vue:150", err);
      });
    },
    remove(id) {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
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
        common_vendor.index.__f__("error", "at pages/edit/notice.vue:177", err);
      });
    },
    update() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "notice-add",
        data: {
          type: "update",
          params: this.formData
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
        common_vendor.index.__f__("error", "at pages/edit/notice.vue:203", err);
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
      common_vendor.tr.callFunction({
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
        common_vendor.index.__f__("error", "at pages/edit/notice.vue:234", err);
      });
    },
    getList() {
      this.reset();
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
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
        common_vendor.index.__f__("error", "at pages/edit/notice.vue:258", err);
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
        classType: ""
      };
    }
  }
};
if (!Array) {
  const _easycom_uni_data_select2 = common_vendor.resolveComponent("uni-data-select");
  _easycom_uni_data_select2();
}
const _easycom_uni_data_select = () => "../../uni_modules/uni-data-select/components/uni-data-select/uni-data-select.js";
if (!Math) {
  _easycom_uni_data_select();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.getList && $options.getList(...args)),
    b: $data.search.title,
    c: common_vendor.o(($event) => $data.search.title = $event.detail.value),
    d: common_vendor.f($data.list, (item, i, i0) => {
      return {
        a: common_vendor.t(item.title),
        b: i,
        c: common_vendor.o(($event) => $options.editInfo(item), i)
      };
    }),
    e: $data.formData.title,
    f: common_vendor.o(($event) => $data.formData.title = $event.detail.value),
    g: $data.formData.content,
    h: common_vendor.o(($event) => $data.formData.content = $event.detail.value),
    i: common_vendor.o(($event) => $data.formData.top = $event),
    j: common_vendor.p({
      localdata: $data.sf,
      modelValue: $data.formData.top
    }),
    k: common_vendor.o(($event) => $data.formData.hide = $event),
    l: common_vendor.p({
      localdata: $data.sf,
      modelValue: $data.formData.hide
    }),
    m: common_vendor.o(($event) => $data.formData.is_today_important = $event),
    n: common_vendor.p({
      localdata: $data.sf,
      modelValue: $data.formData.is_today_important
    }),
    o: common_vendor.o(($event) => $data.formData.classType = $event),
    p: common_vendor.p({
      localdata: $data.range2,
      modelValue: $data.formData.classType
    }),
    q: common_vendor.o(($event) => $data.formData.type = $event),
    r: common_vendor.p({
      localdata: $data.range,
      modelValue: $data.formData.type
    }),
    s: $data.formData.bz,
    t: common_vendor.o(($event) => $data.formData.bz = $event.detail.value),
    v: $data.formData._id
  }, $data.formData._id ? {
    w: common_vendor.o(($event) => $options.submit("update"))
  } : {}, {
    x: $data.formData._id
  }, $data.formData._id ? {
    y: common_vendor.o(($event) => $options.remove($data.formData._id))
  } : {
    z: common_vendor.o(($event) => $options.submit("add"))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/edit/notice.js.map
