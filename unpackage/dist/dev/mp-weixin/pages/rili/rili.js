"use strict";
const common_vendor = require("../../common/vendor.js");
const EmbedCalendar = () => "../../components/fd-EmbedCalendar/fd-EmbedCalendar.js";
const _sfc_main = {
  components: {
    EmbedCalendar
  },
  data() {
    return {
      userAvatar: "/static/user-avatar.png",
      customGreeting: "豹豹杯杯儿，今天也要加油哦！",
      //1 onlyFJY 2onlyWQ 3all
      signedDates: [],
      // 已签到日期
      allRili: [],
      dayInfo: [],
      dayAboutInfo: [],
      bgcolorGreeting: "",
      items: ["当天事件", "相关事件"],
      current: 0
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
        common_vendor.index.__f__("error", "at pages/rili/rili.vue:141", err);
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
        common_vendor.index.__f__("error", "at pages/rili/rili.vue:163", err);
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
        common_vendor.index.__f__("error", "at pages/rili/rili.vue:189", err);
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
        common_vendor.index.__f__("log", "at pages/rili/rili.vue:207", "arr", arr);
        this.signedDates = [...new Set(arr)];
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `查询失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/rili/rili.vue:215", err);
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
      const month = now.getMonth() + 1;
      const day = now.getDate();
      this.dayAboutInfo = this.allRili.filter((item) => {
        const t = new Date(item.date.replace(/-/g, "/"));
        const m = t.getMonth() + 1;
        const d = t.getDate();
        const tt = this.formatDate(t);
        const nn = this.formatDate(now);
        return month === m && day === d && tt != nn;
      });
      this.dayInfo = this.allRili.filter((item) => {
        const t = new Date(item.date.replace(/-/g, "/"));
        const m = this.formatDate(t);
        const n = this.formatDate(now);
        common_vendor.index.__f__("log", "at pages/rili/rili.vue:253", 1, m, n);
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
        common_vendor.index.__f__("error", "at pages/rili/rili.vue:276", err);
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
    i: common_vendor.f($data.dayInfo, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.date),
        b: common_vendor.t(item.title),
        c: item.bz,
        d: item._id
      };
    }),
    j: !$data.dayInfo.length
  }, !$data.dayInfo.length ? {} : {}) : {}, {
    k: $data.current === 1
  }, $data.current === 1 ? common_vendor.e({
    l: common_vendor.f($data.dayAboutInfo, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.date),
        b: common_vendor.t(item.title),
        c: item.bz,
        d: item._id
      };
    }),
    m: !$data.dayAboutInfo.length
  }, !$data.dayAboutInfo.length ? {} : {}) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
_sfc_main.__runtimeHooks = 6;
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/rili/rili.js.map
