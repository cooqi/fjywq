"use strict";
const common_vendor = require("../../common/vendor.js");
const jpTimePicker = () => "../jp-timePicker/jp-timePicker.js";
const _sfc_main = {
  name: "EmbedCalendar",
  components: {
    jpTimePicker
  },
  props: {
    // 第一列星期几
    weekstart: {
      type: Number,
      default: 7
    },
    // 已经签到的日期
    signedDates: {
      type: Array,
      default: () => []
    },
    // 是否展开
    open: {
      type: Boolean,
      default: true
    },
    // 头像图片路径
    avatarSrc: {
      type: String,
      default: ""
    },
    // 问候语文本
    greetingText: {
      type: String,
      default: "我闻着饼香来到到街中央"
    },
    // 是否显示顶部区域
    showTopSection: {
      type: Boolean,
      default: true
    },
    bgcolorGreeting: {
      //欢迎词背景
      type: String,
      default: "#c3ffff"
    }
  },
  data() {
    return {
      text: {
        year: "年",
        month: "月",
        week: ["一", "二", "三", "四", "五", "六", "日"],
        today: "今"
      },
      y: (/* @__PURE__ */ new Date()).getFullYear(),
      // 年
      m: (/* @__PURE__ */ new Date()).getMonth(),
      // 月
      dates: [],
      // 当前月日期集合
      positionTop: 0,
      monthOpen: true,
      choose: "",
      currentWeekIndex: 0,
      // 当前周的索引（用于周视图导航）
      selectedDate: null,
      // 当前选中的日期对象（用于周视图定位）
      dateString: ""
    };
  },
  created() {
    let date = /* @__PURE__ */ new Date();
    this.y = date.getFullYear();
    this.m = date.getMonth();
    this.dates = this.monthDay(this.y, this.m);
    this.monthOpen = this.open;
    if (!this.open) {
      let index = -1;
      this.dates.forEach((i, x) => {
        this.isToday(i.year, i.month, i.date) && (index = x);
      });
      this.positionTop = -((Math.ceil((index + 1) / 7) || 1) - 1) * 80;
    }
  },
  mounted() {
    let date = /* @__PURE__ */ new Date();
    let y = date.getFullYear();
    let m = date.getMonth();
    let d = date.getDate();
    this.choose = "";
    this.selectedDate = {
      year: y,
      month: m,
      date: d
    };
    common_vendor.index.__f__("log", "at components/fd-EmbedCalendar/fd-EmbedCalendar.vue:172", "初始化完成，无选中状态");
    if (!this.monthOpen) {
      this.updateWeekPosition();
    }
  },
  computed: {
    // 顶部星期栏目
    weekDay() {
      return this.text.week.slice(this.weekstart - 1).concat(this.text.week.slice(0, this.weekstart - 1));
    },
    height() {
      return this.dates.length / 7 * 80 + "upx";
    }
  },
  methods: {
    // 获取当前月份天数
    monthDay(y, m) {
      let firstDayOfMonth = new Date(y, m, 1).getDay();
      let lastDateOfMonth = new Date(y, m + 1, 0).getDate();
      let lastDayOfLastMonth = new Date(y, m, 0).getDate();
      let dates = [];
      let weekstart = this.weekstart == 7 ? 0 : this.weekstart;
      let startDay = (() => {
        if (firstDayOfMonth == weekstart) {
          return 0;
        } else if (firstDayOfMonth > weekstart) {
          return firstDayOfMonth - weekstart;
        } else {
          return 7 - weekstart + firstDayOfMonth;
        }
      })();
      let endDay = 7 - (startDay + lastDateOfMonth) % 7;
      for (let i = 1; i <= startDay; i++) {
        dates.push({
          date: lastDayOfLastMonth - startDay + i,
          day: weekstart + i - 1 || 7,
          month: m - 1 >= 0 ? m - 1 : 12,
          year: m - 1 >= 0 ? y : y - 1
        });
      }
      for (let j = 1; j <= lastDateOfMonth; j++) {
        dates.push({
          date: j,
          day: j % 7 + firstDayOfMonth - 1 || 7,
          month: m,
          year: y,
          lm: true
        });
      }
      for (let k = 1; k <= endDay; k++) {
        dates.push({
          date: k,
          day: (lastDateOfMonth + startDay + weekstart + k - 1) % 7 || 7,
          month: m + 1 <= 11 ? m + 1 : 0,
          year: m + 1 <= 11 ? y : y + 1
        });
      }
      return dates;
    },
    // 已经签到处理
    isSigned(y, m, d) {
      let flag = false;
      if (!this.signedDates || !Array.isArray(this.signedDates)) {
        common_vendor.index.__f__("log", "at components/fd-EmbedCalendar/fd-EmbedCalendar.vue:240", "签到数组为空或不是数组:", this.signedDates);
        return flag;
      }
      const dateStr = `${m}-${d}`;
      for (let i = 0; i < this.signedDates.length; i++) {
        if (this.signedDates[i] == dateStr) {
          flag = true;
          break;
        }
      }
      return flag;
    },
    isToday(y, m, d) {
      let date = /* @__PURE__ */ new Date();
      return y == date.getFullYear() && m == date.getMonth() && d == date.getDate();
    },
    // 切换成周模式
    trgWeek() {
      this.monthOpen = !this.monthOpen;
      if (this.monthOpen) {
        this.positionTop = 0;
      } else {
        let index = -1;
        this.dates.forEach((i, x) => {
          this.isToday(i.year, i.month, i.date) && (index = x);
        });
        this.positionTop = -((Math.ceil((index + 1) / 7) || 1) - 1) * 80;
      }
    },
    // 切换到月视图
    switchToMonth() {
      if (!this.monthOpen) {
        this.monthOpen = true;
        this.positionTop = 0;
      }
    },
    // 切换到周视图
    switchToWeek() {
      if (this.monthOpen) {
        this.monthOpen = false;
        this.updateSelectedDateToCurrentMonth();
        this.updateWeekPosition();
      }
    },
    // 更新周视图位置
    updateWeekPosition() {
      let index = -1;
      if (!this.selectedDate) {
        let today = /* @__PURE__ */ new Date();
        this.selectedDate = {
          year: today.getFullYear(),
          month: today.getMonth(),
          date: today.getDate()
        };
      }
      this.updateSelectedDateToCurrentMonth();
      this.dates.forEach((item, x) => {
        if (item.year === this.selectedDate.year && item.month === this.selectedDate.month && item.date === this.selectedDate.date && item.lm) {
          index = x;
        }
      });
      if (index === -1) {
        this.dates.forEach((item, x) => {
          if (this.isToday(item.year, item.month, item.date) && item.lm) {
            index = x;
          }
        });
      }
      if (index === -1) {
        index = 0;
        for (let i = 0; i < this.dates.length; i++) {
          if (this.dates[i].lm) {
            index = i;
            break;
          }
        }
      }
      this.currentWeekIndex = Math.floor(index / 7);
      this.positionTop = -(this.currentWeekIndex * 80);
    },
    // 点击回调
    selectOne(i, event) {
      let date = `${i.year}-${i.month + 1}-${i.date}`;
      let selectD = new Date(date);
      this.selectedDate = {
        year: i.year,
        month: i.month,
        date: i.date
      };
      if (selectD.getMonth() != this.m) {
        this.y = i.year;
        this.m = i.month;
        this.dates = this.monthDay(this.y, this.m);
      }
      this.choose = date;
      if (!this.monthOpen) {
        this.updateWeekPosition();
      }
      this.$emit("on-click", {
        date,
        year: i.year,
        month: i.month + 1,
        day: i.date,
        isToday: this.isToday(i.year, i.month, i.date)
      });
    },
    changeYM() {
      this.$refs["date-time"].show();
    },
    dateTimeChange(value) {
      this.$emit("year-month-change", value);
      let time = value.split("-");
      this.y = time[0];
      this.m = parseInt(time[1]) - 1;
      this.dates = this.monthDay(this.y, this.m);
      if (!this.monthOpen) {
        this.updateWeekPosition();
      }
      this.positionTop = 0;
      this.updateSelectedDateToCurrentMonth();
    },
    // 上个月/周，下个月/周 - 智能导航
    turning(_action) {
      if (this.monthOpen) {
        this.turningByMonth(_action);
      } else {
        this.turningByWeek(_action);
      }
    },
    // 按月导航
    turningByMonth(_action) {
      if (_action === "next") {
        if (this.m + 1 == 12) {
          this.m = 0;
          this.y = this.y + 1;
        } else {
          this.m = this.m + 1;
        }
      } else {
        if (this.m + 1 == 1) {
          this.m = 11;
          this.y = this.y - 1;
        } else {
          this.m = this.m - 1;
        }
      }
      this.dates = this.monthDay(this.y, this.m);
      this.positionTop = 0;
      this.updateSelectedDateToCurrentMonth();
      this.$emit("month-change", {
        year: this.y,
        month: this.m + 1
      });
    },
    // 按周导航
    turningByWeek(_action) {
      let currentWeekFirstDay = this.getCurrentWeekFirstDay();
      if (_action === "next") {
        currentWeekFirstDay.setDate(currentWeekFirstDay.getDate() + 7);
      } else {
        currentWeekFirstDay.setDate(currentWeekFirstDay.getDate() - 7);
      }
      let newYear = currentWeekFirstDay.getFullYear();
      let newMonth = currentWeekFirstDay.getMonth();
      if (newYear !== this.y || newMonth !== this.m) {
        this.y = newYear;
        this.m = newMonth;
        this.dates = this.monthDay(this.y, this.m);
        this.$emit("month-change", {
          year: this.y,
          month: this.m + 1
        });
      }
      if (this.selectedDate) {
        let selectedWeekDay = new Date(
          this.selectedDate.year,
          this.selectedDate.month,
          this.selectedDate.date
        ).getDay();
        let newSelectedDate = new Date(currentWeekFirstDay);
        newSelectedDate.setDate(
          currentWeekFirstDay.getDate() + (selectedWeekDay === 0 ? 6 : selectedWeekDay - 1)
        );
        this.selectedDate = {
          year: newSelectedDate.getFullYear(),
          month: newSelectedDate.getMonth(),
          date: newSelectedDate.getDate()
        };
        this.choose = "";
      }
      this.updateWeekPosition();
    },
    // 获取当前周的第一天（周一）
    getCurrentWeekFirstDay() {
      let referenceDate;
      if (this.selectedDate) {
        referenceDate = new Date(
          this.selectedDate.year,
          this.selectedDate.month,
          this.selectedDate.date
        );
      } else {
        referenceDate = /* @__PURE__ */ new Date();
      }
      let dayOfWeek = referenceDate.getDay();
      let daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      let monday = new Date(referenceDate);
      monday.setDate(referenceDate.getDate() - daysToMonday);
      return monday;
    },
    // 更新选中日期到当前月份（用于月份切换后保持合理的选中状态）
    updateSelectedDateToCurrentMonth() {
      if (!this.selectedDate) {
        this.selectedDate = {
          year: this.y,
          month: this.m,
          date: 1
        };
        return;
      }
      if (this.selectedDate.year !== this.y || this.selectedDate.month !== this.m) {
        let maxDate = new Date(this.y, this.m + 1, 0).getDate();
        let newDate = Math.min(this.selectedDate.date, maxDate);
        this.selectedDate = {
          year: this.y,
          month: this.m,
          date: newDate
        };
        this.choose = "";
      }
    },
    // 获取日期下方的显示文本（21日显示为21）
    getSubText(item) {
      if (this.isToday(item.year, item.month, item.date)) {
        return "今";
      }
      return "";
    },
    // 点击今日计划
    onTodayPlanClick() {
      this.$emit("today-plan-click");
      let date = /* @__PURE__ */ new Date();
      let y = date.getFullYear();
      let m = date.getMonth();
      let d = date.getDate();
      if (this.y !== y || this.m !== m) {
        this.y = y;
        this.m = m;
        this.dates = this.monthDay(this.y, this.m);
      }
      this.choose = `${y}-${m + 1}-${d}`;
      this.selectedDate = {
        year: y,
        month: m,
        date: d
      };
      if (!this.monthOpen) {
        this.updateWeekPosition();
      }
    },
    // 图片加载错误处理
    onImageError(e) {
      common_vendor.index.__f__("log", "at components/fd-EmbedCalendar/fd-EmbedCalendar.vue:590", "头像加载失败:", e);
    }
  }
};
if (!Array) {
  const _component_jpTimePicker = common_vendor.resolveComponent("jpTimePicker");
  _component_jpTimePicker();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $props.showTopSection
  }, $props.showTopSection ? {
    b: common_vendor.t($props.greetingText),
    c: $props.bgcolorGreeting,
    d: common_vendor.o((...args) => $options.onTodayPlanClick && $options.onTodayPlanClick(...args))
  } : {}, {
    e: common_vendor.t($data.y),
    f: common_vendor.t($data.m + 1),
    g: common_vendor.o((...args) => $options.changeYM && $options.changeYM(...args)),
    h: common_vendor.o(($event) => $options.turning("prev")),
    i: $data.monthOpen ? 1 : "",
    j: common_vendor.o((...args) => $options.switchToMonth && $options.switchToMonth(...args)),
    k: !$data.monthOpen ? 1 : "",
    l: common_vendor.o((...args) => $options.switchToWeek && $options.switchToWeek(...args)),
    m: common_vendor.o(($event) => $options.turning("next")),
    n: common_vendor.f($options.weekDay, (item, index, i0) => {
      return {
        a: common_vendor.t(item),
        b: index
      };
    }),
    o: common_vendor.f($data.dates, (item, index, i0) => {
      return {
        a: common_vendor.t(item.date),
        b: $data.choose == `${item.year}-${item.month + 1}-${item.date}` ? 1 : "",
        c: $options.isToday(item.year, item.month, item.date) && item.lm ? 1 : "",
        d: $options.isSigned(item.year, item.month + 1, item.date) && item.lm ? 1 : "",
        e: !item.lm ? 1 : "",
        f: index,
        g: !item.lm ? 1 : "",
        h: common_vendor.o(($event) => $options.selectOne(item, $event), index)
      };
    }),
    p: `translateY(${$data.positionTop}rpx)`,
    q: !$data.monthOpen ? 1 : "",
    r: common_vendor.sr("date-time", "72eca62a-0"),
    s: common_vendor.o($options.dateTimeChange),
    t: common_vendor.p({
      datestype: "year-month",
      datestring: $data.dateString
    })
  });
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-72eca62a"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/components/fd-EmbedCalendar/fd-EmbedCalendar.js.map
