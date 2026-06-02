"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      userInfo: {},
      currentType: "演唱会",
      searchKeyword: "",
      showAllThemes: false,
      selectedTheme: null,
      selectedVenue: null,
      themeList: [],
      venueList: [],
      selectedConcerts: [],
      myConcerts: []
    };
  },
  onLoad() {
    const userInfo = common_vendor.index.getStorageSync("userInfo");
    if (userInfo) {
      this.userInfo = JSON.parse(userInfo);
      if (this.userInfo._id) {
        this.loadData();
      } else {
        this.getUserInfo();
      }
    } else {
      this.getUserInfo();
    }
  },
  onPullDownRefresh() {
    this.loadData();
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
                  _this.loadData();
                }
              },
              fail: (err) => {
                common_vendor.index.hideLoading();
                common_vendor.index.__f__("log", "at pages/meet/singleMeet.vue:198", "云函数调用失败", err);
              }
            });
          }
        }
      });
    },
    loadData() {
      this.loadConcertList();
      this.loadMyConcerts();
    },
    loadConcertList() {
      common_vendor.index.showLoading({ title: "加载中" });
      common_vendor._r.callFunction({
        name: "concert",
        data: {
          action: "getList",
          type: this.currentType
        },
        success: (res) => {
          common_vendor.index.hideLoading();
          common_vendor.index.stopPullDownRefresh();
          if (res.result.code === 0) {
            this.processConcertData(res.result.data);
          }
        },
        fail: (err) => {
          common_vendor.index.hideLoading();
          common_vendor.index.stopPullDownRefresh();
          common_vendor.index.__f__("error", "at pages/meet/singleMeet.vue:227", "加载演唱会列表失败", err);
        }
      });
    },
    processConcertData(data) {
      const themeMap = {};
      data.forEach((item) => {
        const key = item.ychTheme;
        if (!themeMap[key]) {
          themeMap[key] = item;
        }
      });
      this.themeList = Object.values(themeMap);
      const venueMap = {};
      data.forEach((item) => {
        const key = item.yhcTheme;
        if (!venueMap[key]) {
          venueMap[key] = {
            ...item,
            count: 1
          };
        } else {
          venueMap[key].count++;
        }
      });
      this.venueList = Object.values(venueMap);
    },
    loadMyConcerts() {
      common_vendor._r.callFunction({
        name: "concert",
        data: {
          action: "getMyConcerts",
          userId: this.userInfo._id,
          meetType: "单人"
        },
        success: (res) => {
          if (res.result.code === 0) {
            this.myConcerts = res.result.data || [];
          }
        }
      });
    },
    switchType(type) {
      this.currentType = type;
      this.selectedTheme = null;
      this.selectedVenue = null;
      this.loadData();
    },
    handleSearch() {
      if (!this.searchKeyword)
        return;
      common_vendor.index.showToast({
        title: "搜索功能开发中",
        icon: "none"
      });
    },
    selectTheme(item) {
      this.selectedTheme = item;
    },
    selectVenue(item) {
      this.selectedVenue = item;
    },
    addConcert() {
      if (!this.selectedTheme || !this.selectedVenue) {
        common_vendor.index.showToast({
          title: "请选择主题和场馆",
          icon: "none"
        });
        return;
      }
      common_vendor.index.showLoading({ title: "添加中" });
      common_vendor._r.callFunction({
        name: "concert",
        data: {
          action: "addMyConcert",
          userId: this.userInfo._id,
          ConcertId: this.selectedTheme._id,
          meetType: "单人"
        },
        success: (res) => {
          common_vendor.index.hideLoading();
          if (res.result.code === 0) {
            common_vendor.index.showToast({
              title: "添加成功",
              icon: "success"
            });
            this.selectedTheme = null;
            this.selectedVenue = null;
            this.loadMyConcerts();
          } else {
            common_vendor.index.showToast({
              title: res.result.message || "添加失败",
              icon: "none"
            });
          }
        },
        fail: (err) => {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: "添加失败",
            icon: "none"
          });
        }
      });
    },
    deleteConcert(item) {
      common_vendor.index.showModal({
        title: "提示",
        content: "确认删除此演出记录？",
        success: (res) => {
          if (res.confirm)
            ;
        }
      });
    },
    deleteMyConcert(item) {
      common_vendor.index.showModal({
        title: "提示",
        content: "确认删除此记录？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "删除中" });
            common_vendor._r.callFunction({
              name: "concert",
              data: {
                action: "deleteMyConcert",
                id: item._id
              },
              success: (res2) => {
                common_vendor.index.hideLoading();
                if (res2.result.code === 0) {
                  common_vendor.index.showToast({
                    title: "删除成功",
                    icon: "success"
                  });
                  this.loadMyConcerts();
                }
              },
              fail: (err) => {
                common_vendor.index.hideLoading();
                common_vendor.index.__f__("error", "at pages/meet/singleMeet.vue:372", "删除失败", err);
              }
            });
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.userInfo._id
  }, !$data.userInfo._id ? {
    b: common_vendor.o((...args) => $options.getUserInfo && $options.getUserInfo(...args), "82")
  } : common_vendor.e({
    c: $data.currentType === "演唱会" ? 1 : "",
    d: common_vendor.o(($event) => $options.switchType("演唱会"), "eb"),
    e: $data.currentType === "音乐节" ? 1 : "",
    f: common_vendor.o(($event) => $options.switchType("音乐节"), "01"),
    g: common_vendor.o((...args) => $options.handleSearch && $options.handleSearch(...args), "2f"),
    h: $data.searchKeyword,
    i: common_vendor.o(($event) => $data.searchKeyword = $event.detail.value, "28"),
    j: common_vendor.f($data.themeList, (item, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.ychTheme),
        b: common_vendor.t(item.time),
        c: $data.selectedTheme === item
      }, $data.selectedTheme === item ? {} : {}, {
        d: index,
        e: $data.selectedTheme === item ? 1 : "",
        f: common_vendor.o(($event) => $options.selectTheme(item), index)
      });
    }),
    k: common_vendor.t($data.showAllThemes ? "收起" : "展开更多"),
    l: common_vendor.o(($event) => $data.showAllThemes = !$data.showAllThemes, "a2"),
    m: common_vendor.f($data.venueList, (item, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.yhcTheme),
        b: common_vendor.t(item.time),
        c: common_vendor.t(item.count),
        d: $data.selectedVenue === item
      }, $data.selectedVenue === item ? {} : {}, {
        e: index,
        f: $data.selectedVenue === item ? 1 : "",
        g: common_vendor.o(($event) => $options.selectVenue(item), index)
      });
    }),
    n: $data.selectedConcerts.length > 0
  }, $data.selectedConcerts.length > 0 ? {
    o: common_vendor.f($data.selectedConcerts, (item, index, i0) => {
      return {
        a: common_vendor.t(item.ychTheme),
        b: common_vendor.t(item.yhcTheme),
        c: common_vendor.t(item.Session),
        d: index,
        e: common_vendor.o(($event) => $options.deleteConcert(item), index)
      };
    })
  } : {}, {
    p: $data.selectedTheme && $data.selectedVenue
  }, $data.selectedTheme && $data.selectedVenue ? {
    q: common_vendor.o((...args) => $options.addConcert && $options.addConcert(...args), "26")
  } : {}, {
    r: $data.myConcerts.length > 0
  }, $data.myConcerts.length > 0 ? {
    s: common_vendor.f($data.myConcerts, (item, index, i0) => {
      return {
        a: common_vendor.t(item.Concert.ychTheme),
        b: common_vendor.t(item.Concert.yhcTheme),
        c: common_vendor.t(item.Concert.time),
        d: common_vendor.o(($event) => $options.deleteMyConcert(item), index),
        e: index
      };
    })
  } : {}));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/meet/singleMeet.js.map
