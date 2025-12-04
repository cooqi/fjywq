"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      todo: [],
      userInfo: {},
      todoList: [],
      originTodoList: []
    };
  },
  onLoad() {
    try {
      const userInfo = common_vendor.index.getStorageSync("userInfo");
      common_vendor.index.__f__("log", "at pages/myTodo/myTodo.vue:34", "userInfo", userInfo);
      this.userInfo = JSON.parse(userInfo);
      this.getUserTodoList(this.userInfo._id);
    } catch (e) {
    }
  },
  onPullDownRefresh() {
    this.getUserTodoList(this.userInfo._id);
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
  methods: {
    getUserInfo() {
      const _this = this;
      common_vendor.index.getUserProfile({
        desc: "用于完善会员资料",
        success: (result) => {
          _this.userInfo = result.userInfo;
          common_vendor.index.__f__("log", "at pages/myTodo/myTodo.vue:60", _this.userInfo);
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
          common_vendor.index.__f__("log", "at pages/myTodo/myTodo.vue:74", "login", res);
          if (res.code) {
            common_vendor.tr.callFunction({
              name: "user",
              data: {
                action: "code2Session",
                js_code: res.code,
                user_info: _this.userInfo
              },
              success: (res2) => {
                common_vendor.index.__f__("log", "at pages/myTodo/myTodo.vue:84", "云函数返回的值：：：：", res2.result);
                common_vendor.index.hideLoading();
                if (res2.result.result.result._id) {
                  common_vendor.index.setStorageSync("userInfo", JSON.stringify(res2.result.result.result));
                  _this.getUserTodoList(res2.result.result.result._id);
                }
              },
              fail: (err) => {
                common_vendor.index.hideLoading();
                common_vendor.index.__f__("log", "at pages/myTodo/myTodo.vue:92", "云函数调用失败", err);
              }
            });
          }
        }
      });
    },
    updateList(data) {
      this.originTodoList = data;
      this.todoList = data.map((item) => {
        return { text: item.title, value: item._id, disabled: item.isComplete === "1" };
      });
      this.todo = data.filter((item) => item.isComplete === "1").map((item) => item._id);
    },
    getUserTodoList(id) {
      common_vendor.index.showLoading({ title: "加载中" });
      common_vendor.tr.callFunction({
        name: "user-todo",
        data: {
          userID: id,
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
          common_vendor.index.__f__("log", "at pages/myTodo/myTodo.vue:122", "云函数调用失败", err);
        }
      });
    },
    change(e) {
      common_vendor.index.__f__("log", "at pages/myTodo/myTodo.vue:127", e);
      let val = e.detail.value[0];
      common_vendor.index.showLoading({ title: "加载中", mask: true });
      let res = this.originTodoList.find((item) => item._id === val);
      common_vendor.index.__f__("log", "at pages/myTodo/myTodo.vue:132", "res", res, e);
      let data = JSON.parse(JSON.stringify(res));
      delete data._id;
      data.isComplete = "1";
      common_vendor.tr.callFunction({
        name: "user-todo",
        data: {
          id: val,
          data,
          type: "update",
          userID: this.userInfo._id
        },
        success: (res2) => {
          common_vendor.index.hideLoading();
          this.updateList(res2.result.data);
        },
        fail: (err) => {
          common_vendor.index.hideLoading();
          common_vendor.index.__f__("log", "at pages/myTodo/myTodo.vue:150", "云函数调用失败", err);
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
              name: "user-todo",
              data: {
                id: item.value,
                type: "del",
                userID: _this.userInfo._id
              },
              success: (res2) => {
                common_vendor.index.hideLoading();
                _this.updateList(res2.result.data);
              },
              fail: (err) => {
                common_vendor.index.hideLoading();
                common_vendor.index.__f__("log", "at pages/myTodo/myTodo.vue:174", "云函数调用失败", err);
              }
            });
          } else if (res.cancel) {
            common_vendor.index.__f__("log", "at pages/myTodo/myTodo.vue:178", "用户点击取消");
          }
        }
      });
    },
    pageTo(url) {
      common_vendor.index.navigateTo({
        url
      });
    }
  }
};
if (!Array) {
  const _easycom_uni_data_checkbox2 = common_vendor.resolveComponent("uni-data-checkbox");
  _easycom_uni_data_checkbox2();
}
const _easycom_uni_data_checkbox = () => "../../uni_modules/uni-data-checkbox/components/uni-data-checkbox/uni-data-checkbox.js";
if (!Math) {
  _easycom_uni_data_checkbox();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.userInfo._id
  }, !$data.userInfo._id ? {
    b: common_vendor.o((...args) => $options.getUserInfo && $options.getUserInfo(...args))
  } : {}, {
    c: common_vendor.f($data.todoList, (item, index, i0) => {
      return {
        a: common_vendor.o(($event) => $options.del(item), item.value),
        b: common_vendor.o($options.change, item.value),
        c: "725aa436-0-" + i0,
        d: common_vendor.o(($event) => $data.todo = $event, item.value),
        e: common_vendor.p({
          max: "1",
          multiple: true,
          localdata: [item],
          modelValue: $data.todo
        }),
        f: item.value
      };
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/myTodo/myTodo.js.map
