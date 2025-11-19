// 精确计算是否是整年
function isExactYears(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  // 如果月份和日期相同，直接计算年份差
  if (d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()) {
    return Math.abs(d1.getFullYear() - d2.getFullYear());
  }
  
  // 处理闰年2月29日的情况
  if (d1.getMonth() === 1 && d1.getDate() === 29 && 
      d2.getMonth() === 1 && d2.getDate() === 28) {
    // 2月29日对应非闰年的2月28日，也算整年
    const yearDiff = Math.abs(d1.getFullYear() - d2.getFullYear());
    return d1.getFullYear() % 4 === 0 || d2.getFullYear() % 4 === 0 ? yearDiff : 0;
  }
  
  return 0;
}

// 计算日期距离
function calculateDateDistance(targetDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(targetDateStr.replace(/-/g,'/'));
  targetDate.setHours(0, 0, 0, 0);
  
  // 计算天数差
  const timeDiff = targetDate.getTime() - today.getTime();
  const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));
  const absoluteDays = Math.abs(daysDiff);
  const isFuture = daysDiff > 0;
  
  // 检查是否是整年
  const exactYears = isExactYears(today, targetDate);
  
  let result = '';
  
  if (isFuture) {
    // 未来日期 - 倒计时
    result = `倒计时${absoluteDays}天`;
  } else {
    // 过去日期 - 距离今天
    if (exactYears > 0) {
      result = `距离今天${exactYears}年`;
    }else {
      result = `距离今天${absoluteDays}天`;
    }
  }
  
  return {
    date: targetDateStr,
    days: absoluteDays,
    isFuture: isFuture,
    exactYears: exactYears,
    displayText: result
  };
}


// 处理查询结果
export const processJQLResults=(issues) =>{
  
  
  return issues.map(issue => {
    const dateStr = issue.date; // 假设这是日期字段
    
    const distanceInfo = calculateDateDistance(dateStr);
    return {
      ...issue,
      distanceInfo: distanceInfo
    };
  }).filter(Boolean);
}

