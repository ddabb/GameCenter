/**
 * achievement-manager.js — 成就系统 v2.0
 * 
 * 通用成就：每个游戏都有（首次通关/10关/50关）
 * 独有成就：每个游戏根据玩法设计的特色成就
 * 全局成就：跨游戏的里程碑
 */

// ========== 游戏配置 ==========
const GAMES = [
  'othello', 'akari', 'sokoban', 'nurikabe', 'tents',
  '24point', 'slither-link', 'nonogram', 'battleship',
  'merge-abc', 'sweep-frog', 'one-stroke'
];

const GAME_TITLES = {
  'othello': '黑白棋', 'akari': '灯塔', 'sokoban': '推箱子',
  'nurikabe': '数墙', 'tents': '帐篷', '24point': '24点',
  'slither-link': '数回', 'nonogram': '数织', 'battleship': '海战',
  'merge-abc': 'ABC合成', 'sweep-frog': '扫青蛙', 'one-stroke': '一笔画'
};

// ========== 通用成就（每个游戏自动生成） ==========
const GAME_ICONS = {
  'first_win': '🌟', 'win_10': '⭐', 'win_50': '🏅', 'win_100': '👑'
};
const GAME_TITLES_SUFFIX = {
  'first_win': '入门', 'win_10': '能手', 'win_50': '达人', 'win_100': '大师'
};

// ========== 独有成就（每个游戏特色） ==========
const UNIQUE_ACHIEVEMENTS = {
  'othello': [
    { id: 'othello_perfect', title: '完美碾压', desc: '黑白棋以64:0获胜', icon: '💎' },
    { id: 'othello_corner', title: '角霸天下', desc: '一局内占领4个角', icon: '🔲' },
    { id: 'othello_comeback', title: '绝地翻盘', desc: '中盘落后20子以上最终获胜', icon: '🔄' },
  ],
  'akari': [
    { id: 'akari_speed_5', title: '闪电点灯', desc: '5秒内完成一关灯塔', icon: '⚡' },
    { id: 'akari_no_hint', title: '独立思考', desc: '连续10关不使用提示', icon: '🧠' },
    { id: 'akari_hard_10', title: '暗夜行者', desc: '通关10个困难灯塔', icon: '🌑' },
  ],
  'sokoban': [
    { id: 'sokoban_no_undo', title: '从不回头', desc: '连续5关不使用撤销', icon: '➡️' },
    { id: 'sokoban_optimal', title: '最短路径', desc: '以最优步数通关10关', icon: '🎯' },
    { id: 'sokoban_50', title: '推箱达人', desc: '通关50关推箱子', icon: '📦' },
  ],
  'nurikabe': [
    { id: 'nurikabe_speed_10', title: '速砌高手', desc: '10秒内完成一关数墙', icon: '🏗️' },
    { id: 'nurikabe_no_hint', title: '无师自通', desc: '连续10关不使用提示', icon: '🎓' },
    { id: 'nurikabe_hard_10', title: '铁壁铜墙', desc: '通关10个困难数墙', icon: '🏰' },
  ],
  'tents': [
    { id: 'tents_perfect', title: '安营扎寨', desc: '连续20关无错误', icon: '⛺' },
    { id: 'tents_speed', title: '快速部署', desc: '10秒内完成一关帐篷', icon: '🏃' },
    { id: 'tents_hard_10', title: '野外生存', desc: '通关10个困难帐篷', icon: '🌲' },
  ],
  '24point': [
    { id: '24point_speed', title: '心算达人', desc: '3秒内算出24点', icon: '🧮' },
    { id: '24point_streak_10', title: '连胜达人', desc: '连续答对10道24点', icon: '🔥' },
    { id: '24point_streak_50', title: '算无遗策', desc: '连续答对50道24点', icon: '💯' },
  ],
  'slither-link': [
    { id: 'slither_speed_30', title: '回路高手', desc: '30秒内完成一关数回', icon: '🔄' },
    { id: 'slither_no_hint', title: '独立成环', desc: '连续10关不使用提示', icon: '🔗' },
    { id: 'slither_hard_10', title: '终极回路', desc: '通关10个困难数回', icon: '🌀' },
  ],
  'nonogram': [
    { id: 'nonogram_15x15', title: '大图拼者', desc: '完成15×15数织', icon: '🖼️' },
    { id: 'nonogram_no_wrong', title: '零失误', desc: '不填错任何格子完成一关', icon: '✨' },
    { id: 'nonogram_50', title: '像素大师', desc: '通关50关数织', icon: '🎨' },
  ],
  'battleship': [
    { id: 'battleship_no_miss', title: '百发百中', desc: '一关内没有误击', icon: '🎯' },
    { id: 'battleship_speed', title: '雷厉风行', desc: '30秒内完成一关海战', icon: '⚡' },
    { id: 'battleship_50', title: '海军上将', desc: '通关50关海战', icon: '⚓' },
  ],
  'merge-abc': [
    { id: 'merge_letter_z', title: '字母终点', desc: '合成出字母Z', icon: '🔤' },
    { id: 'merge_score_1000', title: '千分玩家', desc: '单局得分超过1000', icon: '💰' },
    { id: 'merge_combo_5', title: '五连合体', desc: '单局连续合成5次', icon: '🎪' },
  ],
  'sweep-frog': [
    { id: 'frog_no_wrong', title: '安全着陆', desc: '不踩雷完成一关', icon: '🐸' },
    { id: 'frog_speed', title: '蛙跳高手', desc: '10秒内完成一关', icon: '💨' },
    { id: 'frog_50', title: '蛙鸣四方', desc: '通关50关扫青蛙', icon: '🌿' },
  ],
  'one-stroke': [
    { id: 'onestroke_no_undo', title: '一气呵成', desc: '不撤销完成一关', icon: '✍️' },
    { id: 'onestroke_speed', title: '行云流水', desc: '10秒内完成一关一笔画', icon: '🌊' },
    { id: 'onestroke_hard_10', title: '铁笔银钩', desc: '通关10个困难一笔画', icon: '🖊️' },
  ],
};

// ========== 全局成就 ==========
const GLOBAL_ACHIEVEMENTS = [
  { id: 'all_game_first', title: '全面发展', desc: '所有游戏至少通关1关', icon: '🏆' },
  { id: 'total_100', title: '百关斩将', desc: '总计通关100关', icon: '💯' },
  { id: 'total_500', title: '五百里程碑', desc: '总计通关500关', icon: '🎊' },
  { id: 'total_1000', title: '千关传奇', desc: '总计通关1000关', icon: '👑' },
  { id: 'checkin_7', title: '七日之约', desc: '连续签到7天', icon: '📅' },
  { id: 'checkin_30', title: '月度常客', desc: '连续签到30天', icon: '🗓️' },
  { id: 'all_unique_1', title: '多面手', desc: '每个游戏解锁至少1个独有成就', icon: '🌈' },
];

// ========== 构建完整成就列表 ==========
function buildAllAchievements() {
  const all = [];
  
  // 全局成就
  all.push(...GLOBAL_ACHIEVEMENTS);
  
  // 每个游戏的通用成就
  GAMES.forEach(g => {
    const title = GAME_TITLES[g];
    ['first_win', 'win_10', 'win_50', 'win_100'].forEach(suffix => {
      all.push({
        id: `${suffix}_${g}`,
        title: `${title}${GAME_TITLES_SUFFIX[suffix]}`,
        desc: suffix === 'first_win' ? `首次通关${title}` : `通关${title} ${suffix.replace('win_','')}关`,
        icon: GAME_ICONS[suffix]
      });
    });
  });
  
  // 每个游戏的独有成就
  GAMES.forEach(g => {
    if (UNIQUE_ACHIEVEMENTS[g]) {
      all.push(...UNIQUE_ACHIEVEMENTS[g]);
    }
  });
  
  return all;
}

const ALL_ACHIEVEMENTS = buildAllAchievements();

// ========== AchievementManager ==========
class AchievementManager {
  constructor() {
    this.storageKey = 'achievements';
    this.data = this._load();
  }

  _load() {
    try {
      const d = wx.getStorageSync(this.storageKey);
      return d ? JSON.parse(d) : { unlocked: {}, newlyUnlocked: [] };
    } catch (e) {
      return { unlocked: {}, newlyUnlocked: [] };
    }
  }

  _save() {
    try {
      wx.setStorageSync(this.storageKey, JSON.stringify(this.data));
    } catch (e) {}
  }

  /**
   * 通关后检查通用成就 + 全局成就
   * @param {string} gameName 游戏名
   * @param {number} winCount 该游戏通关数
   * @returns {Array} 新解锁的成就列表
   */
  check(gameName, winCount) {
    const newly = [];
    const milestones = [
      { count: 1, suffix: 'first_win' },
      { count: 10, suffix: 'win_10' },
      { count: 50, suffix: 'win_50' },
      { count: 100, suffix: 'win_100' }
    ];

    // 通用成就
    milestones.forEach(m => {
      if (winCount >= m.count) {
        const id = `${m.suffix}_${gameName}`;
        if (!this.data.unlocked[id]) {
          this.data.unlocked[id] = Date.now();
          newly.push(ALL_ACHIEVEMENTS.find(a => a.id === id));
        }
      }
    });

    // "所有游戏首次通关"
    const gameKeys = GAMES.map(g => `first_win_${g}`);
    if (gameKeys.every(k => this.data.unlocked[k]) && !this.data.unlocked['all_game_first']) {
      this.data.unlocked['all_game_first'] = Date.now();
      newly.push(ALL_ACHIEVEMENTS.find(a => a.id === 'all_game_first'));
    }

    // 总通关数成就
    let totalWins = 0;
    GAMES.forEach(g => {
      try {
        const p = JSON.parse(wx.getStorageSync(`progress_${g}`) || '{}');
        totalWins += p.unlocked || 0;
      } catch (e) {}
    });
    [{ id: 'total_100', count: 100 }, { id: 'total_500', count: 500 }, { id: 'total_1000', count: 1000 }].forEach(m => {
      if (totalWins >= m.count && !this.data.unlocked[m.id]) {
        this.data.unlocked[m.id] = Date.now();
        newly.push(ALL_ACHIEVEMENTS.find(a => a.id === m.id));
      }
    });

    // "多面手"：每个游戏至少1个独有成就
    const uniqueIds = GAMES.map(g => (UNIQUE_ACHIEVEMENTS[g] || []).map(a => a.id));
    const hasOneEach = uniqueIds.every(ids => ids.some(id => this.data.unlocked[id]));
    if (hasOneEach && !this.data.unlocked['all_unique_1']) {
      this.data.unlocked['all_unique_1'] = Date.now();
      newly.push(ALL_ACHIEVEMENTS.find(a => a.id === 'all_unique_1'));
    }

    if (newly.length > 0) {
      this.data.newlyUnlocked = (this.data.newlyUnlocked || []).concat(newly.map(a => a.id));
      this._save();
    }
    return newly.filter(Boolean);
  }

  /**
   * 解锁指定独有成就（各游戏内部调用）
   * @param {string} achievementId 独有成就ID
   * @returns {object|null} 解锁的成就，如已解锁返回null
   */
  unlock(achievementId) {
    if (this.data.unlocked[achievementId]) return null;
    this.data.unlocked[achievementId] = Date.now();
    this.data.newlyUnlocked = (this.data.newlyUnlocked || []).concat([achievementId]);
    this._save();
    return ALL_ACHIEVEMENTS.find(a => a.id === achievementId) || null;
  }

  /**
   * 检查签到成就
   * @param {number} streak 连续签到天数
   */
  checkCheckIn(streak) {
    const newly = [];
    [{ id: 'checkin_7', days: 7 }, { id: 'checkin_30', days: 30 }].forEach(m => {
      if (streak >= m.days && !this.data.unlocked[m.id]) {
        this.data.unlocked[m.id] = Date.now();
        newly.push(ALL_ACHIEVEMENTS.find(a => a.id === m.id));
      }
    });
    if (newly.length > 0) {
      this.data.newlyUnlocked = (this.data.newlyUnlocked || []).concat(newly.map(a => a.id));
      this._save();
    }
    return newly.filter(Boolean);
  }

  /**
   * 获取新解锁的成就（弹窗用），获取后清空
   */
  getNewlyUnlocked() {
    const ids = this.data.newlyUnlocked || [];
    if (ids.length === 0) return null;
    this.data.newlyUnlocked = [];
    this._save();
    return ids.map(id => ALL_ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
  }

  /**
   * 获取当前游戏通关数（从storage读取）
   */
  _getWinCount(gameName) {
    try {
      const p = JSON.parse(wx.getStorageSync('progress_' + gameName) || '{}');
      return p.unlocked || 0;
    } catch (e) { return 0; }
  }

  /**
   * 计算成就的进度和目标
   */
  _enrichProgress(a) {
    // 通用成就（按游戏）
    const genMatch = a.id.match(/^(first_win|win_10|win_50|win_100)_([^_]+)$/);
    if (genMatch) {
      const suffix = genMatch[1];
      const game = genMatch[2];
      const target = suffix === 'first_win' ? 1 : parseInt(suffix.replace('win_', ''));
      const current = this._getWinCount(game);
      return {
        ...a,
        progress: Math.min(current, target),
        target
      };
    }
    // 全局成就
    const globalTargets = {
      'total_100': 100, 'total_500': 500, 'total_1000': 1000,
      'checkin_7': 7, 'checkin_30': 30
    };
    if (globalTargets[a.id] !== undefined) {
      return { ...a, progress: 0, target: globalTargets[a.id] };
    }
    // 独有成就和"全面发展"/"多面手"：无进度条
    return { ...a, progress: 0, target: 1 };
  }

  /**
   * 获取所有成就（按游戏分组）
   */
  getAll() {
    return ALL_ACHIEVEMENTS.map(a => ({
      ...this._enrichProgress(a),
      unlocked: !!this.data.unlocked[a.id],
      unlockedAt: this.data.unlocked[a.id] || null
    }));
  }

  /**
   * 按游戏分组获取成就
   */
  getByGame() {
    const result = { _global: [], _unique: {} };
    GAMES.forEach(g => { result._unique[g] = []; });
    
    this.getAll().forEach(a => {
      // 判断是否为某游戏的成就
      const gameMatch = GAMES.find(g => a.id.endsWith(`_${g}`) || a.id.startsWith(`${g}_`));
      if (a.id.startsWith('first_win_') || a.id.startsWith('win_10_') || a.id.startsWith('win_50_') || a.id.startsWith('win_100_')) {
        const g = a.id.split('_').slice(-1)[0] || a.id.split('_').slice(-2).join('-');
        // 通用成就归入对应游戏
        const gn = a.id.replace(/^(first_win|win_10|win_50|win_100)_/, '');
        if (!result._unique[gn]) result._unique[gn] = [];
        result._unique[gn].push(a);
      } else if (UNIQUE_ACHIEVEMENTS[gameMatch]) {
        if (!result._unique[gameMatch]) result._unique[gameMatch] = [];
        result._unique[gameMatch].push(a);
      } else {
        result._global.push(a);
      }
    });
    return result;
  }

  getUnlockedCount() {
    return Object.keys(this.data.unlocked).length;
  }

  getTotalCount() {
    return ALL_ACHIEVEMENTS.length;
  }

  /**
   * 获取已解锁的成就列表（用于成就页面展示）
   */
  getUnlocked() {
    return this.getAll().filter(a => a.unlocked);
  }

  /**
   * 获取未解锁的成就列表（用于成就页面展示）
   */
  getLocked() {
    return this.getAll().filter(a => !a.unlocked);
  }

  static getInstance() {
    if (!AchievementManager._instance) {
      AchievementManager._instance = new AchievementManager();
    }
    return AchievementManager._instance;
  }
}

module.exports = { AchievementManager, ALL_ACHIEVEMENTS, UNIQUE_ACHIEVEMENTS };
