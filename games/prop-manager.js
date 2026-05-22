/**
 * prop-manager.js - 道具管理系统
 * 
 * 功能：
 *   - 道具购买、获取、消耗
 *   - 道具库存管理
 *   - 每游戏每关卡使用限制
 *   - 每日/每周任务奖励
 *   - 激励视频获取道具
 */

const PROP_CONFIG = {
  hint: { name: '提示', icon: '💡', desc: '显示一个格子的正确答案', price: 10, perLevel: 3 },
  undo: { name: '撤销', icon: '↩️', desc: '撤销上一步操作', price: 5, perLevel: 0 },
  answer: { name: '答案', icon: '🔍', desc: '直接显示本关答案', price: 50, perLevel: 1 },
  extra_life: { name: '额外生命', icon: '❤️', desc: '错误时不立即结束', price: 30, perLevel: 1 },
};

class PropManager {
  constructor() {
    this.storageKey = 'prop_bag';
    this.usageKey = 'prop_usage';
    this.dailyKey = 'prop_daily';
    this._bag = this._loadBag();
    this._usage = this._loadUsage();
    this._daily = this._loadDaily();
  }

  _loadBag() {
    try {
      const data = wx.getStorageSync(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  _loadUsage() {
    try {
      const data = wx.getStorageSync(this.usageKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  _loadDaily() {
    try {
      const data = wx.getStorageSync(this.dailyKey);
      const today = this._getToday();
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.date === today) {
          return parsed;
        }
      }
      return { date: today, hints: 0, undos: 0, answers: 0 };
    } catch (e) {
      return { date: this._getToday(), hints: 0, undos: 0, answers: 0 };
    }
  }

  _getToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  _saveBag() {
    try {
      wx.setStorageSync(this.storageKey, JSON.stringify(this._bag));
    } catch (e) {}
  }

  _saveUsage() {
    try {
      wx.setStorageSync(this.usageKey, JSON.stringify(this._usage));
    } catch (e) {}
  }

  _saveDaily() {
    try {
      wx.setStorageSync(this.dailyKey, JSON.stringify(this._daily));
    } catch (e) {}
  }

  getPropCount(propKey) {
    return this._bag[propKey] || 0;
  }

  getAllProps() {
    return { ...this._bag };
  }

  addProp(propKey, count = 1) {
    if (!PROP_CONFIG[propKey]) return false;
    this._bag[propKey] = (this._bag[propKey] || 0) + count;
    this._saveBag();
    return true;
  }

  useProp(propKey, gameName, level, difficulty) {
    if (!PROP_CONFIG[propKey]) return false;
    
    const count = this.getPropCount(propKey);
    if (count <= 0) return false;

    const levelKey = `${gameName}_${difficulty}_${level}`;
    const config = PROP_CONFIG[propKey];
    
    if (config.perLevel > 0) {
      const key = `${propKey}_${levelKey}`;
      const used = this._usage[key] || 0;
      if (used >= config.perLevel) {
        wx.showToast({ title: `本关${config.name}次数已用完`, icon: 'none' });
        return false;
      }
      this._usage[key] = used + 1;
      this._saveUsage();
    }

    this._bag[propKey]--;
    this._saveBag();

    if (propKey === 'hint') {
      this._daily.hints++;
    } else if (propKey === 'undo') {
      this._daily.undos++;
    } else if (propKey === 'answer') {
      this._daily.answers++;
    }
    this._saveDaily();

    return true;
  }

  getUsageCount(propKey, gameName, level, difficulty) {
    const levelKey = `${gameName}_${difficulty}_${level}`;
    const key = `${propKey}_${levelKey}`;
    return this._usage[key] || 0;
  }

  getRemainingUses(propKey, gameName, level, difficulty) {
    const config = PROP_CONFIG[propKey];
    if (!config || config.perLevel === 0) return Infinity;
    const used = this.getUsageCount(propKey, gameName, level, difficulty);
    return Math.max(0, config.perLevel - used);
  }

  canUseProp(propKey) {
    return this.getPropCount(propKey) > 0;
  }

  resetLevelUsage(gameName, level, difficulty) {
    const levelKey = `${gameName}_${difficulty}_${level}`;
    for (const propKey of Object.keys(PROP_CONFIG)) {
      const key = `${propKey}_${levelKey}`;
      delete this._usage[key];
    }
    this._saveUsage();
  }

  getDailyStats() {
    return { ...this._daily };
  }

  addReward(type, amount = 1) {
    switch (type) {
      case 'hint':
      case 'hints':
        this.addProp('hint', amount);
        break;
      case 'undo':
      case 'undos':
        this.addProp('undo', amount);
        break;
      case 'answer':
      case 'answers':
        this.addProp('answer', amount);
        break;
      case 'extra_life':
        this.addProp('extra_life', amount);
        break;
      case 'coins':
        try {
          const checkin = require('./check-in');
          checkin.addCoins(amount);
        } catch (e) {}
        break;
      case 'gems':
        try {
          const checkin = require('./check-in');
          checkin.addGems(amount);
        } catch (e) {}
        break;
      default:
        return false;
    }
    return true;
  }

  clear() {
    this._bag = {};
    this._saveBag();
  }
}

let _instance = null;

function getInstance() {
  if (!_instance) {
    _instance = new PropManager();
  }
  return _instance;
}

module.exports = { PropManager, getInstance, PROP_CONFIG };
