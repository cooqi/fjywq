"use strict";
const common_vendor = require("../../common/vendor.js");
const common_js_permission = require("../../common/js/permission.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      userInfo: {},
      profileData: {
        joinTime: "",
        loveType: "宇青99",
        wxid: ""
      },
      meetCount: 0,
      firstMeetInfo: "",
      todoCount: 0,
      joinDays: 0,
      // 入坑天数
      canManageConcert: false,
      // 是否有演唱会管理权限
      // 编辑表单数据
      editForm: {
        nickName: "",
        startTime: "",
        loveType: "",
        wxid: ""
      }
    };
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
  onShow() {
    const userInfo = common_vendor.index.getStorageSync("userInfo");
    if (userInfo) {
      this.userInfo = JSON.parse(userInfo);
      this.canManageConcert = common_js_permission.hasConcertPermission(this.userInfo);
      if (this.userInfo._id) {
        this.getUserStats();
      } else {
        this.getUserInfo();
      }
    } else {
      this.getUserInfo();
    }
  },
  methods: {
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
            common_vendor._r.callFunction({
              name: "user",
              data: {
                action: "code2Session",
                js_code: res.code,
                user_info: _this.userInfo
              },
              success: (res2) => {
                common_vendor.index.hideLoading();
                if (res2.result.status === -3) {
                  common_vendor.index.showModal({
                    content: res2.result.msg || "该用户已被禁止登录",
                    showCancel: false
                  });
                  return;
                }
                if (res2.result.result && res2.result.result.result && res2.result.result.result._id) {
                  common_vendor.index.setStorageSync("userInfo", JSON.stringify(res2.result.result.result));
                  _this.userInfo = res2.result.result.result;
                  _this.getUserStats();
                }
              },
              fail: (err) => {
                common_vendor.index.hideLoading();
                common_vendor.index.__f__("log", "at pages/profile/profile.vue:180", "云函数调用失败", err);
                common_vendor.index.showModal({
                  content: "登录失败，请重试",
                  showCancel: false
                });
              }
            });
          }
        }
      });
    },
    getUserStats() {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:193", "当前用户ID:", this.userInfo._id);
      common_vendor._r.callFunction({
        name: "user",
        data: {
          action: "getUser",
          open_id: this.userInfo.mp_wx_openid
        },
        success: (res) => {
          if (res.result) {
            this.profileData.joinTime = res.result.startTime || "";
            this.profileData.loveType = res.result.loveType || "宇青99";
            this.profileData.wxid = res.result.wxid || "";
            if (res.result.startTime) {
              this.calculateJoinDays(res.result.startTime);
            }
          }
        }
      });
    },
    // 计算入坑天数
    calculateJoinDays(startTime) {
      if (!startTime) {
        this.joinDays = 0;
        return;
      }
      try {
        const startDate = new Date(startTime.replace(/-/g, "/"));
        const now = /* @__PURE__ */ new Date();
        const diffTime = now.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1e3 * 60 * 60 * 24));
        this.joinDays = diffDays >= 0 ? diffDays : 0;
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:235", "计算入坑天数失败:", e);
        this.joinDays = 0;
      }
    },
    editProfile() {
      this.showEditDialog();
    },
    // 编辑单个字段
    editField(field) {
      let title = "";
      let currentValue = "";
      let placeholder = "";
      switch (field) {
        case "nickName":
          title = "";
          currentValue = this.userInfo.nickName || "";
          placeholder = "请输入昵称";
          break;
        case "loveType":
          title = "你的属性";
          currentValue = this.profileData.loveType || "";
          placeholder = "请输入属性";
          break;
        case "joinTime":
          title = "入坑时间";
          currentValue = this.profileData.joinTime || "";
          placeholder = "请输入入坑时间，如：2020-01-01";
          break;
      }
      common_vendor.index.showModal({
        title,
        editable: true,
        placeholderText: placeholder,
        content: currentValue,
        success: (res) => {
          if (res.confirm && res.content) {
            const newValue = res.content.trim();
            if (field === "nickName") {
              this.updateUserInfo(newValue, void 0, void 0, void 0);
            } else if (field === "loveType") {
              this.updateUserInfo(void 0, void 0, newValue, void 0);
            } else if (field === "joinTime") {
              this.updateUserInfo(void 0, newValue, void 0, void 0);
            }
          }
        }
      });
    },
    showEditDialog() {
      this.editForm = {
        nickName: this.userInfo.nickName || "",
        startTime: this.profileData.joinTime || "",
        loveType: this.profileData.loveType || "宇青99",
        wxid: this.profileData.wxid || ""
      };
      this.openEditPage();
    },
    openEditPage() {
      common_vendor.index.navigateTo({
        url: `/pages/profile/edit?nickName=${encodeURIComponent(this.editForm.nickName)}&startTime=${encodeURIComponent(this.editForm.startTime)}&loveType=${encodeURIComponent(this.editForm.loveType)}&wxid=${encodeURIComponent(this.editForm.wxid)}`
      });
    },
    updateUserInfo(newNickName, newStartTime, newLoveType, newWxid) {
      common_vendor.index.showLoading({ title: "保存中..." });
      common_vendor._r.callFunction({
        name: "user",
        data: {
          action: "update",
          _id: this.userInfo._id,
          open_id: this.userInfo.mp_wx_openid,
          user_info: {
            nickName: newNickName || this.userInfo.nickName,
            avatarUrl: "/static/userImg/baby.png"
          },
          startTime: newStartTime !== void 0 ? newStartTime : this.profileData.joinTime,
          loveType: newLoveType !== void 0 ? newLoveType : this.profileData.loveType,
          wxid: newWxid !== void 0 ? newWxid : this.profileData.wxid
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result) {
          if (newNickName) {
            this.userInfo.nickName = newNickName;
          }
          if (newStartTime !== void 0) {
            this.profileData.joinTime = newStartTime;
          }
          if (newLoveType !== void 0) {
            this.profileData.loveType = newLoveType;
          }
          if (newWxid !== void 0) {
            this.profileData.wxid = newWxid;
          }
          const userInfo = common_vendor.index.getStorageSync("userInfo");
          if (userInfo) {
            const userObj = JSON.parse(userInfo);
            if (newNickName)
              userObj.nickName = newNickName;
            if (newStartTime !== void 0)
              userObj.startTime = newStartTime;
            if (newLoveType !== void 0)
              userObj.loveType = newLoveType;
            if (newWxid !== void 0)
              userObj.wxid = newWxid;
            common_vendor.index.setStorageSync("userInfo", JSON.stringify(userObj));
          }
          common_vendor.index.showModal({
            content: "更新成功",
            showCancel: false
          });
        }
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `更新失败：${err.message}`,
          showCancel: false
        });
      });
    },
    // 刷新用户信息
    refreshUserInfo() {
      common_vendor.index.showLoading({ title: "刷新中..." });
      common_vendor._r.callFunction({
        name: "user",
        data: {
          action: "getUser",
          open_id: this.userInfo.mp_wx_openid
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result && res.result.mp_wx_openid) {
          const userData = res.result;
          this.userInfo = userData;
          common_vendor.index.removeStorageSync("userInfo");
          common_vendor.index.setStorageSync("userInfo", JSON.stringify(userData));
          this.canManageConcert = common_js_permission.hasConcertPermission(this.userInfo);
          this.getUserStats();
          common_vendor.index.showToast({
            title: "刷新成功",
            icon: "success"
          });
        } else {
          common_vendor.index.showToast({
            title: "获取用户信息失败",
            icon: "none"
          });
        }
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:403", "刷新用户信息失败:", err);
        common_vendor.index.showToast({
          title: "刷新失败",
          icon: "none"
        });
      });
    },
    goToTodo() {
      common_vendor.index.navigateTo({
        url: "/pages/myTodo/myTodo"
      });
    },
    showMeetTypeDialog() {
      this.goToMeet();
    },
    goToMeet() {
      common_vendor.index.navigateTo({
        url: "/pages/meet/meet"
      });
    },
    goToSingleMeet() {
      common_vendor.index.navigateTo({
        url: "/pages/meet/singleMeet"
      });
    },
    goToPayRecord() {
      common_vendor.index.navigateTo({
        url: "/pages/payRecord/record"
      });
    },
    goToConcertAdmin() {
      common_vendor.index.navigateTo({
        url: "/pages/concert/admin"
      });
    },
    goToSuggestion() {
      common_vendor.index.navigateTo({
        url: "/pages/myTodo/suggestion"
      });
    },
    goToFootprint() {
      common_vendor.index.navigateTo({
        url: "/pages/footprint/footprint"
      });
    },
    showAbout() {
      common_vendor.index.navigateTo({
        url: "/pages/profile/about"
      });
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
    a: !$data.userInfo._id
  }, !$data.userInfo._id ? {
    b: common_vendor.o((...args) => $options.getUserInfo && $options.getUserInfo(...args), "75")
  } : common_vendor.e({
    c: common_assets._imports_0,
    d: common_vendor.t($data.userInfo.nickName || "杯杯儿"),
    e: common_vendor.o(($event) => $options.editField("nickName"), "bf"),
    f: common_vendor.t($data.profileData.loveType || "未设置"),
    g: common_vendor.o(($event) => $options.editField("loveType"), "79"),
    h: common_vendor.t($data.profileData.joinTime || "未设置"),
    i: common_vendor.t($data.joinDays > 0 ? `（${$data.joinDays}天）` : ""),
    j: common_vendor.o(($event) => $options.editField("joinTime"), "cc"),
    k: common_vendor.p({
      type: "refresh",
      size: "20",
      color: "#8b5cf6"
    }),
    l: common_vendor.o((...args) => $options.refreshUserInfo && $options.refreshUserInfo(...args), "a2"),
    m: common_vendor.o((...args) => $options.goToTodo && $options.goToTodo(...args), "31"),
    n: common_vendor.o((...args) => $options.showMeetTypeDialog && $options.showMeetTypeDialog(...args), "54"),
    o: common_vendor.o((...args) => $options.goToPayRecord && $options.goToPayRecord(...args), "eb"),
    p: common_vendor.o((...args) => $options.goToFootprint && $options.goToFootprint(...args), "24"),
    q: common_vendor.o((...args) => $options.goToSuggestion && $options.goToSuggestion(...args), "d3"),
    r: $data.canManageConcert
  }, $data.canManageConcert ? {
    s: common_vendor.o((...args) => $options.goToConcertAdmin && $options.goToConcertAdmin(...args), "79")
  } : {}, {
    t: common_vendor.o((...args) => $options.showAbout && $options.showAbout(...args), "ba")
  }));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/profile/profile.js.map
