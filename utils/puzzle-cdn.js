/**
 * PuzzleCDN - 题库 CDN 加载器
 * 从 CDN 加载题库数据，支持本地缓存（Storage）、加载进度、错误处理
 * 每个游戏可配置自己的题库 URL
 */
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/';

// 题库配置：gameId -> { url, storageKey, parser }
const PUZZLE_CONFIGS = {};

// 内存缓存（运行时）
let memoryCache = {};


// ============== 配置注册 ==============

/**
 * 注册游戏题库配置
 * @param {string} gameId - 游戏 ID
 * @param {object} config - { url, storageKey, parser }
 *   - url: CDN JSON 地址，如 'sudoku-easy.json'
 *   - storageKey: Storage 缓存键名，如 'cdn_sudoku_easy'
 *   - parser(data): 可选，解析函数，默认直接返回 data
 */
function registerGame(gameId, config) {
  PUZZLE_CONFIGS[gameId] = {
    url: CDN_BASE + config.url,
    storageKey: config.storageKey || `cdn_puzzles_${gameId}`,
    parser: config.parser || ((data) => data),
  };
}

/**
 * 批量注册题库（默认配置）
 */
function registerAllGames() {
  // 数独题库
  registerGame('sudoku-generator', {
    url: 'sudoku/levels.json',
    storageKey: 'cdn_sudoku_levels',
  });

  // 24点题库
  registerGame('24point', {
    url: '24point/levels.json',
    storageKey: 'cdn_24point_levels',
  });

  // 其他游戏按需添加
  // registerGame('nonogram', { url: 'nonogram/levels.json' });
}

// ============== 题库加载 ==============

/**
 * 从 CDN 加载题库（带本地缓存）
 * @param {string} gameId - 游戏 ID
 * @param {string} levelId - 关卡 ID（可选，用于获取单个关卡）
 * @returns {Promise<object>} 题库数据
 */
function loadPuzzle(gameId, levelId) {
  const config = PUZZLE_CONFIGS[gameId];
  if (!config) {
    return Promise.reject(new Error(`未注册题库: ${gameId}`));
  }

  // 1. 内存缓存命中
  if (memoryCache[gameId]) {
    const data = memoryCache[gameId];
    return Promise.resolve(levelId ? data[levelId] : data);
  }

  // 2. Storage 缓存命中（本地测试/离线可用）
  const storageKey = config.storageKey;
  try {
    const cached = wx.getStorageSync(storageKey);
    if (cached && cached.data) {
      memoryCache[gameId] = cached.data;
      console.info(`[PuzzleCDN] ${gameId} 从 Storage 缓存加载 ${cached.count} 条`);
      return Promise.resolve(levelId ? cached.data[levelId] : cached.data);
    }
  } catch (e) {
    console.warn(`[PuzzleCDN] Storage 读取失败: ${storageKey}`, e);
  }

  // 3. 从 CDN 加载
  return fetchFromCDN(gameId, levelId);
}

/**
 * 强制从 CDN 刷新题库
 */
function refreshPuzzle(gameId, levelId) {
  const config = PUZZLE_CONFIGS[gameId];
  if (!config) {
    return Promise.reject(new Error(`未注册题库: ${gameId}`));
  }
  // 删除缓存
  delete memoryCache[gameId];
  try {
    wx.removeStorageSync(config.storageKey);
  } catch (e) {}
  return fetchFromCDN(gameId, levelId);
}

/**
 * CDN 请求
 */
function fetchFromCDN(gameId, levelId) {
  const config = PUZZLE_CONFIGS[gameId];
  console.info(`[PuzzleCDN] 从 CDN 加载: ${config.url}`);

  return new Promise((resolve, reject) => {
    wx.showLoading({ title: '加载题库...', mask: true });

    wx.request({
      url: config.url,
      method: 'GET',
      timeout: 15000,
      success(res) {
        wx.hideLoading();
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        let data = res.data;
        // 支持 JSONP 包装
        if (typeof data === 'string' && data.startsWith('callback(')) {
          data = JSON.parse(data.replace(/^callback\(/, '').replace(/\);?$/, ''));
        }

        // 解析
        const parsed = config.parser(data);

        // 写入内存 + Storage 缓存
        memoryCache[gameId] = parsed;
        try {
          wx.setStorageSync(config.storageKey, {
            data: parsed,
            count: Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length,
            ts: Date.now(),
          });
        } catch (e) {
          console.warn(`[PuzzleCDN] Storage 写入失败`, e);
        }

        console.info(`[PuzzleCDN] ${gameId} CDN 加载完成，共 ${Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length} 条`);
        resolve(levelId ? parsed[levelId] : parsed);
      },
      fail(err) {
        wx.hideLoading();
        console.error(`[PuzzleCDN] CDN 请求失败:`, err);
        wx.showToast({ title: '题库加载失败', icon: 'none' });
        reject(err);
      }
    });
  });
}

// ============== 关卡数据 ==============

/**
 * 获取随机题库（用于随机模式）
 * @param {string} gameId
 * @param {number} count - 随机抽取数量
 */
function getRandomPuzzles(gameId, count = 10) {
  return loadPuzzle(gameId).then(data => {
    if (Array.isArray(data)) {
      const shuffled = data.slice().sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    } else if (typeof data === 'object') {
      const keys = Object.keys(data);
      const shuffled = keys.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count).map(k => data[k]);
    }
    return [];
  });
}

/**
 * 获取指定关卡
 */
function getLevel(gameId, levelIndex) {
  return loadPuzzle(gameId).then(data => {
    if (Array.isArray(data)) {
      return data[levelIndex];
    } else if (typeof data === 'object') {
      const keys = Object.keys(data);
      return data[keys[levelIndex]];
    }
    return null;
  });
}

// ============== 题库统计 ==============

/**
 * 获取题库加载状态
 */
function getCacheStatus(gameId) {
  const config = PUZZLE_CONFIGS[gameId];
  if (!config) return { registered: false };
  const cached = memoryCache[gameId];
  return {
    registered: true,
    inMemory: !!cached,
    inStorage: (() => {
      try {
        const s = wx.getStorageSync(config.storageKey);
        return !!s;
      } catch (e) { return false; }
    })(),
  };
}

// ============== 导出 ==============
module.exports = {
  CDN_BASE,
  registerGame,
  registerAllGames,
  loadPuzzle,
  refreshPuzzle,
  getRandomPuzzles,
  getLevel,
  getCacheStatus,
};
