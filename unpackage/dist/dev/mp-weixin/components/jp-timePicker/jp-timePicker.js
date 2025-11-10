"use strict";
const common_vendor = require("../../common/vendor.js");
const components_jpTimePicker_uitls_util = require("./uitls/util.js");
const _sfc_main = {
  name: "jp-timePicker",
  props: {
    startYear: {
      type: Number,
      default: 1900
    },
    endYear: {
      type: Number,
      default: (/* @__PURE__ */ new Date()).getFullYear()
    },
    datestring: {
      type: String,
      default: ""
    },
    datestype: {
      type: String,
      default: "year"
    }
  },
  data() {
    return {
      formatDateArrays: [],
      visible: false,
      dateTime: [],
      days: [],
      indicatorStyle: { background: "rgba(255,0,0,.1)", height: "40px", color: "rgb(250,80,80) !important" },
      indicatorStyleString: "",
      type: "year"
    };
  },
  watch: {
    datestype() {
      this.type = this.datestype;
    },
    indicatorStyle(val) {
      this.getIndicatorStyle();
    },
    type() {
      this.initDateTime();
    },
    datestring() {
      this.initDateTime();
    }
  },
  computed: {
    years() {
      return this.initTimeData(this.endYear, this.startYear);
    },
    isShowYear() {
      return this.type !== "time" && this.type !== "hour-minute";
    },
    months() {
      return this.initTimeData(12, 1);
    },
    isShowMonth() {
      return this.type !== "year" && this.type !== "time" && this.type !== "hour-minute";
    },
    isShowDay() {
      return this.type === "date" || this.type === "datetime" || this.type === "datetime-all";
    },
    hours() {
      return this.initTimeData(23, 0);
    },
    isShowHour() {
      return this.type !== "date" && this.type !== "year-month" && this.type !== "year";
    },
    minutes() {
      return this.initTimeData(59, 0);
    },
    isShowMinute() {
      return this.type !== "date" && this.type !== "year-month" && this.type !== "year";
    },
    seconds() {
      return this.initTimeData(59, 0);
    },
    isShowSecond() {
      return this.type === "datetime-all" || this.type === "time";
    }
  },
  methods: {
    gettype(type) {
      this.type = type;
    },
    getIndicatorStyle() {
      if (this.indicatorStyle) {
        for (let key in this.indicatorStyle) {
          this.indicatorStyleString += `${key}:${this.indicatorStyle[key]};`;
        }
      }
    },
    handleEvent() {
      return;
    },
    cancel() {
      this.hide();
    },
    confirm() {
      this.formatDate("confirm");
      this.hide();
    },
    show() {
      this.visible = true;
    },
    hide() {
      this.visible = false;
    },
    initDateTime() {
      let value;
      if (this.datestring.length > 0) {
        if (this.type === "year") {
          value = new Date(this.datestring, 0);
        } else if (this.type === "time" || this.type === "hour-minute") {
          let date = /* @__PURE__ */ new Date();
          let ary = this.datestring.split(":");
          ary.forEach((item, index) => {
            if (index == 0) {
              date.setHours(item);
            } else if (index == 1) {
              date.setMinutes(item);
            } else if (index == 2) {
              date.setSeconds(item);
            }
          });
          value = date;
        } else {
          value = new Date(this.datestring.replace(/-/g, "/"));
        }
      } else {
        value = /* @__PURE__ */ new Date();
      }
      let len, timeArray;
      let array = components_jpTimePicker_uitls_util.getTimeArray(value);
      let [year, month, day, hour, minute, second] = array;
      this.days = this.initTimeData(components_jpTimePicker_uitls_util.getOneMonthDays(year, month - 1), 1);
      let names = ["year", "month", "day", "hour", "minute", "second"];
      switch (this.type) {
        case "date":
          len = 3;
          break;
        case "year-month":
          len = 2;
          break;
        case "year":
          len = 1;
          break;
        case "datetime":
          len = 5;
          break;
        case "datetime-all":
          len = 6;
          break;
        case "time":
          len = 3;
          break;
        case "hour-minute":
          len = 2;
          break;
      }
      timeArray = new Array(len).fill(0);
      if (this.type === "time" || this.type === "hour-minute") {
        names = names.slice(3);
        array = array.slice(3);
      }
      timeArray = timeArray.map((item, index) => {
        const name = names[index];
        return components_jpTimePicker_uitls_util.getIndexOfArray(array[index], this[name + "s"]);
      });
      this.dateTime = timeArray;
      if (this.type === "date" || this.type === "year-month" || this.type === "year") {
        this.formatDateArrays = this.dateTime.map((item, index) => {
          return this[names[index] + "s"][item] < 10 ? components_jpTimePicker_uitls_util.addZero(this[names[index] + "s"][item]) : this[names[index] + "s"][item];
        });
      }
      common_vendor.index.__f__("log", "at components/jp-timePicker/jp-timePicker.vue:215", this.formatDateArrays);
    },
    initTimeData(end, start) {
      let timeArray = [];
      while (start <= end) {
        timeArray.push(start);
        start++;
      }
      return timeArray;
    },
    formatDate(type) {
      let names = ["year", "month", "day", "hour", "minute", "second"];
      let dateString, formatDateArray = [];
      if (this.type === "date" || this.type === "year-month" || this.type === "year") {
        formatDateArray = this.dateTime.map((item, index) => {
          return this[names[index] + "s"][item] < 10 ? components_jpTimePicker_uitls_util.addZero(this[names[index] + "s"][item]) : this[names[index] + "s"][item];
        });
        dateString = formatDateArray.join("-");
      }
      if (type) {
        this.$emit(type, dateString);
      }
      this.$emit("change", dateString);
    },
    dateTimePickerChange(e) {
      let columns = e.target.value;
      if (this.type === "date" || this.type === "datetime" || this.type === "datetime-all") {
        this.dateTime.splice(0, 1, columns[0]);
        if (columns[0] != this.dateTime[0]) {
          this.days = this.initTimeData(components_jpTimePicker_uitls_util.getOneMonthDays(this.years[this.dateTime[0]], this.months[this.dateTime[1]]), 1);
          if (this.dateTime[1] == 1) {
            if (this.dateTime[2] === this.days.length - 1) {
              if (components_jpTimePicker_uitls_util.getOneMonthDays(this.years[columns[0]], this.dateTime[1]) < components_jpTimePicker_uitls_util.getOneMonthDays(this.years[this.dateTime[0]], this.dateTime[1])) {
                this.dateTime.splice(2, 1, this.days.length - 1);
              }
            }
          }
        } else {
          this.dateTime.splice(1, 1, columns[1]);
          this.days = this.initTimeData(components_jpTimePicker_uitls_util.getOneMonthDays(this.years[this.dateTime[0]], this.dateTime[1]), 1);
          if (columns[1] != this.dateTime[1]) {
            if (this.dateTime[1] == 1) {
              if (this.dateTime[2] === this.days.length - 1) {
                if (components_jpTimePicker_uitls_util.getOneMonthDays(this.years[columns[0]], this.dateTime[1]) < components_jpTimePicker_uitls_util.getOneMonthDays(
                  this.years[this.dateTime[0]],
                  this.dateTime[1]
                )) {
                  this.dateTime.splice(2, 1, this.days.length - 1);
                }
              }
            } else {
              if (this.dateTime[2] > this.days.length - 1) {
                this.dateTime.splice(2, 1, this.days.length - 1);
              } else {
                this.dateTime.splice(2, 1, columns[2]);
              }
            }
          } else {
            this.dateTime.splice(2, 1, columns[2]);
          }
        }
        if (columns.length > 2) {
          columns.splice(3).forEach((column, index) => {
            this.dateTime.splice(index + 3, 1, column);
          });
        }
      } else {
        columns.forEach((column, index) => {
          this.dateTime.splice(index, 1, column);
        });
      }
      if (!this.isShowToolBar) {
        this.formatDate();
      }
      let names = ["year", "month", "day", "hour", "minute", "second"];
      this.formatDateArrays = [];
      if (this.type === "date" || this.type === "year-month" || this.type === "year") {
        this.formatDateArrays = this.dateTime.map((item, index) => {
          return this[names[index] + "s"][item] < 10 ? components_jpTimePicker_uitls_util.addZero(this[names[index] + "s"][item]) : this[names[index] + "s"][item];
        });
      }
      common_vendor.index.__f__("log", "at components/jp-timePicker/jp-timePicker.vue:295", this.formatDateArrays);
    }
  },
  mounted() {
    this.type = this.datestype;
    this.getIndicatorStyle();
    this.initDateTime();
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.visible
  }, $data.visible ? common_vendor.e({
    b: common_vendor.o((...args) => $options.hide && $options.hide(...args)),
    c: common_vendor.o((...args) => $options.cancel && $options.cancel(...args)),
    d: common_vendor.o((...args) => $options.confirm && $options.confirm(...args)),
    e: $options.isShowYear
  }, $options.isShowYear ? {
    f: common_vendor.f($options.years, (item, index, i0) => {
      return {
        a: common_vendor.t(item),
        b: index,
        c: common_vendor.s($data.formatDateArrays[0] == item ? "color: rgb(250,80,80)" : "")
      };
    })
  } : {}, {
    g: $options.isShowMonth
  }, $options.isShowMonth ? {
    h: common_vendor.f($options.months, (item, index, i0) => {
      return {
        a: common_vendor.t(item),
        b: index,
        c: common_vendor.s($data.formatDateArrays[1] == item ? "color: rgb(250,80,80)" : "")
      };
    })
  } : {}, {
    i: $options.isShowDay
  }, $options.isShowDay ? {
    j: common_vendor.f($data.days, (item, index, i0) => {
      return {
        a: common_vendor.t(item),
        b: index,
        c: common_vendor.s($data.formatDateArrays[2] == item ? "color: rgb(250,80,80)" : "")
      };
    })
  } : {}, {
    k: $data.indicatorStyleString,
    l: $data.dateTime,
    m: common_vendor.o((...args) => $options.dateTimePickerChange && $options.dateTimePickerChange(...args)),
    n: common_vendor.o((...args) => $options.handleEvent && $options.handleEvent(...args))
  }) : {});
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-60fae6bc"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/components/jp-timePicker/jp-timePicker.js.map
