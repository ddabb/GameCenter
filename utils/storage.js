/**
 * 本地存储工具类（平台兼容版）
 * 同时支持微信小程序和鸿蒙系统
 */

// 检测运行环境
const isHarmonyOS = typeof ohos !== 'undefined' || (typeof window !== 'undefined' && typeof window.$element !== 'undefined');

// 鸿蒙存储API
let storage = null;
if (isHarmonyOS) {
  storage = require('@system.storage');
}

/**
 * 设置本地存储
 * @param {string} key - 键名
 * @param {any} value - 值
 * @returns {Promise<boolean>}
 */
function setStorage(key, value) {
  return new Promise((resolve) => {
    try {
      if (isHarmonyOS) {
        storage.set({
          key,
          value: JSON.stringify(value),
          success: () => resolve(true),
          fail: () => resolve(false)
        });
      } else {
        wx.setStorageSync(key, value);
        resolve(true);
      }
    } catch (e) {
      console.error('存储失败:', e);
      resolve(false);
    }
  });
}

/**
 * 获取本地存储
 * @param {string} key - 键名
 * @param {any} defaultValue - 默认值
 * @returns {Promise<any>}
 */
function getStorage(key, defaultValue = null) {
  return new Promise((resolve) => {
    try {
      if (isHarmonyOS) {
        storage.get({
          key,
          success: (data) => {
            try {
              resolve(data ? JSON.parse(data) : defaultValue);
            } catch {
              resolve(data || defaultValue);
            }
          },
          fail: () => resolve(defaultValue)
        });
      } else {
        const value = wx.getStorageSync(key);
        resolve(value !== '' ? value : defaultValue);
      }
    } catch (e) {
      console.error('获取存储失败:', e);
      resolve(defaultValue);
    }
  });
}

/**
 * 获取本地存储（同步版本，微信专用）
 * @param {string} key - 键名
 * @param {any} defaultValue - 默认值
 * @returns {any}
 */
function getStorageSync(key, defaultValue = null) {
  try {
    const value = wx.getStorageSync(key);
    return value !== '' ? value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * 删除本地存储
 * @param {string} key - 键名
 * @returns {Promise<boolean>}
 */
function removeStorage(key) {
  return new Promise((resolve) => {
    try {
      if (isHarmonyOS) {
        storage.delete({
          key,
          success: () => resolve(true),
          fail: () => resolve(false)
        });
      } else {
        wx.removeStorageSync(key);
        resolve(true);
      }
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * 清空本地存储
 * @returns {Promise<boolean>}
 */
function clearStorage() {
  return new Promise((resolve) => {
    try {
      if (isHarmonyOS) {
        storage.clear({
          success: () => resolve(true),
          fail: () => resolve(false)
        });
      } else {
        wx.clearStorageSync();
        resolve(true);
      }
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * 获取存储信息
 * @returns {Promise<object>}
 */
function getStorageInfo() {
  return new Promise((resolve) => {
    if (isHarmonyOS) {
      storage.getAll({
        success: (data) => {
          resolve({ keys: data || [], currentSize: 0, limitSize: 0 });
        },
        fail: () => {
          resolve({ keys: [], currentSize: 0, limitSize: 0 });
        }
      });
    } else {
      try {
        resolve(wx.getStorageInfoSync());
      } catch (e) {
        resolve({ keys: [], currentSize: 0, limitSize: 0 });
      }
    }
  });
}

module.exports = {
  setStorage,
  getStorage,
  getStorageSync,
  removeStorage,
  clearStorage,
  getStorageInfo
};
