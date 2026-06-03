"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      formData: {
        nickName: "",
        startTime: "",
        loveType: "宇青99",
        wxid: ""
      },
      userInfo: {}
    };
  },
  onLoad(options) {
    if (options.nickName) {
      this.formData.nickName = decodeURIComponent(options.nickName);
    }
    if (options.startTime) {
      this.formData.startTime = decodeURIComponent(options.startTime);
    }
    if (options.loveType) {
      this.formData.loveType = decodeURIComponent(options.loveType) || "宇青99";
    }
    if (options.wxid) {
      this.formData.wxid = decodeURIComponent(options.wxid);
    }
    try {
      const userInfo = common_vendor.index.getStorageSync("userInfo");
      this.userInfo = JSON.parse(userInfo);
    } catch (e) {
      common_vendor.index.__f__("error", "at pages/profile/edit.vue:94", "获取用户信息失败", e);
    }
  },
  methods: {
    saveProfile() {
      if (!this.formData.nickName) {
        common_vendor.index.showModal({
          content: "请输入昵称",
          showCancel: false
        });
        return;
      }
      if (!this.userInfo._id) {
        common_vendor.index.showModal({
          content: "请先登录",
          showCancel: false
        });
        return;
      }
      common_vendor.index.showLoading({ title: "保存中..." });
      common_vendor._r.callFunction({
        name: "user",
        data: {
          action: "update",
          _id: this.userInfo._id,
          open_id: this.userInfo.mp_wx_openid,
          user_info: {
            nickName: this.formData.nickName,
            avatarUrl: "/static/userImg/baby.png"
          },
          startTime: this.formData.startTime,
          loveType: this.formData.loveType || "宇青99",
          wxid: this.formData.wxid
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        if (res.result && res.result._id) {
          common_vendor.index.removeStorageSync("userInfo");
          common_vendor.index.setStorageSync("userInfo", JSON.stringify(res.result));
          common_vendor.index.showModal({
            content: "保存成功",
            showCancel: false,
            success: () => {
              common_vendor.index.navigateBack();
            }
          });
        }
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `保存失败：${err.message}`,
          showCancel: false
        });
      });
    }
  }
};
if (!Array) {
  const _easycom_uni_datetime_picker2 = common_vendor.resolveComponent("uni-datetime-picker");
  _easycom_uni_datetime_picker2();
}
const _easycom_uni_datetime_picker = () => "../../uni_modules/uni-datetime-picker/components/uni-datetime-picker/uni-datetime-picker.js";
if (!Math) {
  _easycom_uni_datetime_picker();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_assets._imports_0,
    b: $data.formData.nickName,
    c: common_vendor.o(($event) => $data.formData.nickName = $event.detail.value, "c0"),
    d: common_vendor.o(($event) => $data.formData.startTime = $event, "77"),
    e: common_vendor.p({
      type: "date",
      placeholder: "请选择入坑时间",
      modelValue: $data.formData.startTime
    }),
    f: $data.formData.loveType,
    g: common_vendor.o(($event) => $data.formData.loveType = $event.detail.value, "22"),
    h: $data.formData.wxid,
    i: common_vendor.o(($event) => $data.formData.wxid = $event.detail.value, "4a"),
    j: common_vendor.o((...args) => $options.saveProfile && $options.saveProfile(...args), "39")
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/profile/edit.js.map
