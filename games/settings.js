/**
 * settings.js - 设置页面
 * 音效/音乐/震动开关，隐私政策链接
 */
const soundManager = require('./sound-manager');
const PrivacyManager = require('./privacy');

class Settings {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    // 加载设置
    try {
      const raw = wx.getStorageSync('settings');
      this.settings = raw && typeof raw === 'object' ? raw : {};
    } catch (e) { this.settings = {}; }

    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };
    this.items = this._buildItems();

    this._clickHandler = this._onClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
    this.draw();
  }

  _buildItems() {
    const tw = this.width;
    const padding = 15;
    const y0 = this.statusBarHeight + 60;
    const itemH = 50;
    const gap = 1;

    const items = [
      { key: 'sound', label: '音效', type: 'toggle', y: y0 },
      { key: 'music', label: '音乐', type: 'toggle', y: y0 + itemH + gap },
      { key: 'vibration', label: '震动', type: 'toggle', y: y0 + (itemH + gap) * 2 },
      { key: 'privacy', label: '隐私政策', type: 'link', y: y0 + (itemH + gap) * 3 },
      { key: 'about', label: '关于我们', type: 'link', y: y0 + (itemH + gap) * 4 },
    ];
    items.forEach(it => {
      it.x = padding;
      it.w = tw - padding * 2;
      it.h = itemH;
      it.toggleX = tw - padding - 60;
      it.toggleW = 50;
      it.toggleH = 26;
    });
    return items;
  }

  draw() {
    const ctx = this.ctx;
    const tw = this.width;

    // 背景
    ctx.clearRect(0, 0, tw, this.height);
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, tw, this.height);

    // 顶部条
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tw, this.statusBarHeight + 50);
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 17px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('设置', tw / 2, this.statusBarHeight + 33);

    // 返回
    ctx.fillStyle = '#5677FC';
    ctx.font = '15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('‹ 返回', this.backBtn.x, this.statusBarHeight + 30);

    // 分隔线
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 0.5;

    // 渲染每项
    this.items.forEach(item => {
      // 白色行
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(item.x, item.y, item.w, item.h);

      // 标签
      ctx.fillStyle = '#333333';
      ctx.font = '16px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, item.x + 15, item.y + 32);

      if (item.type === 'toggle') {
        const on = this.settings[item.key] !== false;
        const tx = item.toggleX, ty = item.y + (item.h - item.toggleH) / 2;

        // 轨道
        ctx.fillStyle = on ? '#5677FC' : '#CCCCCC';
        ctx.beginPath();
        ctx.roundRect(tx, ty, item.toggleW, item.toggleH, item.toggleH / 2);
        ctx.fill();

        // 滑块
        const cx = on ? tx + item.toggleW - 3 : tx + 3;
        const cy = ty + item.toggleH / 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, item.toggleH / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // 记录 toggle 区域
        item.toggleRegion = { x: tx, y: ty, w: item.toggleW, h: item.toggleH };
      } else {
        // 右箭头
        ctx.fillStyle = '#BBBBBB';
        ctx.font = '14px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('›', item.x + item.w - 15, item.y + 32);
      }

      // 底部分隔线
      ctx.strokeStyle = '#EEEEEE';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(item.x, item.y + item.h);
      ctx.lineTo(item.x + item.w, item.y + item.h);
      ctx.stroke();
    });
  }

  _onClick(e) {
    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX, y = t.clientY;

    // 返回
    if (this._hit(this.backBtn, x, y)) {
      this.canvas.removeEventListener('click', this._clickHandler);
      this.switchGame('menu');
      return;
    }

    // 点击项
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (y >= item.y && y <= item.y + item.h && x >= item.x && x <= item.x + item.w) {
        if (item.type === 'toggle') {
          const newVal = !this._isOn(item.key);
          this._set(item.key, newVal);
          this._applySetting(item.key, newVal);
          this.draw();
        } else if (item.key === 'privacy') {
          this._showPrivacy();
        } else if (item.key === 'about') {
          this._showAbout();
        }
        return;
      }
    }
  }

  _hit(btn, x, y) {
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }

  _isOn(key) {
    return this.settings[key] !== false;
  }

  _set(key, val) {
    this.settings[key] = val;
    try { wx.setStorageSync('settings', this.settings); } catch (e) {}
  }

  _applySetting(key, val) {
    if (key === 'sound') soundManager.enabled = val;
    if (key === 'music') {
      // music player toggle
    }
  }

  _showPrivacy() {
    this.canvas.removeEventListener('click', this._clickHandler);
    new (require('./privacy'))(this.ctx, this.canvas, {
      windowWidth: this.width,
      windowHeight: this.height,
      statusBarHeight: this.statusBarHeight
    }, this.switchGame);
  }

  _showAbout() {
    wx.showModal({
      title: '关于我们',
      content: 'SolvePuzzle v1.5.0\n12款经典益智游戏合集\n27000+关卡等你挑战\n\n如有建议，欢迎反馈！',
      showCancel: false
    });
  }

  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = Settings;