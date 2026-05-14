/**
 * AudioManager - 音效与音乐管理器
 * 支持 BGM 循环播放、音效播放、音量控制、静音
 * 使用微信 InnerAudioContext
 */
let bgmAudio = null;
let sfxCache = {};       // 音效缓存 { name: InnerAudioContext }
let masterVolume = 1.0;  // 主音量 0~1
let sfxVolume = 1.0;     // 音效音量
let bgmVolume = 0.3;      // BGM 音量
let isMuted = false;

// ============== 初始化 ==============
function init() {
  // BGM（延迟加载，等用户交互后再播放）
  bgmAudio = wx.createInnerAudioContext();
  bgmAudio.loop = true;
  bgmAudio.volume = bgmVolume;
  bgmAudio.src = 'audio/bgm.mp3';
  bgmAudio.onError(() => {});
  console.info('[AudioManager] 初始化完成');
}

// ============== 音效注册 ==============
/**
 * 注册音效文件（提前加载，避免首次播放延迟）
 * @param {string} name - 音效名称，如 'tap', 'win', 'error'
 * @param {string} src - 音频文件相对路径，如 'audio/boom.mp3'
 */
function registerSfx(name, src) {
  if (sfxCache[name]) return; // 已注册
  const audio = wx.createInnerAudioContext();
  audio.src = src;
  audio.onCanplay(() => {
    console.info(`[AudioManager] SFX "${name}" ready`);
  });
  audio.onError((e) => {
    console.warn(`[AudioManager] SFX "${name}" load failed:`, e);
  });
  sfxCache[name] = audio;
}

/**
 * 批量注册音效（基于 audio 目录下的文件自动映射）
 */
function registerAllSfx() {
  // 音效文件待补充，预留注册接口
}

// ============== 播放控制 ==============

/**
 * 播放音效
 * @param {string} name - 音效名称
 * @param {boolean} forcePlay - 强制重新创建实例（避免快速连点打断）
 */
function playSfx(name, forcePlay = false) {
  if (isMuted || sfxVolume === 0) return;
  if (!sfxCache[name]) {
    console.warn(`[AudioManager] SFX "${name}" not registered`);
    return;
  }
  const audio = sfxCache[name];
  audio.volume = sfxVolume * masterVolume;
  audio.startTime = 0;
  audio.play();
}

/**
 * 播放 BGM
 */
function playBgm() {
  if (isMuted || !bgmAudio) return;
  bgmAudio.volume = bgmVolume * masterVolume;
  bgmAudio.play();
}

/**
 * 停止 BGM
 */
function stopBgm() {
  if (bgmAudio) {
    bgmAudio.stop();
  }
}

/**
 * 暂停 BGM
 */
function pauseBgm() {
  if (bgmAudio) {
    bgmAudio.pause();
  }
}

/**
 * 恢复 BGM
 */
function resumeBgm() {
  if (bgmAudio) {
    bgmAudio.play();
  }
}

// ============== 音量控制 ==============

/**
 * 设置主音量
 */
function setMasterVolume(vol) {
  masterVolume = Math.max(0, Math.min(1, vol));
  if (bgmAudio) bgmAudio.volume = bgmVolume * masterVolume;
  Object.values(sfxCache).forEach(a => { a.volume = sfxVolume * masterVolume; });
}

/**
 * 设置 BGM 音量
 */
function setBgmVolume(vol) {
  bgmVolume = Math.max(0, Math.min(1, vol));
  if (bgmAudio) bgmAudio.volume = bgmVolume * masterVolume;
}

/**
 * 设置音效音量
 */
function setSfxVolume(vol) {
  sfxVolume = Math.max(0, Math.min(1, vol));
  Object.values(sfxCache).forEach(a => { a.volume = sfxVolume * masterVolume; });
}

/**
 * 静音切换
 */
function toggleMute() {
  isMuted = !isMuted;
  if (bgmAudio) {
    if (isMuted) {
      bgmAudio.pause();
    } else {
      bgmAudio.play();
    }
  }
  return isMuted;
}

// ============== 清理 ==============
function destroy() {
  if (bgmAudio) {
    bgmAudio.stop();
    bgmAudio.destroy();
    bgmAudio = null;
  }
  Object.values(sfxCache).forEach(a => {
    a.stop();
    a.destroy();
  });
  sfxCache = {};
}

// ============== 导出 ==============
module.exports = {
  init,
  registerSfx,
  registerAllSfx,
  playSfx,
  playBgm,
  stopBgm,
  pauseBgm,
  resumeBgm,
  setMasterVolume,
  setBgmVolume,
  setSfxVolume,
  toggleMute,
  destroy,
  get masterVolume() { return masterVolume; },
  get sfxVolume() { return sfxVolume; },
  get bgmVolume() { return bgmVolume; },
  get isMuted() { return isMuted; },
};
