/**
 * redeem-code.js - 兑换码页面
 */
const sound = require('./sound-manager');

class RedeemCode {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };
    this.inputValue = '';
    this.message = '';
    this.messageType = ''; // 'success' or 'error'

    this._clickHandler = this._onClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
    
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const tw = this.width;

    ctx.clearRect(0, 0, tw, this.height);
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, tw, this.height);

    // 顶部导航栏
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tw, this.statusBarHeight + 50);
    
    // 返回按钮
    ctx.fillStyle = '#5677FC';
    ctx.font = '15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('‹ 返回', this.backBtn.x, this.statusBarHeight + 30);

    // 标题
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 17px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('兑换码', tw / 2, this.statusBarHeight + 33);

    // 输入框
    const inputY = this.statusBarHeight + 80;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, inputY, tw - 40, 44);
    ctx.strokeStyle = '#5677FC';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, inputY, tw - 40, 44);

    ctx.fillStyle = '#333333';
    ctx.font = '16px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.inputValue || '请输入兑换码', 30, inputY + 28);

    // 兑换按钮
    const btnY = inputY + 64;
    ctx.fillStyle = '#5677FC';
    ctx.fillRect(20, btnY, tw - 40, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('兑换', tw / 2, btnY + 28);

    // 提示信息
    if (this.message) {
      const msgY = btnY + 64;
      ctx.fillStyle = this.messageType === 'success' ? '#48BB78' : '#F56565';
      ctx.font = '14px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.message, tw / 2, msgY);
    }

    // 兑换码说明
    const helpY = this.height - 100;
    ctx.fillStyle = '#999999';
    ctx.font = '13px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('兑换码可通过活动、任务获得', tw / 2, helpY);
    ctx.fillText('每个兑换码限用一次', tw / 2, helpY + 20);
  }

  _onClick(e) {
    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX, y = t.clientY;

    // 返回按钮
    if (x >= this.backBtn.x && x <= this.backBtn.x + this.backBtn.w &&
        y >= this.backBtn.y && y <= this.backBtn.y + this.backBtn.h) {
      this.canvas.removeEventListener('click', this._clickHandler);
      this.switchGame('profile');  // 返回「我的」页面
      return;
    }

    // 输入框点击（简化：直接弹出系统输入）
    const inputY = this.statusBarHeight + 80;
    if (x >= 20 && x <= this.width - 20 && y >= inputY && y <= inputY + 44) {
      // 微信小游戏环境，使用showModal简化输入
      wx.showModal({
        title: '输入兑换码',
        editable: true,
        placeholderText: '请输入兑换码',
        success: (res) => {
          if (res.content) {
            this.inputValue = res.content.toUpperCase();
            this._redeem();
          }
        }
      });
    }

    // 兑换按钮
    const btnY = inputY + 64;
    if (x >= 20 && x <= this.width - 20 && y >= btnY && y <= btnY + 44) {
      this._redeem();
    }
  }

  _redeem() {
    if (!this.inputValue) {
      this.message = '请输入兑换码';
      this.messageType = 'error';
      this.draw();
      return;
    }

    // 简化：模拟兑换逻辑
    const validCodes = {
      'WELCOME': { coins: 100, gems: 0 },
      'PUZZLE2026': { coins: 500, gems: 10 },
      'TEST123': { coins: 50, gems: 0 }
    };

    const reward = validCodes[this.inputValue];
    if (reward) {
      // 发放奖励（简化：只显示提示）
      this.message = `兑换成功！获得 ${reward.coins}金币 ${reward.gems}宝石`;
      this.messageType = 'success';
      sound.play('success');
    } else {
      this.message = '兑换码无效或已使用';
      this.messageType = 'error';
      sound.play('error');
    }

    this.draw();
  }

  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = RedeemCode;
