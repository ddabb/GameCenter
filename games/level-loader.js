/**
 * 关卡数据加载器
 * 优先从 CDN（jsDelivr + GitHub）加载，失败时回退本地 data/ 目录
 * 所有方法均返回 Promise
 */
const config = require('./cloud-config.js');

class LevelLoader {

  /* ========== CDN 抓取 ========== */

  static fetchFromCDN(url) {
    return new Promise((resolve, reject) => {
      tt.request({
        url: url + '?t=' + Date.now(),   // 防缓存
        method: 'GET',
        timeout: config.cdn.timeout || 10000,
        success(res) {
          if (res.statusCode === 200 && res.data) {
            resolve(res.data);
          } else {
            reject(new Error('HTTP ' + res.statusCode));
          }
        },
        fail(err) {
          reject(err);
        }
      });
    });
  }

  /* ========== 构造 CDN URL ========== */

  static getCDNUrl(gameName, level, difficulty) {
    const pad = String(level).padStart(4, '0');
    const base = config.cdn.baseUrl.replace(/\/$/, '');

    switch (gameName) {
      // 有难度子目录的三款
      case 'akari':
      case 'tents':
      case 'slither-link':
        return base + '/' + gameName + '/' + difficulty + '/' + difficulty + '-' + pad + '.json';

      // 扁平结构（文件名带 easy- 前缀）
      case 'battleship':
        return base + '/' + gameName + '/easy-' + pad + '.json';

      // 扁平结构（文件名带游戏名前缀）
      case 'nonogram':
        return base + '/' + gameName + '/nonogram-' + pad + '.json';
      case 'sokoban':
        return base + '/' + gameName + '/sokoban-' + pad + '.json';
      case 'nurikabe':
        return base + '/' + gameName + '/nurikabe-' + pad + '.json';

      // 程序生成，无 CDN 文件
      case '24point':
      case 'merge-abc':
      case 'othello':
      case 'number-one':
        return null;

      default:
        return null;
    }
  }

  /* ========== 主入口（async） ========== */

  static async load(gameName, level, difficulty = 'easy') {
    // 1. 尝试 CDN
    if (config.cdn.enabled) {
      const url = LevelLoader.getCDNUrl(gameName, level, difficulty);
      if (url) {
        try {
          const data = await LevelLoader.fetchFromCDN(url);
          return LevelLoader.normalize(gameName, data, level, difficulty);
        } catch (e) {
          if (config.debug) {
            console.warn('[LevelLoader] CDN 失败，回退本地:', gameName, level, e);
          }
        }
      }
    }

    // 2. 本地 fallback
    switch (gameName) {
      case 'slither-link': return LevelLoader.loadSlitherLink(level, difficulty);
      case 'akari':       return LevelLoader.loadAkari(level, difficulty);
      case 'tents':      return LevelLoader.loadTents(level, difficulty);
      case 'nonogram':   return LevelLoader.loadNonogram(level);
      case 'sokoban':    return LevelLoader.loadSokoban(level);
      case 'nurikabe':   return LevelLoader.loadNurikabe(level);
      case 'battleship': return LevelLoader.loadBattleship(level);
      case 'number-one': return LevelLoader.loadNumberOne(level);
      case 'merge-abc':  return LevelLoader.loadMergeAbc(level);
      case '24point':    return LevelLoader.load24Point(level);
      case 'othello':    return LevelLoader.loadOthello(level);
      default:            return null;
    }
  }

  /* ========== 数据标准化 ========== */

  static normalize(gameName, data, level, difficulty) {
    // CDN 文件格式与本地 require 完全一致，直接返回
    // 若后续格式有差异，在此统一转换
    return data;
  }

  /* ========== 本地加载方法（原有逻辑，同步） ========== */

  static loadSlitherLink(level, difficulty) {
    try {
      const pad = String(level).padStart(4, '0');
      const dir = difficulty || 'easy';
      const file = require('./slither-link/' + dir + '/' + dir + '-' + pad + '.json');
      return { id: file.id, size: file.size, grid: file.grid, answer: file.answer, difficulty: dir };
    } catch (e) { return null; }
  }

  static loadAkari(level, difficulty) {
    try {
      const pad = String(level).padStart(4, '0');
      const dir = difficulty || 'easy';
      const file = require('./akari/' + dir + '/' + dir + '-' + pad + '.json');
      return { id: file.id, size: file.size, grid: file.grid, clues: file.clues, difficulty: dir };
    } catch (e) { return null; }
  }

  static loadTents(level, difficulty) {
    try {
      const pad = String(level).padStart(4, '0');
      const dir = difficulty || 'easy';
      const file = require('./tents/' + dir + '/' + dir + '-' + pad + '.json');
      return { id: file.id, size: file.size, grid: file.grid, tents: file.tents,
               treeCount: file.treeCount, rowCounts: file.rowCounts,
               colCounts: file.colCounts, difficulty: dir };
    } catch (e) { return null; }
  }

  static loadNonogram(level) {
    try {
      const pad = String(level).padStart(4, '0');
      const file = require('./nonogram/nonogram-' + pad + '.json');
      return { id: file.id, rows: file.rows, cols: file.cols,
               clues: file.clues, grid: file.grid || null,
               difficulty: file.difficulty || 'medium' };
    } catch (e) { return null; }
  }

  static loadSokoban(level) {
    try {
      const pad = String(level).padStart(4, '0');
      const file = require('./sokoban/sokoban-' + pad + '.json');
      return { id: file.id, grid: file.grid, moves: file.moves,
               difficulty: file.difficulty || 'medium' };
    } catch (e) { return null; }
  }

  static loadNurikabe(level) {
    try {
      const pad = String(level).padStart(4, '0');
      const file = require('./nurikabe/nurikabe-' + pad + '.json');
      return { id: file.id, size: file.size, clues: file.clues,
               grid: file.grid || null,
               difficulty: file.difficulty || 'medium' };
    } catch (e) { return null; }
  }

  static loadBattleship(level) {
    try {
      const pad = String(level).padStart(4, '0');
      return require('./battleship/easy-' + pad + '.json');
    } catch (e1) {
      try {
        return require('./battleship/battleship-' + pad + '.json');
      } catch (e2) { return null; }
    }
  }

  static loadNumberOne(level) {
    try {
      const pad = String(level).padStart(4, '0');
      return require('./number-one/number-one-' + pad + '.json');
    } catch (e) { return null; }
  }

  static loadMergeAbc(level) {
    try {
      const pad = String(level).padStart(4, '0');
      return require('./merge-abc/merge-abc-' + pad + '.json');
    } catch (e) { return null; }
  }

  static load24Point() { return null; }
  static loadOthello()  { return null; }

  /* ========== index.json 读取（用于关卡列表） ========== */

  static getIndex(gameName) {
    try { return require('./' + gameName + '/index.json'); }
    catch (e) { return null; }
  }
}

module.exports = LevelLoader;
