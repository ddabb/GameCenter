/**
 * akari-core.js - 数灯核心逻辑
 * 常量、数据处理、验证函数
 */

const CELL_WHITE = 0;
const CELL_BLACK = 1;
const CELL_BLACK_0 = 2;
const CELL_BLACK_1 = 3;
const CELL_BLACK_2 = 4;
const CELL_BLACK_3 = 5;
const CELL_BLACK_4 = 6;

const DIFFICULTY_CONFIG = {
  easy: { text: '简单', size: 7 },
  medium: { text: '中等', size: 10 },
  hard: { text: '困难', size: 12 }
};

const LEVEL_COUNTS = { easy: 1000, medium: 1000, hard: 1000 };

function mapCell(cell) {
  if (typeof cell === 'number') return cell;
  if (cell === " " || cell === "." || cell === 0) return CELL_WHITE;
  if (cell === "#" || cell === -1) return CELL_BLACK;
  const num = parseInt(cell, 10);
  if (isNaN(num) || num < 0 || num > 4) return CELL_BLACK;
  return CELL_BLACK_0 + num;
}

/**
 * 更新光照状态
 */
function updateLit(grid, lights, size) {
  const lit = Array(size).fill(null).map(() => Array(size).fill(false));
  const rows = Math.min(size, grid.length);

  for (let r = 0; r < rows; r++) {
    const cols = Math.min(size, grid[r] ? grid[r].length : 0);
    for (let c = 0; c < cols; c++) {
      if (!lights[r] || !lights[r][c]) continue;
      lit[r][c] = true;
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (grid[nr][nc] >= CELL_BLACK) break;
          lit[nr][nc] = true;
          nr += dr;
          nc += dc;
        }
      }
    }
  }
  return lit;
}

/**
 * 检查是否完成：无冲突、数字满足、全部照亮
 */
function checkCompletion(grid, lights, lit, size) {
  // 灯泡互照检查
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (lights[r][c]) {
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          while (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (grid[nr][nc] >= CELL_BLACK) break;
            if (lights[nr][nc]) return false;
            nr += dr; nc += dc;
          }
        }
      }
    }
  }

  // 数字黑格检查
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell >= CELL_BLACK_0) {
        const required = cell - CELL_BLACK_0;
        let count = 0;
        if (r > 0 && lights[r - 1][c]) count++;
        if (r < size - 1 && lights[r + 1][c]) count++;
        if (c > 0 && lights[r][c - 1]) count++;
        if (c < size - 1 && lights[r][c + 1]) count++;
        if (count !== required) return false;
      }
    }
  }

  // 白格全部照亮
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] < CELL_BLACK && !lit[r][c]) return false;
    }
  }

  return true;
}

/**
 * 验证拼图，返回错误信息数组
 */
function verify(grid, lights, lit, size) {
  const errors = [];
  let lightConflict = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (lights[r][c]) {
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          while (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (grid[nr][nc] >= CELL_BLACK) break;
            if (lights[nr][nc]) { lightConflict++; break; }
            nr += dr; nc += dc;
          }
        }
      }
    }
  }
  if (lightConflict > 0) errors.push(`${lightConflict} 对灯塔互相照亮`);

  let numErrors = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell >= CELL_BLACK_0) {
        const required = cell - CELL_BLACK_0;
        let count = 0;
        if (r > 0 && lights[r - 1][c]) count++;
        if (r < size - 1 && lights[r + 1][c]) count++;
        if (c > 0 && lights[r][c - 1]) count++;
        if (c < size - 1 && lights[r][c + 1]) count++;
        if (count !== required) numErrors++;
      }
    }
  }
  if (numErrors > 0) errors.push(`${numErrors} 个数字黑格不满足`);

  let unlitCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] < CELL_BLACK && !lit[r][c]) unlitCount++;
    }
  }
  if (unlitCount > 0) errors.push(`${unlitCount} 个白格未被照亮`);

  return errors;
}

/**
 * 保存进度
 */
function saveProgress(gameName, level, difficulty) {
  try {
    const key = `progress_${gameName}_${difficulty}`;
    const saved = wx.getStorageSync(key);
    let progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
    if (level >= progress.unlocked) {
      progress.unlocked = level + 1;
    }
    if (!progress.stars[level]) {
      progress.stars[level] = 1;
    }
    wx.setStorageSync(key, JSON.stringify(progress));
  } catch (e) {}
}

module.exports = {
  CELL_WHITE,
  CELL_BLACK,
  CELL_BLACK_0,
  CELL_BLACK_1,
  CELL_BLACK_2,
  CELL_BLACK_3,
  CELL_BLACK_4,
  DIFFICULTY_CONFIG,
  LEVEL_COUNTS,
  mapCell,
  updateLit,
  checkCompletion,
  verify,
  saveProgress
};
