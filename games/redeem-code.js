const sound = require('./sound-manager');

class RedeemCodeManager {
  constructor() {
    this.storageKey = 'redeem_codes';
    this.usedKey = 'used_redeems';
    this._load();
  }

  _load() {
    try {
      const codes = wx.getStorageSync(this.storageKey);
      this.codes = codes ? JSON.parse(codes) : this._getDefaultCodes();
    } catch (e) {
      this.codes = this._getDefaultCodes();
    }

    try {
      const used = wx.getStorageSync(this.usedKey);
      this.usedCodes = used ? JSON.parse(used) : [];
    } catch (e) {
      this.usedCodes = [];
    }
  }

  _save() {
    try {
      wx.setStorageSync(this.storageKey, JSON.stringify(this.codes));
    } catch (e) {}
    try {
      wx.setStorageSync(this.usedKey, JSON.stringify(this.usedCodes));
    } catch (e) {}
  }

  _getDefaultCodes() {
    return [
      { code: 'WELCOME2026', reward: { coins: 200, gems: 20 }, expires: '2027-12-31', used: false },
      { code: 'PUZZLE2026', reward: { coins: 150, gems: 15 }, expires: '2027-12-31', used: false },
      { code: 'SKILLMASTER', reward: { coins: 300, gems: 30 }, expires: '2027-12-31', used: false },
      { code: 'SHARE2026', reward: { coins: 100, gems: 10 }, expires: '2027-12-31', used: false },
      { code: 'DAILYBOOST', reward: { coins: 50, gems: 5 }, expires: '2027-12-31', used: false },
    ];
  }

  generateCode(options = {}) {
    const { prefix = 'PUZZLE', length = 8, reward = { coins: 50, gems: 5 }, expiresInDays = 30 } = options;
    
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = prefix;
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const expires = new Date();
    expires.setDate(expires.getDate() + expiresInDays);
    const expiresStr = expires.toISOString().split('T')[0];

    const newCode = {
      code: code,
      reward: reward,
      expires: expiresStr,
      used: false,
      createdAt: new Date().toISOString().split('T')[0]
    };

    this.codes.push(newCode);
    this._save();
    return code;
  }

  validate(code) {
    if (!code || typeof code !== 'string') {
      return { valid: false, message: '请输入兑换码' };
    }

    const upperCode = code.toUpperCase().trim();
    const found = this.codes.find(c => c.code.toUpperCase() === upperCode);

    if (!found) {
      return { valid: false, message: '兑换码不存在' };
    }

    if (this.usedCodes.includes(upperCode)) {
      return { valid: false, message: '该兑换码已被使用' };
    }

    const now = new Date();
    const expires = new Date(found.expires);
    if (now > expires) {
      return { valid: false, message: '兑换码已过期' };
    }

    return { valid: true, message: '兑换码有效', code: found };
  }

  redeem(code) {
    const validation = this.validate(code);
    if (!validation.valid) {
      return validation;
    }

    const upperCode = code.toUpperCase().trim();
    const codeData = validation.code;

    try {
      const currency = this._getCurrency();
      currency.coins = (currency.coins || 0) + codeData.reward.coins;
      currency.gems = (currency.gems || 0) + codeData.reward.gems;
      wx.setStorageSync('currency', JSON.stringify(currency));
    } catch (e) {
      return { valid: false, message: '奖励发放失败' };
    }

    this.usedCodes.push(upperCode);
    this._save();

    return {
      valid: true,
      success: true,
      message: `兑换成功！获得 ${codeData.reward.coins} 💰 + ${codeData.reward.gems} 💎`,
      reward: codeData.reward
    };
  }

  _getCurrency() {
    try {
      const raw = wx.getStorageSync('currency');
      return raw ? JSON.parse(raw) : { coins: 0, gems: 0 };
    } catch (e) {
      return { coins: 0, gems: 0 };
    }
  }

  getUsedCount() {
    return this.usedCodes.length;
  }

  getAvailableCodes() {
    return this.codes.filter(c => !this.usedCodes.includes(c.code.toUpperCase()));
  }
}

class RedeemCodeUI {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.manager = new RedeemCodeManager();
    this.inputCode = '';
    this.message = '';
    this.messageType = 'info';

    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };
    this.inputRect = { x: 30, y: this.height / 2 - 60, w: this.width - 60, h: 50 };
    this.redeemBtn = { x: 30, y: this.height / 2 + 20, w: this.width - 60, h: 50 };

    this._clickHandler = this._onClick.bind(this);
    this._inputHandler = this._onInput.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
    
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const tw = this.width;

    ctx.clearRect(0, 0, tw, this.height);
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, tw, this.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tw, this.statusBarHeight + 50);
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 17px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('兑换码', tw / 2, this.statusBarHeight + 33);

    ctx.fillStyle = '#5677FC';
    ctx.font = '15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('‹ 返回', this.backBtn.x, this.statusBarHeight + 30);

    ctx.fillStyle = '#1A1A2E';
    ctx.font = 'bold 22px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎁 兑换码兑换', tw / 2, this.height / 2 - 120);

    ctx.fillStyle = '#666666';
    ctx.font = '14px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.fillText('输入兑换码领取奖励', tw / 2, this.height / 2 - 90);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(this.inputRect.x, this.inputRect.y, this.inputRect.w, this.inputRect.h, 25);
    ctx.fill();
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = this.inputCode ? '#333333' : '#AAAAAA';
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.inputCode || '请输入兑换码', tw / 2, this.inputRect.y + 33);

    if (this.message) {
      const color = this.messageType === 'success' ? '#4CAF50' : 
                   this.messageType === 'error' ? '#F44336' : '#666666';
      ctx.fillStyle = color;
      ctx.font = '13px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.fillText(this.message, tw / 2, this.height / 2 + 90);
    }

    const canRedeem = this.inputCode.length >= 4;
    ctx.fillStyle = canRedeem ? '#5677FC' : '#CCCCCC';
    ctx.beginPath();
    ctx.roundRect(this.redeemBtn.x, this.redeemBtn.y, this.redeemBtn.w, this.redeemBtn.h, 25);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.fillText('立即兑换', tw / 2, this.redeemBtn.y + 33);

    ctx.fillStyle = '#BBBBBB';
    ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.fillText('关注公众号获取更多兑换码', tw / 2, this.height / 2 + 140);
  }

  _onClick(e) {
    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX, y = t.clientY;

    if (this._hit(this.backBtn, x, y)) {
      this.canvas.removeEventListener('click', this._clickHandler);
      this.switchGame('menu');
      return;
    }

    if (x >= this.inputRect.x && x <= this.inputRect.x + this.inputRect.w &&
        y >= this.inputRect.y && y <= this.inputRect.y + this.inputRect.h) {
      this._showInput();
      return;
    }

    if (x >= this.redeemBtn.x && x <= this.redeemBtn.x + this.redeemBtn.w &&
        y >= this.redeemBtn.y && y <= this.redeemBtn.y + this.redeemBtn.h) {
      this._doRedeem();
      return;
    }
  }

  _showInput() {
    if (typeof wx !== 'undefined' && wx.showModal) {
      wx.showModal({
        title: '输入兑换码',
        editable: true,
        placeholderText: '请输入兑换码',
        confirmText: '确定',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm && res.content) {
            this.inputCode = res.content.toUpperCase().trim();
            this.draw();
          }
        }
      });
    }
  }

  _doRedeem() {
    if (!this.inputCode.trim()) {
      this.message = '请输入兑换码';
      this.messageType = 'error';
      this.draw();
      return;
    }

    const result = this.manager.redeem(this.inputCode);
    
    if (result.success) {
      this.message = result.message;
      this.messageType = 'success';
      this.inputCode = '';
    } else {
      this.message = result.message;
      this.messageType = 'error';
    }
    
    if (typeof wx !== 'undefined' && wx.showToast) {
      wx.showToast({
        title: result.success ? '兑换成功！' : result.message,
        icon: result.success ? 'success' : 'none'
      });
    }
    
    this.draw();
  }

  _onInput(value) {
    this.inputCode = value.toUpperCase().trim();
    this.message = '';
    this.draw();
  }

  _hit(btn, x, y) {
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }

  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = { RedeemCodeManager, RedeemCodeUI };
