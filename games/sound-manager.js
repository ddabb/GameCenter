/**
 * sound-manager.js — 音效管理器
 * 抖音小游戏音效系统，使用 tt.createInnerAudioContext
 */
class SoundManager {
  constructor() {
    this.enabled = true;
    this.audios = {};
  }

  /**
   * 播放音效
   * @param {string} name - 音效名称: click, success, fail, victory, gameover
   */
  play(name) {
    if (!this.enabled) return;
    
    // 抖音小游戏暂无本地音效文件，用振动反馈替代
    // 后续可替换为真实音效文件
    try {
      switch (name) {
        case 'click':
          tt.vibrateShort({ type: 'light' });
          break;
        case 'success':
          tt.vibrateShort({ type: 'medium' });
          break;
        case 'fail':
          tt.vibrateShort({ type: 'heavy' });
          break;
        case 'victory':
          // 双振模拟庆祝
          tt.vibrateShort({ type: 'medium' });
          setTimeout(() => tt.vibrateShort({ type: 'medium' }), 150);
          setTimeout(() => tt.vibrateShort({ type: 'light' }), 300);
          break;
        case 'gameover':
          tt.vibrateLong();
          break;
      }
    } catch (e) {
      // 振动不可用时静默失败
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    // 保存偏好
    try {
      tt.setStorageSync('sound_enabled', this.enabled ? '1' : '0');
    } catch (e) {}
    return this.enabled;
  }

  loadPreference() {
    try {
      const val = tt.getStorageSync('sound_enabled');
      if (val === '0') this.enabled = false;
    } catch (e) {}
  }
}

// 单例
const soundManager = new SoundManager();
soundManager.loadPreference();

module.exports = soundManager;
