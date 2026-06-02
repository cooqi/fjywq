"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      list: [],
      totalAmount: "0.00",
      totalCount: 0,
      typeList: [
        { label: "全部", value: "all" },
        { label: "音乐节", value: "音乐节" },
        { label: "演唱会", value: "演唱会" },
        { label: "周边", value: "周边" },
        { label: "专辑", value: "专辑" },
        { label: "商务", value: "商务" },
        { label: "其他", value: "其他" }
      ],
      currentType: "all",
      loading: false,
      userInfo: {
        _id: ""
      }
    };
  },
  onLoad() {
  },
  onShow() {
    const userInfo = common_vendor.index.getStorageSync("userInfo");
    common_vendor.index.__f__("log", "at pages/payRecord/record.vue:79", "userInfo", userInfo);
    this.userInfo = JSON.parse(userInfo);
    if (this.userInfo._id) {
      this.getRecords();
      this.getTotal();
    } else {
      this.getUserInfo();
    }
  },
  onPullDownRefresh() {
    this.getRecords();
    this.getTotal();
  },
  methods: {
    getUserInfo() {
      const _this = this;
      common_vendor.index.getUserProfile({
        desc: "用于完善会员资料",
        success: (result) => {
          _this.userInfo = result.userInfo;
          common_vendor.index.__f__("log", "at pages/payRecord/record.vue:98", _this.userInfo);
          _this.wxLogin();
        },
        fail: () => {
          common_vendor.index.hideLoading();
          common_vendor.index.showModal({
            content: "获取用户信息失败",
            showCancel: false
          });
        }
      });
    },
    wxLogin() {
      const _this = this;
      common_vendor.index.showLoading({ title: "加载中" });
      common_vendor.index.login({
        provider: "weixin",
        success: (res) => {
          common_vendor.index.__f__("log", "at pages/payRecord/record.vue:112", "login", res);
          if (res.code) {
            common_vendor._r.callFunction({
              name: "user",
              data: {
                action: "code2Session",
                js_code: res.code,
                user_info: _this.userInfo
              },
              success: (res2) => {
                common_vendor.index.__f__("log", "at pages/payRecord/record.vue:122", "云函数返回的值：：：：", res2.result);
                common_vendor.index.hideLoading();
                if (res2.result.result.result._id) {
                  common_vendor.index.setStorageSync("userInfo", JSON.stringify(res2.result.result.result));
                  _this.userInfo = res2.result.result.result;
                  this.getRecords();
                  this.getTotal();
                }
              },
              fail: (err) => {
                common_vendor.index.hideLoading();
                common_vendor.index.__f__("log", "at pages/payRecord/record.vue:132", "云函数调用失败", err);
              }
            });
          }
        }
      });
    },
    switchType(type) {
      this.currentType = type;
      this.getRecords();
      this.getTotal();
    },
    getTotal() {
      if (!this.userInfo._id) {
        common_vendor.index.showModal({
          content: "请先登录",
          showCancel: false
        });
        return;
      }
      common_vendor._r.callFunction({
        name: "pay-record",
        data: {
          type: "getTotal",
          payType: this.currentType,
          userId: this.userInfo._id
        }
      }).then((res) => {
        if (res.result.code === 0) {
          this.totalAmount = res.result.data.total;
          this.totalCount = res.result.data.count;
        }
      }).catch((err) => {
        common_vendor.index.__f__("error", "at pages/payRecord/record.vue:166", "获取统计失败", err);
      });
    },
    getRecords() {
      if (!this.userInfo._id) {
        common_vendor.index.showModal({
          content: "请先登录",
          showCancel: false
        });
        return;
      }
      common_vendor.index.showLoading({
        title: "加载中..."
      });
      this.loading = true;
      common_vendor._r.callFunction({
        name: "pay-record",
        data: {
          type: "get",
          payType: this.currentType,
          userId: this.userInfo._id
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.stopPullDownRefresh();
        this.loading = false;
        if (res.result.code === 0) {
          this.list = res.result.data;
        } else {
          common_vendor.index.showModal({
            content: res.result.message,
            showCancel: false
          });
        }
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.stopPullDownRefresh();
        this.loading = false;
        common_vendor.index.showModal({
          content: `查询失败：${err.message}`,
          showCancel: false
        });
      });
    },
    addRecord() {
      common_vendor.index.navigateTo({
        url: "/pages/payRecord/edit"
      });
    },
    editRecord(id) {
      common_vendor.index.navigateTo({
        url: `/pages/payRecord/edit?id=${id}`
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.totalAmount),
    b: common_vendor.t($data.totalCount),
    c: common_vendor.f($data.typeList, (item, index, i0) => {
      return {
        a: common_vendor.t(item.label),
        b: $data.currentType === item.value ? 1 : "",
        c: index,
        d: common_vendor.o(($event) => $options.switchType(item.value), index)
      };
    }),
    d: common_vendor.f($data.list, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.payType),
        b: common_vendor.t(item.payAmount),
        c: common_vendor.t(item.payName),
        d: common_vendor.t(item.payTime),
        e: item.payNum
      }, item.payNum ? {
        f: common_vendor.t(item.payNum)
      } : {}, {
        g: item.bz
      }, item.bz ? {
        h: common_vendor.t(item.bz)
      } : {}, {
        i: item._id,
        j: common_vendor.o(($event) => $options.editRecord(item._id), item._id)
      });
    }),
    e: !$data.list.length && !$data.loading
  }, !$data.list.length && !$data.loading ? {} : {}, {
    f: common_vendor.o((...args) => $options.addRecord && $options.addRecord(...args), "42")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/payRecord/record.js.map
