class AdRewardManager {
  constructor() {
    this.rewardAd = null;
    this.interstitialAd = null;
    this.bannerAd = null;
    this.loading = false;
    this.rewardCallbacks = [];
    this._initAds();
  }

  _initAds() {
    if (typeof wx === 'undefined' || !wx.createRewardedVideoAd) {
      console.log('[AdReward] 微信广告API不可用');
      return;
    }

    try {
      this.rewardAd = wx.createRewardedVideoAd({
        adUnitId: 'adunit-xxxxxxxxxxxxxx'
      });

      this.rewardAd.onLoad(() => {
        console.log('[AdReward] 激励视频广告加载成功');
        this.loading = false;
        this._processCallbacks(true);
      });

      this.rewardAd.onError((err) => {
        console.error('[AdReward] 激励视频广告加载失败:', err);
        this.loading = false;
        this._processCallbacks(false, err);
      });

      this.rewardAd.onClose((res) => {
        console.log('[AdReward] 激励视频广告关闭:', res);
        if (res && res.isEnded) {
          this._grantReward();
        }
      });
    } catch (e) {
      console.error('[AdReward] 创建激励视频广告失败:', e);
    }
  }

  _processCallbacks(success, error) {
    this.rewardCallbacks.forEach(cb => {
      if (success) {
        cb.success && cb.success();
      } else {
        cb.fail && cb.fail(error);
      }
    });
    this.rewardCallbacks = [];
  }

  _grantReward(rewardType = 'gems', amount = 10) {
    try {
      const raw = wx.getStorageSync('currency');
      const currency = raw ? JSON.parse(raw) : { coins: 0, gems: 0 };
      
      if (rewardType === 'gems') {
        currency.gems = (currency.gems || 0) + amount;
      } else if (rewardType === 'coins') {
        currency.coins = (currency.coins || 0) + amount;
      }
      
      wx.setStorageSync('currency', JSON.stringify(currency));
      
      if (wx.showToast) {
        wx.showToast({
          title: `获得 ${amount} ${rewardType === 'gems' ? '💎' : '💰'}`,
          icon: 'success'
        });
      }
    } catch (e) {
      console.error('[AdReward] 发放奖励失败:', e);
    }
  }

  loadRewardAd(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.rewardAd) {
        reject(new Error('激励视频广告不可用'));
        return;
      }

      this.rewardCallbacks.push({
        success: resolve,
        fail: reject
      });

      if (this.loading) {
        return;
      }

      this.loading = true;
      this.rewardAd.load().catch((err) => {
        console.error('[AdReward] load() 失败:', err);
        this.loading = false;
        this._processCallbacks(false, err);
      });
    });
  }

  showRewardAd(options = {}) {
    return new Promise((resolve, reject) => {
      const { rewardType = 'gems', rewardAmount = 10 } = options;

      this.loadRewardAd().then(() => {
        this.rewardAd.show().then(() => {
          this.currentReward = { type: rewardType, amount: rewardAmount };
        }).catch((err) => {
          console.error('[AdReward] show() 失败:', err);
          reject(err);
        });
      }).catch((err) => {
        reject(err);
      });

      const originalClose = this.rewardAd.onClose;
      this.rewardAd.onClose = (res) => {
        if (res && res.isEnded) {
          this._grantReward(rewardType, rewardAmount);
          resolve({ success: true, reward: { type: rewardType, amount: rewardAmount } });
        } else {
          reject(new Error('视频未观看完成'));
        }
        originalClose && originalClose(res);
      };
    });
  }

  showInterstitialAd() {
    return new Promise((resolve, reject) => {
      if (typeof wx === 'undefined' || !wx.createInterstitialAd) {
        reject(new Error('插屏广告不可用'));
        return;
      }

      if (!this.interstitialAd) {
        this.interstitialAd = wx.createInterstitialAd({
          adUnitId: 'adunit-xxxxxxxxxxxxxx'
        });

        this.interstitialAd.onLoad(() => {
          console.log('[AdReward] 插屏广告加载成功');
        });

        this.interstitialAd.onError((err) => {
          console.error('[AdReward] 插屏广告加载失败:', err);
        });

        this.interstitialAd.onClose(() => {
          console.log('[AdReward] 插屏广告关闭');
          resolve();
        });
      }

      this.interstitialAd.load().then(() => {
        this.interstitialAd.show().catch((err) => {
          console.error('[AdReward] 插屏广告show失败:', err);
          reject(err);
        });
      }).catch((err) => {
        reject(err);
      });
    });
  }

  showBannerAd(container) {
    if (typeof wx === 'undefined' || !wx.createBannerAd) {
      console.log('[AdReward] Banner广告不可用');
      return;
    }

    if (this.bannerAd) {
      this.bannerAd.hide();
    }

    this.bannerAd = wx.createBannerAd({
      adUnitId: 'adunit-xxxxxxxxxxxxxx',
      adIntervals: 30,
      style: {
        left: 0,
        top: 0,
        width: 320
      }
    });

    this.bannerAd.onLoad(() => {
      console.log('[AdReward] Banner广告加载成功');
      this.bannerAd.show();
    });

    this.bannerAd.onError((err) => {
      console.error('[AdReward] Banner广告加载失败:', err);
    });

    this.bannerAd.onClose(() => {
      console.log('[AdReward] Banner广告关闭');
    });

    this.bannerAd.load();
  }

  hideBannerAd() {
    if (this.bannerAd) {
      this.bannerAd.hide();
    }
  }

  destroy() {
    if (this.rewardAd) {
      this.rewardAd.destroy();
    }
    if (this.interstitialAd) {
      this.interstitialAd.destroy();
    }
    if (this.bannerAd) {
      this.bannerAd.destroy();
    }
  }

  static getInstance() {
    if (!AdRewardManager._instance) {
      AdRewardManager._instance = new AdRewardManager();
    }
    return AdRewardManager._instance;
  }
}

class AdRewardButton {
  constructor(ctx, canvas, systemInfo, options = {}) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.options = {
      x: options.x || this.width / 2 - 80,
      y: options.y || this.height - 120,
      width: options.width || 160,
      height: options.height || 48,
      rewardType: options.rewardType || 'gems',
      rewardAmount: options.rewardAmount || 10,
      text: options.text || '看视频领奖励',
      icon: options.icon || '🎬'
    };

    this.loading = false;
    this.manager = AdRewardManager.getInstance();

    this._clickHandler = this._onClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);

    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const { x, y, width, height, text, icon } = this.options;

    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, '#FF6B6B');
    gradient.addColorStop(1, '#FF8E53');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    this._roundRect(ctx, x, y, width, height, height / 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    
    const iconX = x + 25;
    ctx.font = '22px -apple-system';
    ctx.fillText(icon, iconX, y + height / 2 + 7);

    ctx.font = 'bold 15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.fillText(text, x + width / 2, y + height / 2 + 6);

    if (this.loading) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      this._roundRect(ctx, x, y, width, height, height / 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.fillText('加载中...', x + width / 2, y + height / 2 + 6);
    }
  }

  _onClick(e) {
    if (this.loading) return;

    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX;
    const y = t.clientY;

    const { x: btnX, y: btnY, width, height } = this.options;

    if (x >= btnX && x <= btnX + width && y >= btnY && y <= btnY + height) {
      this._showAd();
    }
  }

  async _showAd() {
    this.loading = true;
    this.draw();

    try {
      const result = await this.manager.showRewardAd({
        rewardType: this.options.rewardType,
        rewardAmount: this.options.rewardAmount
      });
      
      if (result && result.success) {
        if (this.onReward) {
          this.onReward(result.reward);
        }
      }
    } catch (err) {
      console.error('[AdRewardButton] 广告播放失败:', err);
      if (wx.showToast) {
        wx.showToast({
          title: '广告加载失败',
          icon: 'none'
        });
      }
    } finally {
      this.loading = false;
      this.draw();
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    const [tl, tr, br, bl] = r;
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }

  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = { AdRewardManager, AdRewardButton };
