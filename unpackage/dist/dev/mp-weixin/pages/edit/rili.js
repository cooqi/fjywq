"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      list: [],
      formData: {
        title: "",
        bz: "",
        date: "",
        imgurl: ""
      },
      search: {
        date: ""
      },
      customGreeting: {
        title: ""
      }
    };
  },
  onLoad() {
  },
  methods: {
    editInfo(item) {
      this.formData = { ...item };
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
        common_vendor.index.__f__("error", "at pages/edit/rili.vue:197", err);
      });
    },
    add() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor._r.callFunction({
        name: "rili-add",
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
        this.clearForm();
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `添加数据失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/edit/rili.vue:223", err);
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
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `删除失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/edit/rili.vue:250", err);
      });
    },
    update() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor._r.callFunction({
        name: "rili-add",
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
        this.getList();
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `更新操作执行失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/edit/rili.vue:277", err);
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
        common_vendor.index.__f__("error", "at pages/edit/rili.vue:307", err);
      });
    },
    clearForm() {
      this.formData._id = "";
      this.formData.date = "";
      this.formData.title = "";
      this.formData.bz = "";
      this.formData.imgurl = "";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.getList && $options.getList(...args), "0d"),
    b: $data.search.date,
    c: common_vendor.o(($event) => $data.search.date = $event.detail.value, "0a"),
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
    f: $data.formData.date,
    g: common_vendor.o(($event) => $data.formData.date = $event.detail.value, "12"),
    h: $data.formData.title,
    i: common_vendor.o(($event) => $data.formData.title = $event.detail.value, "28"),
    j: $data.formData.bz,
    k: common_vendor.o(($event) => $data.formData.bz = $event.detail.value, "a0"),
    l: $data.formData.imgurl,
    m: common_vendor.o(($event) => $data.formData.imgurl = $event.detail.value, "9c"),
    n: $data.formData._id
  }, $data.formData._id ? {
    o: common_vendor.o(($event) => $options.submit("update"), "4e"),
    p: common_vendor.o(($event) => $options.remove($data.formData._id), "d3"),
    q: common_vendor.o((...args) => $options.clearForm && $options.clearForm(...args), "f8")
  } : {
    r: common_vendor.o(($event) => $options.submit("add"), "f8")
  }, {
    s: $data.customGreeting.title,
    t: common_vendor.o(($event) => $data.customGreeting.title = $event.detail.value, "93"),
    v: common_vendor.o((...args) => $options.add_customGreeting && $options.add_customGreeting(...args), "df")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/edit/rili.js.map
