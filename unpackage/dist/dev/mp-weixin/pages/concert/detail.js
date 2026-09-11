"use strict";
const common_vendor = require("../../common/vendor.js");
const common_js_permission = require("../../common/js/permission.js");
const _sfc_main = {
  data() {
    return {
      loading: true,
      concert: null,
      userInfo: {},
      canEditCalendar: false
    };
  },
  onLoad(options) {
    try {
      const userInfo = common_vendor.index.getStorageSync("userInfo");
      this.userInfo = JSON.parse(userInfo);
      this.canEditCalendar = common_js_permission.hasCalendarPermission(this.userInfo, "add") || common_js_permission.hasCalendarPermission(this.userInfo, "edit");
    } catch (e) {
    }
    if (options.id) {
      this.loadDetail(options.id);
    } else {
      this.loading = false;
    }
  },
  methods: {
    // 加载详情
    loadDetail(id) {
      this.loading = true;
      common_vendor._r.callFunction({
        name: "concert-admin",
        data: {
          action: "getList",
          page: 1,
          pageSize: 100
        },
        success: (res) => {
          this.loading = false;
          if (res.result.code === 0) {
            const list = res.result.data.list || [];
            const idx = list.findIndex((item) => item._id === id);
            if (idx > -1) {
              this.concert = list[idx];
            }
          }
        },
        fail: (err) => {
          this.loading = false;
          common_vendor.index.__f__("error", "at pages/concert/detail.vue:108", "加载失败", err);
        }
      });
    },
    // 获取类型样式类名
    getTypeClass(type) {
      const typeMap = {
        "演唱会": "type-concert",
        "音乐节": "type-festival",
        "见面会": "type-meet",
        "其他": "type-other"
      };
      return typeMap[type] || "type-other";
    },
    // 编辑
    editConcert() {
      if (!this.concert)
        return;
      common_vendor.index.navigateTo({
        url: "/pages/concert/admin?editId=" + this.concert._id
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.loading
  }, $data.loading ? {} : $data.concert ? common_vendor.e({
    c: common_vendor.t($data.concert.type || "演唱会"),
    d: common_vendor.n($options.getTypeClass($data.concert.type)),
    e: common_vendor.t($data.concert.ychTheme || "未设置"),
    f: common_vendor.t($data.concert.yhcTheme || "未设置"),
    g: common_vendor.t($data.concert.Session || "未设置"),
    h: common_vendor.t($data.concert.time || "未设置"),
    i: common_vendor.t($data.concert.Province || "未设置"),
    j: common_vendor.t($data.concert.address || "未设置"),
    k: $data.concert.playlist
  }, $data.concert.playlist ? {
    l: common_vendor.t($data.concert.playlist)
  } : {}, {
    m: $data.concert.bz
  }, $data.concert.bz ? {
    n: common_vendor.t($data.concert.bz)
  } : {}) : {}, {
    b: $data.concert
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/concert/detail.js.map
