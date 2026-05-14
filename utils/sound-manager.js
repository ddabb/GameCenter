/**
 * 音效管理器 - 带本地缓存
 * 避免每次播放都请求CDN
 */

const SOUNDS_BASE = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/sounds';
const CACHE_PREFIX = 'sound_cache_';
const CACHE_DIR = `${wx.env.USER_DATA_PATH}/sounds`;
const SOUND_ENABLED_KEY = 'sound_enabled_global'; // 全局音效开关
const SOUND_PAGE_KEY_PREFIX = 'sound_enabled_'; // 页面级音效开关

// 音效缓存（内存）
const audioCache = {};
// 正在下载的音效
const downloading = new Set();

// 音效名称别名映射（兼容 CDN 实际文件名）
const SOUND_ALIASES = {
  tap: 'click',   // 脚步声/敲击 → click.wav
  push: 'bong',   // 推箱子 → bong.wav
  error: 'wrong', // 撞墙/错误 → wrong.wav
  win: 'win'      // 胜利（已存在）
};

/**
 * 获取全局音效开关状态
 * @returns {boolean}
 */
function isGlobalSoundEnabled() {
  try {
    return wx.getStorageSync(SOUND_ENABLED_KEY) !== 'false';
  } catch (e) {
    return true;
  }
}

/**
 * 设置全局音效开关
 * @param {boolean} enabled
 */
function setGlobalSoundEnabled(enabled) {
  try {
    wx.setStorageSync(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('[sound] 设置全局开关失败', e);
  }
}

/**
 * 获取页面级音效开关状态
 * @param {string} pageId 页面ID，如 'frog-escape', 'othello'
 * @returns {boolean}
 */
function isPageSoundEnabled(pageId) {
  try {
    const key = SOUND_PAGE_KEY_PREFIX + pageId;
    const val = wx.getStorageSync(key);
    // 如果页面未设置，继承全局设置
    if (val === '') return isGlobalSoundEnabled();
    return val !== 'false';
  } catch (e) {
    return isGlobalSoundEnabled();
  }
}

/**
 * 设置页面级音效开关
 * @param {string} pageId 页面ID
 * @param {boolean} enabled
 */
function setPageSoundEnabled(pageId, enabled) {
  try {
    const key = SOUND_PAGE_KEY_PREFIX + pageId;
    wx.setStorageSync(key, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('[sound] 设置页面开关失败', e);
  }
}

/**
 * 确保缓存目录存在
 */
function ensureCacheDir() {
  try {
    const fs = wx.getFileSystemManager();
    try {
      fs.accessSync(CACHE_DIR);
    } catch (e) {
      fs.mkdirSync(CACHE_DIR, true);
    }
    return true;
  } catch (e) {
    console.warn('[sound] 创建缓存目录失败', e);
    return false;
  }
}

/**
 * 获取音效本地路径
 * @param {string} name 音效名称，如 'click'
 * @returns {string} 本地缓存路径
 */
function getLocalPath(name) {
  return `${CACHE_DIR}/${name}.wav`;
}

/**
 * 检查音效是否已缓存
 * @param {string} name 音效名称
 * @returns {boolean}
 */
function isCached(name) {
  try {
    const fs = wx.getFileSystemManager();
    fs.accessSync(getLocalPath(name));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 下载音效到本地
 * @param {string} name 音效名称
 * @returns {Promise<string>} 本地路径
 */
function downloadSound(name) {
  name = SOUND_ALIASES[name] || name;
  return new Promise((resolve, reject) => {
    if (downloading.has(name)) {
      // 正在下载，等待
      const checkInterval = setInterval(() => {
        if (!downloading.has(name)) {
          clearInterval(checkInterval);
          resolve(getLocalPath(name));
        }
      }, 100);
      return;
    }

    downloading.add(name);
    ensureCacheDir();

    const url = `${SOUNDS_BASE}/${name}.wav`;
    const localPath = getLocalPath(name);

    wx.downloadFile({
      url,
      filePath: localPath,
      success: (res) => {
        downloading.delete(name);
        if (res.statusCode === 200) {
          console.log(`[sound] 缓存音效: ${name}`);
          resolve(localPath);
        } else {
          reject(new Error(`下载失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        downloading.delete(name);
        console.warn(`[sound] 下载失败 ${name}:`, err);
        reject(err);
      }
    });
  });
}

/**
 * 播放音效（带缓存）
 * @param {string} name 音效名称，如 'click', 'win', 'lose', 'flag'
 * @param {Object} options 选项
 * @param {boolean} options.vibrate 是否同时震动
 * @param {string} options.pageId 页面ID（用于检查页面级开关）
 */
async function playSound(name, options = {}) {
  name = SOUND_ALIASES[name] || name;
  const { vibrate = false, pageId } = options;

  // 检查音效开关
  if (pageId) {
    if (!isPageSoundEnabled(pageId)) return;
  } else {
    if (!isGlobalSoundEnabled()) return;
  }

  try {
    let src;

    // 1. 检查内存缓存
    if (audioCache[name]) {
      src = audioCache[name];
    }
    // 2. 检查本地文件缓存
    else if (isCached(name)) {
      src = getLocalPath(name);
      audioCache[name] = src;
    }
    // 3. 下载并缓存
    else {
      src = await downloadSound(name);
      audioCache[name] = src;
    }

    // 播放
    const audio = wx.createInnerAudioContext();
    audio.src = src;
    audio.play();

    audio.onEnded(() => {
      audio.destroy();
    });

    audio.onError((err) => {
      console.warn(`[sound] 播放失败 ${name}:`, err);
      audio.destroy();
    });

    // 震动反馈
    if (vibrate) {
      wx.vibrateShort({ type: 'light' });
    }
  } catch (err) {
    console.warn(`[sound] 播放异常 ${name}:`, err);

    // 降级：直接用CDN URL播放
    try {
      const audio = wx.createInnerAudioContext();
      audio.src = `${SOUNDS_BASE}/${SOUND_ALIASES[name] || name}.wav`;
      audio.play();
      audio.onEnded(() => audio.destroy());
      audio.onError(() => audio.destroy());
    } catch (e) {
      // 忽略
    }
  }
}

/**
 * 预加载音效（后台下载缓存）
 * @param {string[]} names 音效名称数组
 */
async function preloadSounds(names = ['click', 'win', 'lose', 'flag']) {
  ensureCacheDir();

  for (const name of names) {
    if (!isCached(name)) {
      try {
        await downloadSound(name);
        audioCache[name] = getLocalPath(name);
      } catch (e) {
        // 忽略下载失败
      }
    } else {
      audioCache[name] = getLocalPath(name);
    }
  }

  console.log(`[sound] 预加载完成: ${names.join(', ')}`);
}

/**
 * 清理音效缓存
 */
function clearCache() {
  try {
    const fs = wx.getFileSystemManager();
    fs.rmdirSync(CACHE_DIR, true);
    console.log('[sound] 缓存已清理');
  } catch (e) {
    // 忽略
  }
}

/**
 * 获取缓存大小
 */
function getCacheSize() {
  try {
    const fs = wx.getFileSystemManager();
    const files = fs.readdirSync(CACHE_DIR);
    let size = 0;
    for (const file of files) {
      const stat = fs.statSync(`${CACHE_DIR}/${file}`);
      size += stat.size;
    }
    return size;
  } catch (e) {
    return 0;
  }
}

module.exports = {
  SOUNDS_BASE,
  playSound,
  preloadSounds,
  clearCache,
  getCacheSize,
  isCached,
  // 音效开关接口
  isGlobalSoundEnabled,
  setGlobalSoundEnabled,
  isPageSoundEnabled,
  setPageSoundEnabled
};
