"use strict";
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
  if (isFuture && absoluteDays > 0) {
    result = `倒计时${absoluteDays}天`;
  } else {
    if (exactYears > 0) {
      result = `距离今天${exactYears}年`;
    } else if (absoluteDays > 0) {
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
exports.processJQLResults = processJQLResults;
//# sourceMappingURL=../.sourcemap/mp-weixin/rili.js.map
