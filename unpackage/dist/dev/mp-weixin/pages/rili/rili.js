"use strict";
const common_vendor = require("../../common/vendor.js");
const rili = require("../../rili.js");
const EmbedCalendar = () => "../../components/fd-EmbedCalendar/fd-EmbedCalendar.js";
const _sfc_main = {
  components: {
    EmbedCalendar
  },
  data() {
    return {
      userAvatar: "/static/user-avatar.png",
      customGreeting: "杯杯儿，今天也要加油哦！",
      //1 onlyFJY 2onlyWQ 3all
      signedDates: [],
      // 已签到日期
      specialDateList: [],
      // 特殊日期列表（包含type字段）
      allRili: [],
      dayInfo: [],
      dayAboutInfo: [],
      bgcolorGreeting: "",
      items: ["当天事件", "相关事件"],
      current: 0,
      time: "",
      userInfo: "",
      dayText: "",
      currentMonth: ""
    };
  },
  onLoad() {
    this.time = this.formatDate(/* @__PURE__ */ new Date());
    this.getList();
    this.useCommon();
    try {
      const userInfo = common_vendor.index.getStorageSync("userInfo");
      this.userInfo = JSON.parse(userInfo);
    } catch (e) {
    }
  },
  // 页面刷新方法
  onPullDownRefresh() {
    this.getList(this.currentMonth);
    this.useCommon();
  },
  watch: {
    dayAboutInfo: {
      handler(val) {
        let len = val.length;
        if (len) {
          this.items[1] = `相关事件(${len}条)`;
        } else {
          this.items[1] = "相关事件";
        }
      },
      immediate: true,
      deep: true
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
  methods: {
    edit() {
      common_vendor.index.navigateTo({
        url: "/pages/edit/rili"
      });
    },
    setArr(date) {
      if (!date)
        return [];
      let arr = date.split("-");
      return arr;
    },
    // 日期点击事件
    handleDateClick(dateInfo) {
      let { month, day, date } = dateInfo;
      this.time = date;
      this.getDetail(date);
    },
    // 月份变化事件
    handleMonthChange(monthInfo) {
    },
    // 今日计划点击事件
    handleTodayPlanClick(val) {
      this.time = this.formatDate(/* @__PURE__ */ new Date());
      this.getDetail();
      let m = (/* @__PURE__ */ new Date()).getMonth() + 1;
      this.getList(m);
    },
    //年月切换
    yearMonthChange(val) {
      let month = val.split("-")[1];
      this.dayInfo = [];
      this.dayAboutInfo = [];
      this.current = 0;
      this.time = "";
      this.dayText = "";
      this.getList(month);
      this.useCommon();
    },
    MonthChange(val) {
      this.dayInfo = [];
      this.dayAboutInfo = [];
      this.current = 0;
      this.time = "";
      this.dayText = "";
      this.getList(val.month);
      this.useCommon();
    },
    getList(month, year) {
      let m = month;
      let y = year;
      let currentMonth = (/* @__PURE__ */ new Date()).getMonth() + 1;
      if (!month) {
        m = currentMonth;
      }
      this.currentMonth = m;
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor._r.callFunction({
        name: "rili-get",
        data: {
          month: m,
          year: y
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        this.allRili = JSON.parse(JSON.stringify(res.result.data));
        if (currentMonth === m) {
          this.time = this.formatDate(/* @__PURE__ */ new Date());
          this.getDetail();
        }
        const arr = res.result.data.map((item) => {
          let d = item.date.split("-");
          d.shift();
          return d.join("-");
        });
        this.signedDates = [...new Set(arr)];
        this.specialDateList = res.result.data.filter((item) => item.type == 2).map((item) => ({
          date: item.date,
          type: item.type
        }));
        common_vendor.index.__f__("log", "at pages/rili/rili.vue:231", "特殊日期列表:", this.specialDateList);
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `查询失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/rili/rili.vue:238", err);
      });
    },
    onClickItem(e) {
      if (this.current !== e.currentIndex) {
        this.current = e.currentIndex;
      }
    },
    formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    getDetail(time) {
      var _a;
      this.current = 0;
      const now = time ? new Date(time.replace(/-/g, "/")) : /* @__PURE__ */ new Date();
      now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      let data = this.allRili.filter((item) => {
        const t = new Date(item.date.replace(/-/g, "/"));
        const m = t.getMonth() + 1;
        const d = t.getDate();
        const tt = this.formatDate(t);
        const nn = this.formatDate(now);
        return month === m && day === d && tt != nn;
      });
      this.dayAboutInfo = rili.processJQLResults(data);
      let data2 = this.allRili.filter((item) => {
        const t = new Date(item.date.replace(/-/g, "/"));
        const tt = this.formatDate(t);
        const nn = this.formatDate(now);
        return tt === nn;
      });
      this.dayInfo = rili.processJQLResults(data2);
      this.dayText = ((_a = this.dayInfo[0]) == null ? void 0 : _a.distanceInfo.displayText) || "";
      if (!this.dayInfo.length && this.dayAboutInfo.length) {
        this.current = 1;
      } else {
        this.current = 0;
      }
    },
    useCommon() {
      common_vendor._r.callFunction({
        name: "welcome",
        data: {
          type: "get"
        }
      }).then((res) => {
        let data = res.result.data[0];
        this.customGreeting = data.title || "杯杯儿，你们最棒";
        this.bgcolorGreeting = data.bgcolor;
      }).catch((err) => {
        common_vendor.index.showModal({
          content: `云函数use-common执行失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/rili/rili.vue:308", err);
      });
    },
    toRedisPage() {
      common_vendor.index.navigateTo({
        url: "/pages/cloudFunction/redis/redis"
      });
    },
    preImg(imgs, i) {
      const urls = imgs.split(";") || [];
      common_vendor.index.previewImage({
        urls,
        current: i,
        longPressActions: {
          itemList: ["发送给朋友", "保存图片", "收藏"],
          success: function(data) {
            common_vendor.index.__f__("log", "at pages/rili/rili.vue:325", "选中了第" + (data.tapIndex + 1) + "个按钮,第" + (data.index + 1) + "张图片");
          },
          fail: function(err) {
            common_vendor.index.__f__("log", "at pages/rili/rili.vue:328", err.errMsg);
          }
        }
      });
    },
    toSearch() {
      common_vendor.index.navigateTo({
        url: "/pages/rili/search"
      });
    }
  }
};
if (!Array) {
  const _component_EmbedCalendar = common_vendor.resolveComponent("EmbedCalendar");
  const _easycom_uni_segmented_control2 = common_vendor.resolveComponent("uni-segmented-control");
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  (_component_EmbedCalendar + _easycom_uni_segmented_control2 + _easycom_uni_icons2)();
}
const _easycom_uni_segmented_control = () => "../../uni_modules/uni-segmented-control/components/uni-segmented-control/uni-segmented-control.js";
const _easycom_uni_icons = () => "../../uni_modules/uni-icons/components/uni-icons/uni-icons.js";
if (!Math) {
  (_easycom_uni_segmented_control + _easycom_uni_icons)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o($options.handleDateClick, "1a"),
    b: common_vendor.o($options.handleTodayPlanClick, "1f"),
    c: common_vendor.o($options.yearMonthChange, "ec"),
    d: common_vendor.o($options.MonthChange, "2f"),
    e: common_vendor.p({
      ["show-top-section"]: true,
      ["greeting-text"]: $data.customGreeting,
      ["signed-dates"]: $data.signedDates,
      ["special-date-list"]: $data.specialDateList,
      weekstart: 1,
      open: true,
      bgcolorGreeting: $data.bgcolorGreeting
    }),
    f: common_vendor.o($options.onClickItem, "8b"),
    g: common_vendor.p({
      current: $data.current,
      values: $data.items,
      ["style-type"]: "text"
    }),
    h: $data.current === 0
  }, $data.current === 0 ? common_vendor.e({
    i: common_vendor.t($data.time),
    j: $data.dayText
  }, $data.dayText ? {
    k: common_vendor.t($data.dayText)
  } : {}, {
    l: common_vendor.f($data.dayInfo, (item, k0, i0) => {
      return common_vendor.e({
        a: item.type == 2
      }, item.type == 2 ? {} : {}, {
        b: common_vendor.t(item.title),
        c: common_vendor.n("title_" + item.type),
        d: item.bz,
        e: item.imgurl
      }, item.imgurl ? {
        f: common_vendor.f(item.imgurl.split(";"), (img, index, i1) => {
          return {
            a: common_vendor.o(($event) => $options.preImg(item.imgurl, index), index),
            b: index,
            c: img
          };
        })
      } : {}, {
        g: item._id
      });
    }),
    m: !$data.dayInfo.length
  }, !$data.dayInfo.length ? {} : {}) : {}, {
    n: $data.current === 1
  }, $data.current === 1 ? common_vendor.e({
    o: common_vendor.f($data.dayAboutInfo, (item, k0, i0) => {
      return common_vendor.e({
        a: item.date
      }, item.date ? {
        b: common_vendor.f($options.setArr(item.date), (t, i, i1) => {
          return {
            a: common_vendor.t(t),
            b: common_vendor.n("t" + i),
            c: i != 2,
            d: i
          };
        }),
        c: common_vendor.t(item.distanceInfo.displayText),
        d: item.distanceInfo.displayText
      } : {}, {
        e: item.type == 2
      }, item.type == 2 ? {} : {}, {
        f: common_vendor.t(item.title),
        g: common_vendor.n("title_" + item.type),
        h: item.bz,
        i: item.imgurl
      }, item.imgurl ? {
        j: common_vendor.f(item.imgurl.split(";"), (img, index, i1) => {
          return {
            a: common_vendor.o(($event) => $options.preImg(item.imgurl, index), index),
            b: index,
            c: img
          };
        })
      } : {}, {
        k: item._id
      });
    }),
    p: !$data.dayAboutInfo.length
  }, !$data.dayAboutInfo.length ? {} : {}) : {}, {
    q: $data.userInfo._id === "68b547748a5c782a2b48ac30"
  }, $data.userInfo._id === "68b547748a5c782a2b48ac30" ? {
    r: common_vendor.o((...args) => $options.edit && $options.edit(...args), "79")
  } : {}, {
    s: common_vendor.p({
      type: "search",
      size: "24",
      color: "#fff"
    }),
    t: common_vendor.o((...args) => $options.toSearch && $options.toSearch(...args), "9e")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/rili/rili.js.map
