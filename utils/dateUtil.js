/**
 * 日期处理工具类
 */

/**
 * 格式化日期
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  const map = {
    'YYYY': year, 'YY': String(year).slice(-2),
    'MM': String(month).padStart(2, '0'), 'M': month,
    'DD': String(day).padStart(2, '0'), 'D': day,
    'HH': String(hours).padStart(2, '0'), 'H': hours,
    'mm': String(minutes).padStart(2, '0'), 'm': minutes,
    'ss': String(seconds).padStart(2, '0'), 's': seconds
  };
  return format.replace(/(YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s)/g, match => map[match]);
}

/**
 * 格式化时间
 */
function formatTime(seconds, format = 'HH:mm:ss') {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const map = {
    'HH': String(hours).padStart(2, '0'), 'H': hours,
    'mm': String(minutes).padStart(2, '0'), 'm': minutes,
    'ss': String(secs).padStart(2, '0'), 's': secs
  };
  return format.replace(/(HH|H|mm|m|ss|s)/g, match => map[match]);
}

/**
 * 计算两个日期之间的天数差
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * 判断是否为闰年
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * 获取月份天数
 */
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * 获取星期几
 */
function getWeekDay(date, short = false) {
  const d = new Date(date);
  const days = short ? ['日', '一', '二', '三', '四', '五', '六'] : ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return days[d.getDay()];
}

/**
 * 日期加减天数
 */
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * 日期加减月份
 */
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * 获取年龄
 */
function getAge(birthDate) {
  const birth = new Date(birthDate);
  const today = new Date();
  if (isNaN(birth.getTime())) return 0;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

module.exports = {
  formatDate,
  formatTime,
  daysBetween,
  isLeapYear,
  getDaysInMonth,
  getWeekDay,
  addDays,
  addMonths,
  getAge
};
