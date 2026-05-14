// 格式化工具

// 日期格式化
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

// 数字格式化（千分位）
const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 金额格式化
const formatMoney = (amount, decimals = 2) => {
  if (amount === null || amount === undefined) return '¥0.00';
  const formatted = parseFloat(amount).toFixed(decimals);
  return '¥' + formatNumber(formatted);
};

// 手机号格式化（隐藏中间4位）
const formatPhone = (phone) => {
  if (!phone) return '';
  const phoneStr = phone.toString();
  if (phoneStr.length !== 11) return phoneStr;
  return phoneStr.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

// 身份证号格式化（隐藏中间部分）
const formatIdCard = (idCard) => {
  if (!idCard) return '';
  const idCardStr = idCard.toString();
  if (idCardStr.length !== 18) return idCardStr;
  return idCardStr.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
};

// 字符串截断
const truncate = (str, length = 20, suffix = '...') => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
};

module.exports = {
  formatDate,
  formatNumber,
  formatMoney,
  formatPhone,
  formatIdCard,
  truncate
};