"use strict";
const getOneMonthDays = (year, month) => {
  month = Number(month);
  const baseMonthsDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)) {
    if (month === 2) {
      baseMonthsDays[month] = 29;
    }
  }
  return baseMonthsDays[month];
};
const getTimeArray = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  return [year, month, day, hour, minute, second];
};
const addZero = (num) => {
  return num < 10 ? "0" + num : num;
};
const getIndexOfArray = (value, array) => {
  let index = array.findIndex((item) => item == value);
  return index > -1 ? index : 0;
};
exports.addZero = addZero;
exports.getIndexOfArray = getIndexOfArray;
exports.getOneMonthDays = getOneMonthDays;
exports.getTimeArray = getTimeArray;
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/components/jp-timePicker/uitls/util.js.map
