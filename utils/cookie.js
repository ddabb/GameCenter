// Cookie解析工具

// 设置Cookie
const setCookie = (name, value, options = {}) => {
  let cookieStr = `${name}=${encodeURIComponent(value)}`;
  
  if (options.expires) {
    const expires = new Date(options.expires);
    cookieStr += `; expires=${expires.toUTCString()}`;
  }
  
  if (options.path) {
    cookieStr += `; path=${options.path}`;
  }
  
  if (options.domain) {
    cookieStr += `; domain=${options.domain}`;
  }
  
  if (options.secure) {
    cookieStr += '; secure';
  }
  
  document.cookie = cookieStr;
};

// 获取Cookie
const getCookie = (name) => {
  const cookieStr = document.cookie;
  const cookies = cookieStr.split('; ');
  
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  
  return null;
};

// 删除Cookie
const deleteCookie = (name, options = {}) => {
  setCookie(name, '', {
    ...options,
    expires: new Date(0)
  });
};

// 解析Cookie字符串
const parseCookie = (cookieStr) => {
  const cookies = {};
  if (!cookieStr) return cookies;
  
  const cookieArray = cookieStr.split('; ');
  for (const cookie of cookieArray) {
    const [name, value] = cookie.split('=');
    cookies[name] = decodeURIComponent(value);
  }
  
  return cookies;
};

// 序列化Cookie对象
const serializeCookie = (cookies) => {
  const cookieArray = [];
  for (const [name, value] of Object.entries(cookies)) {
    cookieArray.push(`${name}=${encodeURIComponent(value)}`);
  }
  return cookieArray.join('; ');
};

module.exports = {
  setCookie,
  getCookie,
  deleteCookie,
  parseCookie,
  serializeCookie
};