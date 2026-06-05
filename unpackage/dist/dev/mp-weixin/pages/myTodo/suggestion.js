"use strict";
const common_vendor = require("../../common/vendor.js");
const common_js_permission = require("../../common/js/permission.js");
const _sfc_main = {
  data() {
    return {
      suggestionContent: "",
      replyList: [],
      loading: false,
      userInfo: {},
      isAdmin: false,
      statusOptions: [
        { value: "todo", label: "后续处理", color: "#f59e0b" },
        { value: "rejected", label: "拒绝", color: "#ef4444" },
        { value: "Finish", label: "完成", color: "#10b981" }
      ]
    };
  },
  onLoad() {
    this.checkLoginAndGetList();
  },
  onPullDownRefresh() {
    this.getReplyList();
  },
  methods: {
    checkLoginAndGetList() {
      try {
        const userInfoStr = common_vendor.index.getStorageSync("userInfo");
        if (!userInfoStr)
          throw new Error("未登录");
        this.userInfo = typeof userInfoStr === "string" ? JSON.parse(userInfoStr) : userInfoStr;
        if (!this.userInfo._id)
          throw new Error("用户ID无效");
        this.isAdmin = common_js_permission.hasSuggestionPermission(this.userInfo, "reply");
        this.getReplyList();
      } catch (e) {
        common_vendor.index.showModal({
          title: "提示",
          content: "请先登录后再使用",
          showCancel: false,
          success: () => common_vendor.index.navigateBack()
        });
      }
    },
    // 普通用户提交
    submitSuggestion() {
      const content = this.suggestionContent.trim();
      if (!content)
        return common_vendor.index.showToast({ title: "请输入内容", icon: "none" });
      common_vendor.index.showLoading({ title: "提交中...", mask: true });
      common_vendor._r.callFunction({
        name: "suggestion",
        data: { type: "add", userId: this.userInfo._id, content }
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 200) {
          common_vendor.index.showToast({ title: "提交成功", icon: "success" });
          this.suggestionContent = "";
          setTimeout(() => this.getReplyList(), 500);
        } else {
          common_vendor.index.showToast({ title: res.result.message || "提交失败", icon: "none" });
        }
      }).catch(() => {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "网络异常", icon: "none" });
      });
    },
    // 获取列表 (云函数已做好数据隔离，前端直接渲染)
    getReplyList() {
      this.loading = true;
      common_vendor._r.callFunction({
        name: "suggestion",
        data: {
          type: "getAll",
          userId: this.userInfo._id,
          userInfo: this.userInfo
          // 传递用户信息用于权限判断
        }
      }).then((res) => {
        common_vendor.index.stopPullDownRefresh();
        if (res.result.code === 200) {
          const list = res.result.data || [];
          if (this.isAdmin) {
            this.replyList = list.map((item) => ({
              ...item,
              replyText: "",
              currentStatus: item.status || "todo"
            }));
          } else {
            this.replyList = list;
          }
        } else {
          common_vendor.index.showToast({ title: res.result.message || "查询失败", icon: "none" });
        }
      }).catch(() => {
        common_vendor.index.stopPullDownRefresh();
        common_vendor.index.showToast({ title: "网络异常", icon: "none" });
      }).finally(() => {
        this.loading = false;
      });
    },
    // 管理员：选择状态
    selectStatus(item, status) {
      item.currentStatus = status;
    },
    // 管理员：提交回复和状态
    submitAdminAction(item) {
      if (!item.replyText.trim() && item.currentStatus === "Finish") {
        return common_vendor.index.showToast({ title: "请输入回复内容", icon: "none" });
      }
      common_vendor.index.showLoading({ title: "处理中...", mask: true });
      common_vendor._r.callFunction({
        name: "suggestion",
        data: {
          type: "adminReply",
          userId: this.userInfo._id,
          // 传入userId用于云函数权限校验
          userInfo: this.userInfo,
          // 传递用户信息用于角色权限判断
          id: item._id,
          answer: item.replyText.trim(),
          status: item.currentStatus
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result.code === 200) {
          common_vendor.index.showToast({ title: "处理成功", icon: "success" });
          setTimeout(() => this.getReplyList(), 500);
        } else {
          common_vendor.index.showToast({ title: res.result.message || "处理失败", icon: "none" });
        }
      }).catch(() => {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "网络异常", icon: "none" });
      });
    },
    formatTime(time) {
      if (!time)
        return "";
      const date = new Date(time);
      const pad = (n) => String(n).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
  }
};
if (!Array) {
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  _easycom_uni_icons2();
}
const _easycom_uni_icons = () => "../../uni_modules/uni-icons/components/uni-icons/uni-icons.js";
if (!Math) {
  _easycom_uni_icons();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.isAdmin
  }, !$data.isAdmin ? common_vendor.e({
    b: common_vendor.p({
      type: "compose",
      size: "20",
      color: "#8b5cf6"
    }),
    c: $data.suggestionContent,
    d: common_vendor.o(($event) => $data.suggestionContent = $event.detail.value, "b4"),
    e: common_vendor.t($data.suggestionContent.length),
    f: !$data.suggestionContent.trim() ? 1 : "",
    g: common_vendor.o((...args) => $options.submitSuggestion && $options.submitSuggestion(...args), "71"),
    h: !$data.suggestionContent.trim(),
    i: $data.replyList.length > 0
  }, $data.replyList.length > 0 ? {
    j: common_vendor.p({
      type: "chat",
      size: "20",
      color: "#8b5cf6"
    }),
    k: common_vendor.f($data.replyList, (item, k0, i0) => {
      return {
        a: common_vendor.t($options.formatTime(item.createTime)),
        b: common_vendor.t(item.content),
        c: item.answer,
        d: item._id
      };
    })
  } : {}) : {}, {
    l: $data.isAdmin
  }, $data.isAdmin ? common_vendor.e({
    m: common_vendor.p({
      type: "gear",
      size: "22",
      color: "#ef4444"
    }),
    n: $data.loading
  }, $data.loading ? {} : $data.replyList.length > 0 ? {
    p: common_vendor.f($data.replyList, (item, k0, i0) => {
      return {
        a: common_vendor.t($options.formatTime(item.createTime)),
        b: common_vendor.t(item.content),
        c: common_vendor.f($data.statusOptions, (opt, k1, i1) => {
          return {
            a: common_vendor.t(opt.label),
            b: opt.value,
            c: item.currentStatus === opt.value ? 1 : "",
            d: opt.color,
            e: item.currentStatus === opt.value ? "#fff" : opt.color,
            f: item.currentStatus === opt.value ? opt.color : "transparent",
            g: common_vendor.o(($event) => $options.selectStatus(item, opt.value), opt.value)
          };
        }),
        d: item.replyText,
        e: common_vendor.o(($event) => item.replyText = $event.detail.value, item._id),
        f: common_vendor.o(($event) => $options.submitAdminAction(item), item._id),
        g: item._id
      };
    })
  } : {
    q: common_vendor.p({
      type: "checkbox",
      size: "40",
      color: "#10b981"
    })
  }, {
    o: $data.replyList.length > 0
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/myTodo/suggestion.js.map
