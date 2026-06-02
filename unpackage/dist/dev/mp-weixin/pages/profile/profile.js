"use strict";
const common_vendor = require("../../common/vendor.js");
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
      // 编辑表单数据
      editForm: {
        nickName: "",
        startTime: "",
        loveType: "",
        wxid: ""
      }
    };
  },
  onShow() {
    const userInfo = common_vendor.index.getStorageSync("userInfo");
    if (userInfo) {
      this.userInfo = JSON.parse(userInfo);
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
                if (res2.result.result.result._id) {
                  common_vendor.index.setStorageSync("userInfo", JSON.stringify(res2.result.result.result));
                  _this.userInfo = res2.result.result.result;
                  _this.getUserStats();
                }
              },
              fail: (err) => {
                common_vendor.index.hideLoading();
                common_vendor.index.__f__("log", "at pages/profile/profile.vue:147", "云函数调用失败", err);
              }
            });
          }
        }
      });
    },
    getUserStats() {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:156", "当前用户ID:", this.userInfo._id);
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
          }
        }
      });
    },
    editProfile() {
      this.showEditDialog();
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
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.userInfo._id
  }, !$data.userInfo._id ? {
    b: common_vendor.o((...args) => $options.getUserInfo && $options.getUserInfo(...args), "75")
  } : common_vendor.e({
    c: common_assets._imports_0,
    d: common_vendor.t($data.userInfo.nickName || "杯杯儿"),
    e: common_vendor.t($data.profileData.loveType || "未设置"),
    f: common_vendor.t($data.profileData.joinTime || "未设置"),
    g: common_vendor.o((...args) => $options.showEditDialog && $options.showEditDialog(...args), "e3"),
    h: common_vendor.o((...args) => $options.goToTodo && $options.goToTodo(...args), "76"),
    i: common_vendor.o((...args) => $options.showMeetTypeDialog && $options.showMeetTypeDialog(...args), "55"),
    j: common_vendor.o((...args) => $options.goToPayRecord && $options.goToPayRecord(...args), "17"),
    k: common_vendor.o((...args) => $options.goToFootprint && $options.goToFootprint(...args), "c9"),
    l: common_vendor.o((...args) => $options.goToSuggestion && $options.goToSuggestion(...args), "86"),
    m: $data.userInfo._id === "68b547748a5c782a2b48ac30"
  }, $data.userInfo._id === "68b547748a5c782a2b48ac30" ? {
    n: common_vendor.o((...args) => $options.goToConcertAdmin && $options.goToConcertAdmin(...args), "00")
  } : {}, {
    o: common_vendor.o((...args) => $options.showAbout && $options.showAbout(...args), "73")
  }));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/profile/profile.js.map
