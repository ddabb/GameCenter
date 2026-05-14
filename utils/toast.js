/**
 * Toast 轻提示工具（平台兼容版）
 * 同时支持微信小程序和鸿蒙系统
 */

// 检测运行环境
const isHarmonyOS = typeof ohos !== 'undefined' || (typeof window !== 'undefined' && typeof window.$element !== 'undefined');

/**
 * 显示成功提示
 * @param {string} title - 提示文字
 * @param {number} duration - 显示时长(ms)，默认1500
 */
function showSuccess(title, duration = 1500) {
  if (isHarmonyOS) {
    ohos.prompt.showToast({
      message: title,
      duration: duration
    });
  } else {
    wx.showToast({
      title,
      icon: 'success',
      duration
    });
  }
}

/**
 * 显示失败提示
 * @param {string} title - 提示文字
 * @param {number} duration - 显示时长(ms)，默认1500
 */
function showError(title, duration = 1500) {
  if (isHarmonyOS) {
    ohos.prompt.showToast({
      message: title,
      duration: duration
    });
  } else {
    wx.showToast({
      title,
      icon: 'error',
      duration
    });
  }
}

/**
 * 显示警告提示
 * @param {string} title - 提示文字
 * @param {number} duration - 显示时长(ms)，默认1500
 */
function showWarning(title, duration = 1500) {
  if (isHarmonyOS) {
    ohos.prompt.showToast({
      message: title,
      duration: duration
    });
  } else {
    wx.showToast({
      title,
      icon: 'none',
      duration
    });
  }
}

/**
 * 显示加载提示
 * @param {string} title - 提示文字，默认"加载中..."
 * @param {boolean} mask - 是否显示遮罩层，默认false
 */
function showLoading(title = '加载中...', mask = false) {
  if (isHarmonyOS) {
    ohos.prompt.showToast({
      message: title,
      duration: 0
    });
  } else {
    wx.showLoading({
      title,
      mask
    });
  }
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  if (isHarmonyOS) {
    ohos.prompt.showToast({
      message: '',
      duration: 0
    });
  } else {
    wx.hideLoading();
  }
}

/**
 * 显示纯文字提示
 * @param {string} title - 提示文字
 * @param {number} duration - 显示时长(ms)，默认1500
 */
function showText(title, duration = 1500) {
  if (isHarmonyOS) {
    ohos.prompt.showToast({
      message: title,
      duration: duration
    });
  } else {
    wx.showToast({
      title,
      icon: 'none',
      duration
    });
  }
}

module.exports = {
  showSuccess,
  showError,
  showWarning,
  showLoading,
  hideLoading,
  showText,
  showToast: showText  // 别名
};
