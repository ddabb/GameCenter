/**
 * Modal 对话框工具（平台兼容版）
 * 同时支持微信小程序和鸿蒙系统
 */

// 检测运行环境
const isHarmonyOS = typeof ohos !== 'undefined' || (typeof window !== 'undefined' && typeof window.$element !== 'undefined');

/**
 * 显示确认对话框
 * @param {object} options - 配置项
 * @returns {Promise}
 */
function showConfirm(options = {}) {
  return new Promise((resolve) => {
    const {
      title = '提示',
      content = '',
      confirmText = '确定',
      cancelText = '取消',
      showCancel = true
    } = options;

    if (isHarmonyOS) {
      ohos.prompt.showDialog({
        title,
        message: content,
        buttons: [
          { text: cancelText, color: '#666666' },
          { text: confirmText, color: '#1890ff' }
        ],
        success: (data) => {
          // 鸿蒙的buttons索引：0=取消, 1=确定
          resolve(data.index === 1);
        },
        fail: () => {
          resolve(false);
        }
      });
    } else {
      wx.showModal({
        title,
        content,
        confirmText,
        cancelText,
        showCancel,
        success: (res) => {
          resolve(res.confirm);
        },
        fail: () => {
          resolve(false);
        }
      });
    }
  });
}

/**
 * 显示alert警告框
 * @param {string} content - 内容
 * @param {string} title - 标题
 * @returns {Promise}
 */
function showAlert(content, title = '提示') {
  return new Promise((resolve) => {
    if (isHarmonyOS) {
      ohos.prompt.showDialog({
        title,
        message: content,
        buttons: [{ text: '我知道了', color: '#1890ff' }],
        success: () => {
          resolve(true);
        },
        fail: () => {
          resolve(false);
        }
      });
    } else {
      wx.showModal({
        title,
        content,
        showCancel: false,
        confirmText: '我知道了',
        success: () => {
          resolve(true);
        }
      });
    }
  });
}

/**
 * 显示错误确认框
 * @param {string} content - 内容
 * @returns {Promise}
 */
function showErrorDialog(content) {
  return showAlert(content, '错误');
}

module.exports = {
  showConfirm,
  showAlert,
  showErrorDialog
};
