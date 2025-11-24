"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      meetList: [],
      my_meet: [],
      qy: common_assets.qy,
      userInfo: {},
      value: []
    };
  },
  onLoad() {
    this.getList();
    try {
      const userInfo = common_vendor.index.getStorageSync("userInfo");
      this.userInfo = JSON.parse(userInfo);
      this.getUserMeetList(this.userInfo._id);
    } catch (e) {
    }
  },
  onShareAppMessage: function() {
    return {
      title: "宇青青宇全肯定",
      path: "/pages/rili/rili"
    };
  },
  onShareTimeline: function() {
    return {
      title: "宇青青宇全肯定"
    };
  },
  onPullDownRefresh() {
    this.getUserMeetList(this.userInfo._id);
  },
  computed: {
    tips() {
      let len = this.my_meet.length;
      let str = `你已点亮${len}场见面会；`;
      if (len === 0) {
        str = "宝子你还未点亮任何见面场次，请添加，如果我们缺少你看得场次，请联系我们！";
      } else if (len > 0 && len < 3) {
        str += "宝子，你已经见过青宇了，太让人嫉妒了";
      } else if (len === this.meetList.length) {
        str += "长姐威武，全勤太优秀了！";
      } else {
        str += "你已经打败很多杯杯儿豹豹了，期待下一次见面！";
      }
      return str;
    }
  },
  methods: {
    choose() {
      this.$refs.popup.open();
    },
    getUserInfo() {
      const _this = this;
      common_vendor.index.getUserProfile({
        desc: "用于完善会员资料",
        success: (result) => {
          _this.userInfo = result.userInfo;
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
          if (res.code) {
            common_vendor.tr.callFunction({
              name: "user",
              data: {
                action: "code2Session",
                js_code: res.code,
                user_info: _this.userInfo
              },
              success: (res2) => {
                common_vendor.index.__f__("log", "at pages/meet/meet.vue:118", "云函数返回的值：：：：", res2.result);
                common_vendor.index.hideLoading();
                if (res2.result.result.result._id) {
                  common_vendor.index.setStorageSync("userInfo", JSON.stringify(res2.result.result.result));
                  _this.getUserTodoList(res2.result.result.result._id);
                }
              },
              fail: (err) => {
                common_vendor.index.hideLoading();
                common_vendor.index.__f__("log", "at pages/meet/meet.vue:126", "云函数调用失败", err);
              }
            });
          }
        }
      });
    },
    getList() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "meet"
      }).then((res) => {
        common_vendor.index.hideLoading();
        this.meetList = res.result.data.map((item) => {
          let bz = item.bz || "";
          return { text: item.title + " " + item.time + " " + bz, value: item._id };
        });
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `查询失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/meet/meet.vue:151", err);
      });
    },
    updateList(data) {
      this.my_meet = data.map((item) => {
        let info = item.meetID[0];
        info.content = `${info.time} ${info.address} ${info.bz || ""}`;
        item.meet_info = info;
        return item;
      });
      this.value = this.my_meet.map((item) => item.meet_info._id);
    },
    getUserMeetList(userid) {
      common_vendor.index.showLoading({ title: "加载中" });
      common_vendor.tr.callFunction({
        name: "user-meet",
        data: {
          userID: userid,
          type: "get"
        },
        success: (res) => {
          common_vendor.index.hideLoading();
          common_vendor.index.stopPullDownRefresh();
          this.updateList(res.result.data);
        },
        fail: (err) => {
          common_vendor.index.hideLoading();
          common_vendor.index.stopPullDownRefresh();
          common_vendor.index.__f__("log", "at pages/meet/meet.vue:178", "云函数调用失败", err);
        }
      });
    },
    change(e) {
      common_vendor.index.__f__("log", "at pages/meet/meet.vue:183", e);
      let val = e.detail.value[0];
      common_vendor.index.showLoading({ title: "加载中", mask: true });
      common_vendor.tr.callFunction({
        name: "user-meet",
        data: {
          userID: this.userInfo._id,
          meetID: val,
          type: "add"
        },
        success: (res) => {
          common_vendor.index.hideLoading();
          this.updateList(res.result.data);
        },
        fail: (err) => {
          common_vendor.index.hideLoading();
          common_vendor.index.__f__("log", "at pages/meet/meet.vue:201", "云函数调用失败", err);
        }
      });
    },
    del(item) {
      const _this = this;
      common_vendor.index.showModal({
        title: "提示",
        content: "确认删除",
        success: function(res) {
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "加载中", mask: true });
            common_vendor.tr.callFunction({
              name: "user-meet",
              data: {
                id: item._id,
                type: "del",
                userID: _this.userInfo._id
              },
              success: (res2) => {
                common_vendor.index.hideLoading();
                _this.updateList(res2.result.data);
              },
              fail: (err) => {
                common_vendor.index.hideLoading();
                common_vendor.index.__f__("log", "at pages/meet/meet.vue:225", "云函数调用失败", err);
              }
            });
          } else if (res.cancel) {
            common_vendor.index.__f__("log", "at pages/meet/meet.vue:229", "用户点击取消");
          }
        }
      });
    }
  }
};
if (!Array) {
  const _easycom_uni_data_checkbox2 = common_vendor.resolveComponent("uni-data-checkbox");
  const _easycom_uni_popup2 = common_vendor.resolveComponent("uni-popup");
  const _easycom_uni_list_chat2 = common_vendor.resolveComponent("uni-list-chat");
  const _easycom_uni_list2 = common_vendor.resolveComponent("uni-list");
  (_easycom_uni_data_checkbox2 + _easycom_uni_popup2 + _easycom_uni_list_chat2 + _easycom_uni_list2)();
}
const _easycom_uni_data_checkbox = () => "../../uni_modules/uni-data-checkbox/components/uni-data-checkbox/uni-data-checkbox.js";
const _easycom_uni_popup = () => "../../uni_modules/uni-popup/components/uni-popup/uni-popup.js";
const _easycom_uni_list_chat = () => "../../uni_modules/uni-list/components/uni-list-chat/uni-list-chat.js";
const _easycom_uni_list = () => "../../uni_modules/uni-list/components/uni-list/uni-list.js";
if (!Math) {
  (_easycom_uni_data_checkbox + _easycom_uni_popup + _easycom_uni_list_chat + _easycom_uni_list)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.userInfo._id
  }, !$data.userInfo._id ? {
    b: common_vendor.o((...args) => $options.getUserInfo && $options.getUserInfo(...args))
  } : {
    c: common_vendor.o((...args) => $options.choose && $options.choose(...args)),
    d: common_vendor.t($options.tips),
    e: common_vendor.f($data.meetList, (item, index, i0) => {
      return {
        a: common_vendor.o($options.change, item.value),
        b: "ebcbaa2e-1-" + i0 + ",ebcbaa2e-0",
        c: common_vendor.o(($event) => $data.value = $event, item.value),
        d: common_vendor.p({
          max: "1",
          multiple: true,
          localdata: [item],
          disabled: $data.value.indexOf(item.value) > -1,
          modelValue: $data.value
        }),
        e: item.value
      };
    }),
    f: common_vendor.sr("popup", "ebcbaa2e-0"),
    g: common_vendor.p({
      ["background-color"]: "#fff",
      type: "bottom",
      ["border-radius"]: "10px 10px 0 0"
    }),
    h: common_vendor.f($data.my_meet, (item, k0, i0) => {
      return {
        a: common_vendor.o(($event) => $options.del(item), item._id),
        b: item._id,
        c: "ebcbaa2e-3-" + i0 + ",ebcbaa2e-2",
        d: common_vendor.p({
          title: item.meet_info.title,
          avatar: item.meet_info.img || $data.qy,
          note: item.meet_info.content
        })
      };
    }),
    i: common_vendor.p({
      border: true
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/meet/meet.js.map
