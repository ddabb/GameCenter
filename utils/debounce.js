// 防抖和节流工具

// 防抖函数
const debounce = (func, wait, immediate = false) => {
  let timeout;
  
  return function(...args) {
    const context = this;
    
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
};

// 节流函数
const throttle = (func, wait, options = {}) => {
  let timeout;
  let lastExecTime = 0;
  const { leading = true, trailing = true } = options;
  
  return function(...args) {
    const context = this;
    const now = Date.now();
    
    if (!lastExecTime && !leading) lastExecTime = now;
    
    const remaining = wait - (now - lastExecTime);
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastExecTime = now;
      func.apply(context, args);
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        lastExecTime = leading ? Date.now() : 0;
        timeout = null;
        func.apply(context, args);
      }, remaining);
    }
  };
};

module.exports = {
  debounce,
  throttle
};