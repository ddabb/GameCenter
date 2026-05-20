/**
 * sound-manager.js — 音效管理器
 * 统一管理音效和震动，从设置页面读取配置
 */
class SoundManager {
  constructor() {
    this.soundEnabled = true;
    this.vibrationEnabled = true;
    this.audios = {};
  }

  /**
   * 播放音效（带震动反馈）
   * @param {string} name - 音效名称: click, success, fail, victory, gameover
   */
  play(name) {
    if (!this.vibrationEnabled) return;
    
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

  setSoundEnabled(value) {
    this.soundEnabled = value;
    this._saveSettings();
  }

  setVibrationEnabled(value) {
    this.vibrationEnabled = value;
    this._saveSettings();
  }

  _saveSettings() {
    try {
      const settings = {
        sound: this.soundEnabled,
        vibration: this.vibrationEnabled
      };
      wx.setStorageSync('settings', JSON.stringify(settings));
    } catch (e) {}
  }

  loadSettings() {
    try {
      const raw = wx.getStorageSync('settings');
      if (raw) {
        const settings = JSON.parse(raw);
        if (settings.sound !== undefined) this.soundEnabled = settings.sound;
        if (settings.vibration !== undefined) this.vibrationEnabled = settings.vibration;
      }
    } catch (e) {}
  }

  get soundEnabled() {
    return this._soundEnabled;
  }

  set soundEnabled(value) {
    this._soundEnabled = value;
  }

  get vibrationEnabled() {
    return this._vibrationEnabled;
  }

  set vibrationEnabled(value) {
    this._vibrationEnabled = value;
  }

  playClick() {
    this.play('click');
  }

  playVictory() {
    this.play('victory');
  }

  playWin() {
    this.play('victory');
  }

  playSuccess() {
    this.play('success');
  }

  playFail() {
    this.play('fail');
  }

  playGameover() {
    this.play('gameover');
  }
}

// 单例
const soundManager = new SoundManager();
soundManager.loadSettings();

module.exports = soundManager;
