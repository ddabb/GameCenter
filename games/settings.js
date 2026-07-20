/**
 * settings.js - 设置页面
 * 音效/音乐/震动开关，隐私政策链接
 */
const soundManager = require('./sound-manager');
const PrivacyManager = require('./privacy');
const { RedeemCodeUI } = require('./redeem-code');
const CheckInManager = require('./checkin');
const version = require('../version.js');

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
    this.checkin = new CheckInManager();
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
      { key: 'checkin', label: '📅 每日签到', type: 'link', y: y0 + (itemH + gap) * 3 },
      { key: 'redeem', label: '🎁 兑换码', type: 'link', y: y0 + (itemH + gap) * 4 },
      { key: 'privacy', label: '隐私政策', type: 'link', y: y0 + (itemH + gap) * 5 },
      { key: 'contact', label: '📞 联系我们', type: 'link', y: y0 + (itemH + gap) * 6 },
      { key: 'about', label: '关于我们', type: 'link', y: y0 + (itemH + gap) * 7 },
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
        } else if (item.key === 'checkin') {
          this._showCheckin();
        } else if (item.key === 'redeem') {
          this._showRedeem();
        } else if (item.key === 'contact') {
          this._openOfficialAccount();
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
    if (key === 'sound') soundManager.setSoundEnabled(val);
    if (key === 'vibration') soundManager.setVibrationEnabled(val);
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

  _showCheckin() {
    this._showCheckinPopup();
  }

  _showRedeem() {
    this.canvas.removeEventListener('click', this._clickHandler);
    new RedeemCodeUI(this.ctx, this.canvas, {
      windowWidth: this.width,
      windowHeight: this.height,
      statusBarHeight: this.statusBarHeight,
    }, () => {
      this._clickHandler = this._onClick.bind(this);
      this.canvas.addEventListener('click', this._clickHandler);
      this.draw();
    });
  }

  _showCheckinPopup() {
    const ctx = this.ctx;
    const W = this.width, H = this.height;
    const popW = W * 0.82, popH = 320;
    const popX = (W - popW) / 2, popY = (H - popH) / 2 - 40;
    const btnW = 120, btnH = 40;
    const btnX = (W - btnW) / 2, btnY = popY + popH - 60;

    const handler = (e) => {
      const t = e.touches ? e.touches[0] : e;
      const x = t.clientX, y = t.clientY;
      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        const result = this.checkin.checkIn();
        this._checkinResult = result.success ? result : this._checkinResult;
        this.draw();
        this._drawCheckinOverlay(popX, popY, popW, popH, btnX, btnY, btnW, btnH);
        return;
      }
      if (x < popX || x > popX + popW || y < popY || y > popY + popH) {
        this.canvas.removeEventListener('click', handler);
        this.draw();
        return;
      }
    };
    this.canvas.addEventListener('click', handler);
    this._drawCheckinOverlay(popX, popY, popW, popH, btnX, btnY, btnW, btnH);
  }

  _drawCheckinOverlay(popX, popY, popW, popH, btnX, btnY, btnW, btnH) {
    const ctx = this.ctx;
    const W = this.width;
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, this.height);
    // 卡片
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(popX, popY, popW, popH, 16);
    ctx.fill();
    // 标题
    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText('📅 每日签到', W / 2, popY + 38);
    // 连续天数
    const streak = this.checkin.getStreak();
    ctx.fillStyle = '#FF6B6B';
    ctx.font = 'bold 14px -apple-system';
    ctx.fillText('🔥 连续 ' + streak + ' 天', W / 2, popY + 60);
    // 星期网格
    const week = this.checkin.getWeekStatus();
    const dayW = (popW - 40) / 7;
    const dayStartX = popX + 20;
    ['一','二','三','四','五','六','日'].forEach((d, i) => {
      ctx.fillStyle = '#999';
      ctx.font = '12px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(d, dayStartX + i * dayW + dayW / 2, popY + 82);
      const isChecked = week[i];
      ctx.fillStyle = isChecked ? '#4CAF50' : '#ddd';
      ctx.beginPath();
      ctx.arc(dayStartX + i * dayW + dayW / 2, popY + 105, 14, 0, Math.PI * 2);
      ctx.fill();
      if (isChecked) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px -apple-system';
        ctx.fillText('✓', dayStartX + i * dayW + dayW / 2, popY + 110);
      }
    });
    // 结果
    if (this._checkinResult && this._checkinResult.success) {
      const r = this._checkinResult;
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 16px -apple-system';
      ctx.fillText('✅ 签到成功！', W / 2, popY + 170);
      ctx.fillStyle = '#555';
      ctx.font = '14px -apple-system';
      ctx.fillText('今日可获奖励：', W / 2, popY + 195);
      if (r.bonus) ctx.fillText('🎊 ' + r.bonus.label + '：' + r.bonus.coins + '💰金币 + ' + r.bonus.gems + '💎宝石', W / 2, popY + 218);
    } else if (this.checkin.isCheckedInToday()) {
      ctx.fillStyle = '#999';
      ctx.font = '14px -apple-system';
      ctx.fillText('今日已签到 ✅', W / 2, popY + 185);
    }
    // 按钮
    const done = this.checkin.isCheckedInToday();
    ctx.fillStyle = done ? '#E0E0E0' : '#6677FC';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, btnH / 2);
    ctx.fill();
    ctx.fillStyle = done ? '#999' : '#fff';
    ctx.font = 'bold 14px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(done ? '已签到' : '签到', btnX + btnW / 2, btnY + btnH / 2 + 5);
  }

  _showAbout() {
    const updateLog = version.updateLog[0];
    const changes = updateLog.changes.map(c => '• ' + c).join('\n');
    
    wx.showModal({
      title: '关于 ' + version.name,
      content: version.name + ' v' + version.number + '\n' + version.description + '\n\n最近更新（' + updateLog.date + '）：\n' + changes + '\n\n如有建议，欢迎反馈！',
      showCancel: false
    });
  }

  _openOfficialAccount() {
    if (typeof wx.canIUse === 'function' && wx.canIUse('openOfficialAccountProfile')) {
      wx.openOfficialAccountProfile({
        username: 'gh_d9b54132dd2c',
        success(res) {
          console.log('[Settings] 打开公众号成功');
        },
        fail(err) {
          console.log('[Settings] 打开公众号失败', err);
          wx.showToast({
            title: '请手动搜索公众号：随身工具宝',
            icon: 'none',
            duration: 3000
          });
        }
      });
    } else {
      wx.showToast({
        title: '当前版本不支持，请升级微信',
        icon: 'none',
        duration: 2000
      });
    }
  }

  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = Settings;