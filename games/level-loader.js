/**
 * 关卡数据加载器
 * 从本地 data/ 目录加载各游戏的关卡数据
 * 支持难度分级（akari/tents/slither-link）
 */
class LevelLoader {
  static load(gameName, level, difficulty = 'easy') {
    const basePath = 'data';
    let puzzle = null;
    
    switch (gameName) {
      case 'slither-link':
        puzzle = LevelLoader.loadSlitherLink(level, difficulty);
        break;
      case 'akari':
        puzzle = LevelLoader.loadAkari(level, difficulty);
        break;
      case 'tents':
        puzzle = LevelLoader.loadTents(level, difficulty);
        break;
      case 'nonogram':
        puzzle = LevelLoader.loadNonogram(level);
        break;
      case 'sokoban':
        puzzle = LevelLoader.loadSokoban(level);
        break;
      case 'nurikabe':
        puzzle = LevelLoader.loadNurikabe(level);
        break;
      case 'battleship':
        puzzle = LevelLoader.loadBattleship(level);
        break;
      case 'number-one':
        puzzle = LevelLoader.loadNumberOne(level);
        break;
      case 'merge-abc':
        puzzle = LevelLoader.loadMergeAbc(level);
        break;
      case '24point':
        puzzle = LevelLoader.load24Point(level);
        break;
      case 'othello':
        puzzle = LevelLoader.loadOthello(level);
        break;
      default:
        return null;
    }
    
    return puzzle;
  }
  
  static getIndex(gameName) {
    try {
      return require(`./${gameName}/index.json`);
    } catch (e) {
      return null;
    }
  }
  
  // 难度分级支持：akari/tents/slither-link 根据 difficulty 加载对应目录
  static loadSlitherLink(level, difficulty = 'easy') {
    try {
      const safeLevel = String(level).padStart(4, '0');
      const dir = difficulty || 'easy';
      
      try {
        const file = require(`./slither-link/${dir}/${dir}-${safeLevel}.json`);
        return {
          id: file.id,
          size: file.size,
          grid: file.grid,
          answer: file.answer,
          difficulty: dir
        };
      } catch (e) {
        return null;
      }
    } catch (e) {
      return null;
    }
  }
  
  static loadAkari(level, difficulty = 'easy') {
    try {
      const safeLevel = String(level).padStart(4, '0');
      const dir = difficulty || 'easy';
      
      try {
        const file = require(`./akari/${dir}/${dir}-${safeLevel}.json`);
        return {
          id: file.id,
          size: file.size,
          grid: file.grid,
          clues: file.clues,
          difficulty: dir
        };
      } catch (e) {
        return null;
      }
    } catch (e) {
      return null;
    }
  }
  
  static loadTents(level, difficulty = 'easy') {
    try {
      const safeLevel = String(level).padStart(4, '0');
      const dir = difficulty || 'easy';
      
      try {
        const file = require(`./tents/${dir}/${dir}-${safeLevel}.json`);
        return {
          id: file.id,
          size: file.size,
          grid: file.grid,
          tents: file.tents,
          treeCount: file.treeCount,
          rowCounts: file.rowCounts,
          colCounts: file.colCounts,
          difficulty: dir
        };
      } catch (e) {
        return null;
      }
    } catch (e) {
      return null;
    }
  }
  
  static loadNonogram(level) {
    try {
      const safeLevel = String(level).padStart(4, '0');
      const file = require(`./nonogram/nonogram-${safeLevel}.json`);
      return {
        id: file.id,
        rows: file.rows,
        cols: file.cols,
        clues: file.clues,
        grid: file.grid || null,
        difficulty: file.difficulty || 'medium'
      };
    } catch (e) {
      return null;
    }
  }
  
  static loadSokoban(level) {
    try {
      const safeLevel = String(level).padStart(4, '0');
      const file = require(`./sokoban/sokoban-${safeLevel}.json`);
      return {
        id: file.id,
        grid: file.grid,
        moves: file.moves,
        difficulty: file.difficulty || 'medium'
      };
    } catch (e) {
      return null;
    }
  }
  
  static loadNurikabe(level) {
    try {
      const safeLevel = String(level).padStart(4, '0');
      const file = require(`./nurikabe/nurikabe-${safeLevel}.json`);
      return {
        id: file.id,
        size: file.size,
        clues: file.clues,
        grid: file.grid || null,
        difficulty: file.difficulty || 'medium'
      };
    } catch (e) {
      return null;
    }
  }
  
  static loadBattleship(level) {
    try {
      const safeLevel = String(level).padStart(4, '0');
      const file = require(`./battleship/easy-${safeLevel}.json`);
      return file;
    } catch (e) {
      try {
        const file = require(`./battleship/battleship-${String(level).padStart(4, '0')}.json`);
        return file;
      } catch (e2) { return null; }
    }
  }
  
  static loadNumberOne(level) {
    try {
      const file = require(`./number-one/number-one-${String(level).padStart(4, '0')}.json`);
      return file;
    } catch (e) {
      return null;
    }
  }
  
  static loadMergeAbc(level) {
    try {
      const safeLevel = String(level).padStart(4, '0');
      const file = require(`./merge-abc/merge-abc-${safeLevel}.json`);
      return file;
    } catch (e) {
      return null;
    }
  }
  
  static load24Point(level) {
    return null;
  }
  
  static loadOthello(level) {
    return null;
  }
}

module.exports = LevelLoader;
