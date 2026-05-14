/**
 * 统一缓存管理器
 * 功能：
 * 1. LRU 容量管理（Storage 接近上限时自动淘汰最老的 cdn_ 缓存）
 * 2. 304 增量更新（If-Modified-Since 减少重复下载）
 * 3. 统一的智能写入（smartSet）
 * 4. 定点缓存清理（只清 cdn_ 前缀，不影响其他数据）
 * 5. 版本号管理（数据版本变化时自动清理旧缓存）
 */

// 引入数据版本号
const { DATA_VERSION } = require('../config/constants');

// Storage 上限 10MB，保留 3MB 余量
const MAX_CACHE_SIZE_KB = 7 * 1024;

// 版本号缓存键
const VERSION_KEY = 'cache_version';

/**
 * 检查并更新版本号，版本变化时清除旧缓存
 */
function checkVersion() {
  try {
    const currentVersion = wx.getStorageSync(VERSION_KEY);
    if (currentVersion !== DATA_VERSION) {
      // 版本变化，清除所有 cdn_ 缓存
      clearCdnCache();
      // 更新版本号
      wx.setStorageSync(VERSION_KEY, DATA_VERSION);
      console.debug('[cacheManager] 版本更新，已清除旧缓存:', currentVersion, '→', DATA_VERSION);
    }
  } catch (e) {
    // 版本检查失败，忽略
  }
}

/**
 * 智能写入：自动 LRU 淘汰后写入
 * @param {string} cacheKey  数据缓存 key
 * @param {*}     data       要缓存的数据
 * @param {string} [tsKey]   时间戳 key（不传则不写 ts）
 * @returns {boolean} 是否写入成功
 */
function smartSet(cacheKey, data, tsKey) {
  try {
    // 检查版本号
    checkVersion();
    
    const info = wx.getStorageInfoSync();
    const dataSizeKB = estimateSizeKB(data);
    const neededKB = dataSizeKB + (tsKey ? 1 : 0) + 1; // 余量 1KB

    // 容量不足时淘汰
    if (info.currentSize + neededKB > MAX_CACHE_SIZE_KB) {
      evictOldest(info.keys);
    }

    wx.setStorageSync(cacheKey, data);
    if (tsKey) {
      wx.setStorageSync(tsKey, Date.now());
    }
    return true;
  } catch (e) {
    // 写缓存失败（比如单文件过大），跳过
    return false;
  }
}

/**
 * 淘汰最老的 cdn_ 缓存（按时间戳排序，淘汰最旧的）
 */
function evictOldest(allKeys) {
  const cdnKeys = allKeys
    .filter(k => k.startsWith('cdn_'))
    .map(k => ({ key: k, ts: readTs(k + '_ts') }))
    .filter(item => item.ts > 0)
    .sort((a, b) => a.ts - b.ts); // 最老的在前

  if (cdnKeys.length === 0) return;

  const victim = cdnKeys[0].key;
  wx.removeStorageSync(victim);
  wx.removeStorageSync(victim + '_ts');
  console.debug('[cacheManager] LRU 淘汰:', victim);
}

/**
 * 读取时间戳，无效返回 0
 */
function readTs(tsKey) {
  try {
    const ts = wx.getStorageSync(tsKey);
    return typeof ts === 'number' ? ts : 0;
  } catch {
    return 0;
  }
}

/**
 * 估算数据大小（KB），json序列化后 / 1024
 */
function estimateSizeKB(data) {
  try {
    return Math.ceil(JSON.stringify(data).length / 1024);
  } catch {
    return 1;
  }
}

/**
 * 定点清理：只清除 cdn_ 前缀的缓存
 * 用于下拉刷新时替代 wx.clearStorageSync()
 */
function clearCdnCache(prefix) {
  try {
    const info = wx.getStorageInfoSync();
    const target = prefix ? `cdn_${prefix}` : 'cdn_';
    info.keys.forEach(key => {
      if (key.startsWith(target)) {
        wx.removeStorageSync(key);
      }
    });
  } catch (e) { /* ignore */ }
}

/**
 * 带 304 支持的缓存请求（核心方法）
 *
 * 策略：
 * 1. 版本号检查 → 确保缓存版本与当前数据版本一致
 * 2. 内存缓存 → Storage 缓存（TTL 内直接返回）
 * 3. Storage 过期或无缓存 → 发请求，带 If-Modified-Since
 *    - 304 → 缓存未变，延长 TTL，返回旧缓存（用户无感知）
 *    - 200 → 缓存已变，更新 Storage，返回新数据
 * 4. 无缓存直接 200 → 写入 Storage
 *
 * @param {object} opts
 * @param {string}   opts.cacheKey     数据 key
 * @param {string}   opts.tsKey        时间戳 key
 * @param {string}   opts.url          CDN URL
 * @param {number}   [opts.ttl]        TTL 毫秒，默认 7 天
 * @param {object}   [opts.memRef]      内存缓存引用，有值则直接返回
 * @returns {Promise<*>}  缓存数据
 */
function fetchWithCache(opts) {
  const {
    cacheKey, tsKey, url, ttl = 7 * 24 * 60 * 60 * 1000, memRef
  } = opts;
  const now = Date.now();

  // 检查版本号
  checkVersion();

  // 内存缓存优先
  if (memRef !== undefined && memRef !== null) {
    return Promise.resolve(memRef);
  }

  // Storage 缓存检查
  if (cacheKey && tsKey) {
    try {
      const cached = wx.getStorageSync(cacheKey);
      const ts = wx.getStorageSync(tsKey);
      if (cached && ts && (now - ts < ttl)) {
        // TTL 内：直接返回缓存，不发网络请求
        return Promise.resolve(cached);
      }
    } catch (e) { /* read fail */ }
  }

  // 缓存不存在或已过期：发网络请求
  return requestWith304(url, cacheKey, tsKey);
}

/**
 * 发送请求，尝试 304 优化
 */
function requestWith304(url, cacheKey, tsKey) {
  return new Promise((resolve, reject) => {
    const headers = {};

    // 有缓存记录时，带上 If-Modified-Since
    if (tsKey) {
      try {
        const oldTs = wx.getStorageSync(tsKey);
        if (oldTs) {
          headers['If-Modified-Since'] = new Date(oldTs).toUTCString();
        }
      } catch (e) { /* ignore */ }
    }

    wx.request({
      url,
      method: 'GET',
      timeout: 30000,
      header: headers,
      success: (res) => {
        if (res.statusCode === 304) {
          // 内容未变，延长 TTL，返回旧缓存
          if (tsKey) {
            try {
              wx.setStorageSync(tsKey, Date.now());
            } catch (e) { /* ignore */ }
          }
          const cached = cacheKey ? wx.getStorageSync(cacheKey) : null;
          resolve(cached);
        } else if (res.statusCode === 200 && res.data) {
          // 内容已更新，写入 Storage
          if (cacheKey) {
            smartSet(cacheKey, res.data, tsKey);
          }
          resolve(res.data);
        } else {
          reject(new Error('请求失败: ' + res.statusCode));
        }
      },
      fail: (err) => reject(err)
    });
  });
}

module.exports = {
  smartSet,
  clearCdnCache,
  fetchWithCache,
  MAX_CACHE_SIZE_KB
};
