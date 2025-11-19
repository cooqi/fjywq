"use strict";
const common_vendor = require("../../common/vendor.js");
function isExactYears(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()) {
    return Math.abs(d1.getFullYear() - d2.getFullYear());
  }
  if (d1.getMonth() === 1 && d1.getDate() === 29 && d2.getMonth() === 1 && d2.getDate() === 28) {
    const yearDiff = Math.abs(d1.getFullYear() - d2.getFullYear());
    return d1.getFullYear() % 4 === 0 || d2.getFullYear() % 4 === 0 ? yearDiff : 0;
  }
  return 0;
}
function calculateDateDistance(targetDateStr) {
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(targetDateStr.replace(/-/g, "/"));
  targetDate.setHours(0, 0, 0, 0);
  const timeDiff = targetDate.getTime() - today.getTime();
  const daysDiff = Math.round(timeDiff / (1e3 * 3600 * 24));
  const absoluteDays = Math.abs(daysDiff);
  const isFuture = daysDiff > 0;
  const exactYears = isExactYears(today, targetDate);
  let result = "";
  if (isFuture) {
    result = `倒计时${absoluteDays}天`;
  } else {
    if (exactYears > 0) {
      result = `距离今天${exactYears}年`;
    } else {
      result = `距离今天${absoluteDays}天`;
    }
  }
  return {
    date: targetDateStr,
    days: absoluteDays,
    isFuture,
    exactYears,
    displayText: result
  };
}
const processJQLResults = (issues) => {
  return issues.map((issue) => {
    const dateStr = issue.date;
    const distanceInfo = calculateDateDistance(dateStr);
    return {
      ...issue,
      distanceInfo
    };
  }).filter(Boolean);
};
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
      allRili: [],
      dayInfo: [],
      dayAboutInfo: [],
      bgcolorGreeting: "",
      items: ["当天事件", "相关事件"],
      current: 0,
      time: ""
    };
  },
  onLoad() {
    this.getList();
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
    setArr(date) {
      if (!date)
        return [];
      let arr = date.split("-");
      return arr;
    },
    // 日期点击事件
    handleDateClick(dateInfo) {
      let { month, day, date } = dateInfo;
      this.getDetail(date);
    },
    // 月份变化事件
    handleMonthChange(monthInfo) {
    },
    // 今日计划点击事件
    handleTodayPlanClick() {
      this.getDetail();
    },
    //年月切换
    yearMonthChange() {
      this.dayInfo = [];
      this.dayAboutInfo = [];
      this.current = 0;
    },
    add() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "rili-add",
        data: {
          product: "uniCloud",
          create_time: Date.now()
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `成功添加一条数据，文档id为：${res.result.id}`,
          showCancel: false
        });
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `添加数据失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/rili/rili.vue:152", err);
      });
    },
    remove() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "remove"
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: res.result.msg,
          showCancel: false
        });
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `删除失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/rili/rili.vue:174", err);
      });
    },
    update() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "update",
        data: {
          product: "uni-app",
          create_time: Date.now()
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: res.result.msg,
          showCancel: false
        });
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `更新操作执行失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/rili/rili.vue:200", err);
      });
    },
    getList() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "rili-get"
      }).then((res) => {
        common_vendor.index.hideLoading();
        this.allRili = JSON.parse(JSON.stringify(res.result.data));
        this.getDetail();
        const arr = res.result.data.map((item) => {
          let d = item.date.split("-");
          d.shift();
          return d.join("-");
        });
        this.signedDates = [...new Set(arr)];
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `查询失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/rili/rili.vue:226", err);
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
      this.current = 0;
      const now = time ? new Date(time.replace(/-/g, "/")) : /* @__PURE__ */ new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      this.time = year + "-" + month + "-" + day;
      let data = this.allRili.filter((item) => {
        const t = new Date(item.date.replace(/-/g, "/"));
        const m = t.getMonth() + 1;
        const d = t.getDate();
        const tt = this.formatDate(t);
        const nn = this.formatDate(now);
        return month === m && day === d && tt != nn;
      });
      this.dayAboutInfo = processJQLResults(data);
      this.dayInfo = this.allRili.filter((item) => {
        const t = new Date(item.date.replace(/-/g, "/"));
        const m = this.formatDate(t);
        const n = this.formatDate(now);
        return m === n;
      });
      if (!this.dayInfo.length && this.dayAboutInfo.length) {
        this.current = 1;
      } else {
        this.current = 0;
      }
    },
    useCommon() {
      common_vendor.tr.callFunction({
        name: "welcome"
      }).then((res) => {
        let data = res.result.data[0];
        this.customGreeting = data.title || "豹豹杯杯儿，你们最棒";
        this.bgcolorGreeting = data.bgcolor;
      }).catch((err) => {
        common_vendor.index.showModal({
          content: `云函数use-common执行失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/rili/rili.vue:291", err);
      });
    },
    toRedisPage() {
      common_vendor.index.navigateTo({
        url: "/pages/cloudFunction/redis/redis"
      });
    }
  }
};
if (!Array) {
  const _component_EmbedCalendar = common_vendor.resolveComponent("EmbedCalendar");
  const _easycom_uni_segmented_control2 = common_vendor.resolveComponent("uni-segmented-control");
  (_component_EmbedCalendar + _easycom_uni_segmented_control2)();
}
const _easycom_uni_segmented_control = () => "../../uni_modules/uni-segmented-control/components/uni-segmented-control/uni-segmented-control.js";
if (!Math) {
  _easycom_uni_segmented_control();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o($options.handleDateClick),
    b: common_vendor.o($options.handleTodayPlanClick),
    c: common_vendor.o($options.yearMonthChange),
    d: common_vendor.o($options.yearMonthChange),
    e: common_vendor.p({
      ["show-top-section"]: true,
      ["greeting-text"]: $data.customGreeting,
      ["signed-dates"]: $data.signedDates,
      weekstart: 1,
      open: true,
      bgcolorGreeting: $data.bgcolorGreeting
    }),
    f: common_vendor.o($options.onClickItem),
    g: common_vendor.p({
      current: $data.current,
      values: $data.items,
      ["style-type"]: "text"
    }),
    h: $data.current === 0
  }, $data.current === 0 ? common_vendor.e({
    i: common_vendor.t($data.time),
    j: common_vendor.f($data.dayInfo, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.title),
        b: item.bz,
        c: item._id
      };
    }),
    k: !$data.dayInfo.length
  }, !$data.dayInfo.length ? {} : {}) : {}, {
    l: $data.current === 1
  }, $data.current === 1 ? common_vendor.e({
    m: common_vendor.f($data.dayAboutInfo, (item, k0, i0) => {
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
        e: common_vendor.t(item.title),
        f: item.bz,
        g: item._id
      });
    }),
    n: !$data.dayAboutInfo.length
  }, !$data.dayAboutInfo.length ? {} : {}) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/rili/rili.js.map
