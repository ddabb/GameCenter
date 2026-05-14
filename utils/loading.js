/**
 * 全局加载状态管理工具
 */

// 加载实例池
const loadingInstances = new Map();

/**
 * 显示加载状态
 * @param {Object} options - 配置选项
 * @param {string} options.text - 加载文本
 * @param {boolean} options.mask - 是否显示遮罩
 * @param {string} options.id - 加载实例ID，用于区分不同的加载状态
 * @returns {string} 加载实例ID
 */
function showLoading(options = {}) {
  const { text = '加载中...', mask = true, id = 'default' } = options;
  
  // 隐藏同ID的加载状态
  if (loadingInstances.has(id)) {
    hideLoading(id);
  }
  
  // 显示加载状态
  wx.showLoading({
    title: text,
    mask: mask
  });
  
  // 记录加载实例
  loadingInstances.set(id, true);
  
  return id;
}

/**
 * 隐藏加载状态
 * @param {string} id - 加载实例ID
 */
function hideLoading(id = 'default') {
  if (loadingInstances.has(id)) {
    wx.hideLoading();
    loadingInstances.delete(id);
  }
}

/**
 * 隐藏所有加载状态
 */
function hideAllLoading() {
  loadingInstances.forEach((_, id) => {
    hideLoading(id);
  });
}

/**
 * 显示带自定义图标的加载状态
 * @param {Object} options - 配置选项
 * @param {string} options.text - 加载文本
 * @param {string} options.icon - 图标类型：success, loading, none
 * @param {number} options.duration - 显示时长（毫秒）
 */
function showToast(options = {}) {
  const { text = '操作成功', icon = 'success', duration = 2000 } = options;
  
  wx.showToast({
    title: text,
    icon: icon,
    duration: duration
  });
}

/**
 * 显示加载中的Toast
 * @param {string} text - 加载文本
 * @param {number} duration - 显示时长（毫秒）
 */
function showLoadingToast(text = '加载中...', duration = 3000) {
  wx.showToast({
    title: text,
    icon: 'loading',
    duration: duration,
    mask: true
  });
}

module.exports = {
  showLoading,
  hideLoading,
  hideAllLoading,
  showToast,
  showLoadingToast
};
