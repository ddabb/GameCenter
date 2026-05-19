/**
 * sound-manager.js — 音效管理器
 * 小游戏音效系统，使用 wx.createInnerAudioContext
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
    
    // 小游戏暂无本地音效文件，用振动反馈替代
    // 后续可替换为真实音效文件
    try {
      switch (name) {
        case 'click':
          wx.vibrateShort({ type: 'light' });
          break;
        case 'success':
          wx.vibrateShort({ type: 'medium' });
          break;
        case 'fail':
          wx.vibrateShort({ type: 'heavy' });
          break;
        case 'victory':
          // 双振模拟庆祝
          wx.vibrateShort({ type: 'medium' });
          setTimeout(() => wx.vibrateShort({ type: 'medium' }), 150);
          setTimeout(() => wx.vibrateShort({ type: 'light' }), 300);
          break;
        case 'gameover':
          wx.vibrateLong();
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
      wx.setStorageSync('sound_enabled', this.enabled ? '1' : '0');
    } catch (e) {}
    return this.enabled;
  }

  loadPreference() {
    try {
      const val = wx.getStorageSync('sound_enabled');
      if (val === '0') this.enabled = false;
    } catch (e) {}
  }
}

// 单例
const soundManager = new SoundManager();
soundManager.loadPreference();

module.exports = soundManager;
