"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      name1: "",
      name2: "",
      currentMonth: "MAY.",
      weekDays: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
      calendarDates: [],
      displayDates: [],
      // 显示的日期（当前周或全月）
      isExpanded: false,
      // 日历是否展开
      compatibilityScore: "",
      compatibilityText: "",
      yiTags: [],
      jiTags: [],
      randomYiTags: [],
      // 随机选择的宜标签
      randomJiTags: [],
      // 随机选择的忌标签
      auTitle: "",
      auContent: "",
      momentText: "",
      fortuneScore: "",
      fortuneDesc: "",
      rerollSeed: 0,
      // 重新投掷的随机种子
      // 从云端获取的配置数据
      configData: {
        yi_tags: [],
        ji_tags: [],
        au_titles: [],
        descriptions: [],
        au_contents: [],
        moments: [],
        fortunes: []
      },
      isLoading: true
    };
  },
  onLoad(options) {
    if (options.name1)
      this.name1 = options.name1;
    if (options.name2)
      this.name2 = options.name2;
    this.initCalendar();
    this.loadConfigData();
  },
  methods: {
    // 从云数据库加载配置数据
    async loadConfigData() {
      try {
        common_vendor.index.showLoading({ title: "加载中..." });
        const res = await common_vendor.tr.callFunction({
          name: "compatibility-config",
          data: {}
        });
        if (res.result && res.result.code === 0) {
          const data = res.result.data;
          this.yiTags = data.yi_tags || [];
          this.jiTags = data.ji_tags || [];
          this.configData = data;
          this.generateContent();
        } else {
          throw new Error(res.result.msg || "获取配置数据失败");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/game/compatibility.vue:214", "加载配置数据异常:", error);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: error.message || "加载失败，请重试",
          icon: "none",
          duration: 3e3
        });
        setTimeout(() => {
          common_vendor.index.navigateBack();
        }, 2e3);
      } finally {
        this.isLoading = false;
        common_vendor.index.hideLoading();
      }
    },
    initCalendar() {
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const today = now.getDate();
      now.getDay();
      const monthNames = [
        "JAN.",
        "FEB.",
        "MAR.",
        "APR.",
        "MAY.",
        "JUN.",
        "JUL.",
        "AUG.",
        "SEP.",
        "OCT.",
        "NOV.",
        "DEC."
      ];
      this.currentMonth = monthNames[month];
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      this.calendarDates = [];
      for (let i = 0; i < firstDay; i++) {
        this.calendarDates.push({ day: "", isToday: false, hasEvent: false });
      }
      for (let i = 1; i <= daysInMonth; i++) {
        this.calendarDates.push({
          day: i,
          isToday: i === today,
          hasEvent: false
        });
      }
      this.updateDisplayDates();
    },
    // 更新显示的日期
    updateDisplayDates() {
      if (this.isExpanded) {
        this.displayDates = this.calendarDates;
      } else {
        const now = /* @__PURE__ */ new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const today = now.getDate();
        const currentDayOfWeek = now.getDay();
        const firstDay = new Date(year, month, 1).getDay();
        const weekStartIndex = firstDay + (today - 1 - currentDayOfWeek);
        this.displayDates = this.calendarDates.slice(weekStartIndex, weekStartIndex + 7);
        while (this.displayDates.length < 7) {
          this.displayDates.push({ day: "", isToday: false, hasEvent: false });
        }
      }
    },
    // 切换日历展开/收缩
    toggleCalendar() {
      this.isExpanded = !this.isExpanded;
      this.updateDisplayDates();
    },
    generateContent() {
      const today = (/* @__PURE__ */ new Date()).toDateString();
      const seed = (this.name1 || "YOU") + (this.name2 || "YQ") + today + this.rerollSeed;
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      this.compatibilityScore = Math.abs(hash % 41) + 60;
      if (this.configData.descriptions && this.configData.descriptions.length > 0) {
        this.compatibilityText = this.getDescriptionByScore(this.compatibilityScore);
      }
      this.randomYiTags = this.getRandomItems(this.yiTags, 3);
      this.randomJiTags = this.getRandomItems(this.jiTags, 3);
      if (this.configData.au_contents && this.configData.au_contents.length > 0) {
        const randomAuIndex = Math.floor(Math.random() * this.configData.au_contents.length);
        this.auContent = this.configData.au_contents[randomAuIndex];
      }
      if (this.configData.moments && this.configData.moments.length > 0) {
        const randomMomentIndex = Math.floor(Math.random() * this.configData.moments.length);
        this.momentText = this.configData.moments[randomMomentIndex];
      }
      let fortuneHash = hash + 12345;
      this.fortuneScore = Math.abs(fortuneHash % 51) + 50;
      if (this.fortuneScore === this.compatibilityScore) {
        this.fortuneScore = this.fortuneScore < 55 ? this.fortuneScore + 1 : this.fortuneScore - 1;
      }
      if (this.configData.fortunes && this.configData.fortunes.length > 0) {
        this.fortuneDesc = this.getFortuneByScore(this.fortuneScore);
      }
    },
    // 从数组中随机选择指定数量的元素
    getRandomItems(arr, count) {
      if (!arr || arr.length === 0)
        return [];
      if (arr.length <= count) {
        return [...arr];
      }
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    },
    // 根据财运分数获取对应的描述
    getFortuneByScore(score) {
      var _a;
      const fortunes = this.configData.fortunes;
      for (const fortune of fortunes) {
        const range = fortune.score_range;
        if (!range)
          continue;
        const [min, max] = range.split("-").map(Number);
        if (score >= min && score <= max) {
          return fortune.content;
        }
      }
      return ((_a = fortunes[0]) == null ? void 0 : _a.content) || "";
    },
    // 根据分数获取对应的描述
    getDescriptionByScore(score) {
      var _a;
      const descriptions = this.configData.descriptions;
      for (const desc of descriptions) {
        const range = desc.score_range;
        if (!range)
          continue;
        const [min, max] = range.split("-").map(Number);
        if (score >= min && score <= max) {
          return desc.content;
        }
      }
      return ((_a = descriptions[0]) == null ? void 0 : _a.content) || "";
    },
    retakeTest() {
      common_vendor.index.showModal({
        title: "重新测试",
        content: "确定要重新测试吗？",
        success: (res) => {
          if (res.confirm) {
            this.rerollSeed++;
            this.generateContent();
            common_vendor.index.showToast({
              title: "已更新",
              icon: "success"
            });
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($data.currentMonth),
    b: common_vendor.t($data.isExpanded ? "收起" : "展开"),
    c: common_vendor.t($data.isExpanded ? "∧" : "∨"),
    d: common_vendor.o((...args) => $options.toggleCalendar && $options.toggleCalendar(...args)),
    e: common_vendor.f($data.weekDays, (day, index, i0) => {
      return {
        a: common_vendor.t(day),
        b: index
      };
    }),
    f: common_vendor.f($data.displayDates, (date, index, i0) => {
      return common_vendor.e({
        a: date.day
      }, date.day ? {
        b: common_vendor.t(date.day)
      } : {}, {
        c: date.hasEvent
      }, date.hasEvent ? {} : {}, {
        d: index,
        e: date.isToday ? 1 : "",
        f: date.hasEvent ? 1 : "",
        g: !date.day ? 1 : ""
      });
    }),
    g: $data.isExpanded ? 1 : "",
    h: common_vendor.t($data.name1 || "YOU"),
    i: common_vendor.t($data.name2 || "YQ"),
    j: common_vendor.t($data.compatibilityScore),
    k: common_vendor.t($data.compatibilityText),
    l: common_vendor.f($data.randomYiTags, (tag, index, i0) => {
      return {
        a: common_vendor.t(tag),
        b: index
      };
    }),
    m: common_vendor.f($data.randomJiTags, (tag, index, i0) => {
      return {
        a: common_vendor.t(tag),
        b: index
      };
    }),
    n: common_vendor.t($data.auTitle),
    o: common_vendor.t($data.auContent),
    p: common_vendor.t($data.momentText),
    q: common_vendor.t($data.fortuneScore),
    r: common_vendor.t($data.fortuneDesc),
    s: common_vendor.o((...args) => $options.retakeTest && $options.retakeTest(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-cd824c5a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/game/compatibility.js.map
