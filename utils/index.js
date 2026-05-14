/**
 * 全局工具函数统一导出（平台兼容版）
 * 同时支持微信小程序和鸿蒙系统
 * 
 * 使用方式：
 * const utils = require('../../utils');
 * // 或从主包调用
 * const utils = require('utils');
 */

// Toast轻提示
const toast = require('./toast');

// Modal对话框
const modal = require('./modal');

// 存储工具
const storage = require('./storage');

// 验证工具
const validator = require('./validator');

// 日期工具
const dateUtil = require('./dateUtil');



// 图片生成工具
const imageGenerator = require('./imageGenerator');

// 网络请求工具
const http = require('./http');

// 格式化工具
const format = require('./format');

// Cookie工具
const cookie = require('./cookie');

// 防抖节流工具
const { debounce, throttle } = require('./debounce');

// 基础工具
const util = require('./util');

// 字体加载工具
const fontLoader = require('./fontLoader');

// 音效管理器
const sound = require('./sound-manager');

/**
 * 合并导出所有工具
 */
module.exports = {
  // Toast相关
  showSuccess: toast.showSuccess,
  showError: toast.showError,
  showWarning: toast.showWarning,
  showLoading: toast.showLoading,
  hideLoading: toast.hideLoading,
  showText: toast.showText,
  showToast: toast.showToast,
  
  // Modal对话框
  showConfirm: modal.showConfirm,
  showAlert: modal.showAlert,
  showErrorDialog: modal.showErrorDialog,
  
  // 存储相关（异步）
  setStorage: storage.setStorage,
  getStorage: storage.getStorage,
  removeStorage: storage.removeStorage,
  clearStorage: storage.clearStorage,
  getStorageInfo: storage.getStorageInfo,
  
  // 存储相关（同步，仅微信）
  getStorageSync: storage.getStorageSync,
  
  // 验证相关
  isValidNumber: validator.isValidNumber,
  isValidLength: validator.isValidLength,
  isValidDate: validator.isValidDate,
  isValidIdCardFormat: validator.isValidIdCardFormat,
  isValidPhone: validator.isValidPhone,
  isValidEmail: validator.isValidEmail,
  isValidUrl: validator.isValidUrl,
  isEmpty: validator.isEmpty,
  
  // 日期相关
  ...dateUtil,
  

  
  // 图片生成相关
  imageGenerator: imageGenerator,
  drawBackground: imageGenerator.drawBackground,
  drawText: imageGenerator.drawText,
  drawQRCode: imageGenerator.drawQRCode,
  drawFrom: imageGenerator.drawFrom,
  drawDate: imageGenerator.drawDate,
  exportImage: imageGenerator.exportImage,
  saveToAlbum: imageGenerator.saveToAlbum,
  
  // 基础工具
  formatTime: util.formatTime,
  
  // 网络请求工具
  http: http,
  request: http.request,
  get: http.get,
  post: http.post,
  put: http.put,
  delete: http.delete,
  
  // 格式化工具
  format: format,
  formatDate: format.formatDate,
  formatNumber: format.formatNumber,
  formatMoney: format.formatMoney,
  formatPhone: format.formatPhone,
  formatIdCard: format.formatIdCard,
  truncate: format.truncate,
  
  // Cookie工具
  cookie: cookie,
  setCookie: cookie.setCookie,
  getCookie: cookie.getCookie,
  deleteCookie: cookie.deleteCookie,
  parseCookie: cookie.parseCookie,
  serializeCookie: cookie.serializeCookie,
  
  // 防抖节流工具
  debounce: debounce,
  throttle: throttle,
  
  // 版本信息
  VERSION: '1.0.0',
  
  // 字体加载工具
  fontLoader: fontLoader,
  loadFonts: fontLoader.loadFonts,
  preloadCoreFonts: fontLoader.preloadCoreFonts,

  // 音效管理器
  sound: sound,
  playSound: sound.playSound,
  preloadSounds: sound.preloadSounds,
  soundClearCache: sound.clearCache,
  soundCacheSize: sound.getCacheSize,
  isPageSoundEnabled: sound.isPageSoundEnabled,
  setPageSoundEnabled: sound.setPageSoundEnabled
};
