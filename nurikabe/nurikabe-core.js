/**
 * nurikabe-core.js — 数墙核心逻辑
 */
const CELL_WHITE = 0;
const CELL_BLACK = 1;

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * 检查白色区域内 2×2 全黑 → 违反规则
 */
function _hasBlack2x2(board, size) {
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      if (board[r][c] === CELL_BLACK &&
          board[r][c + 1] === CELL_BLACK &&
          board[r + 1][c] === CELL_BLACK &&
          board[r + 1][c + 1] === CELL_BLACK) {
        return true;
      }
    }
  }
  return false;
}

/**
 * BFS 划分白色连通区域，返回 regionOf 二维数组（-1 表示非白格）
 */
function _splitWhiteRegions(board, size) {
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const regionOf = Array.from({ length: size }, () => Array(size).fill(-1));
  let regionId = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!visited[r][c] && board[r][c] === CELL_WHITE) {
        const queue = [[r, c]];
        visited[r][c] = true;
        while (queue.length > 0) {
          const [cr, cc] = queue.shift();
          regionOf[cr][cc] = regionId;
          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nr = cr + dr, nc = cc + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size &&
                !visited[nr][nc] && board[nr][nc] === CELL_WHITE) {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
            }
          }
        }
        regionId++;
      }
    }
  }
  return { regionOf, regionCount: regionId };
}

/**
 * 检查白色区域是否满足：每个区域恰好一个数字 & 区域大小=数字
 */
function _whiteRegionsValid(board, numbers, size, regionOf, regionCount) {
  const numberInRegion = {};
  let numberCount = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (numbers[r] && numbers[r][c] > 0) {
        numberCount++;
        const rid = regionOf[r][c];
        if (rid === -1) return false;                       // 数字格在黑格中
        if (numberInRegion[rid] !== undefined) return false; // 一区域多数字
        numberInRegion[rid] = numbers[r][c];
      }
    }
  }

  if (Object.keys(numberInRegion).length !== numberCount) return false;
  if (regionCount !== numberCount) return false;

  // 统计每个区域的大小
  const regionSizeMap = {};
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regionOf[r][c] !== -1) {
        regionSizeMap[regionOf[r][c]] = (regionSizeMap[regionOf[r][c]] || 0) + 1;
      }
    }
  }
  for (const rid in numberInRegion) {
    if (regionSizeMap[rid] !== numberInRegion[rid]) return false;
  }
  return true;
}

/**
 * 检查所有黑格是否连通
 */
function _areBlackCellsConnected(board, size) {
  let startR = -1, startC = -1;
  for (let r = 0; r < size && startR === -1; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === CELL_BLACK) { startR = r; startC = c; break; }
    }
  }
  if (startR === -1) return true; // 没有黑格，也算连通

  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const queue = [[startR, startC]];
  let count = 0;
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    if (r < 0 || r >= size || c < 0 || c >= size) continue;
    if (visited[r][c] || board[r][c] !== CELL_BLACK) continue;
    visited[r][c] = true;
    count++;
    queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }

  let totalBlack = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (board[r][c] === CELL_BLACK) totalBlack++;
  return count === totalBlack;
}

/**
 * 完整通关检查（规则 1~4）
 * @returns {boolean}
 */
function checkCompletion(board, numbers, size) {
  if (!board || board.length === 0) return false;

  // 1. 无 2×2 全黑
  if (_hasBlack2x2(board, size)) return false;

  // 2. 白色区域划分
  const { regionOf, regionCount } = _splitWhiteRegions(board, size);

  // 3. 每个白色区域恰好一个数字，且区域大小=数字
  if (!_whiteRegionsValid(board, numbers, size, regionOf, regionCount)) return false;

  // 4. 黑格连通
  if (!_areBlackCellsConnected(board, size)) return false;

  return true;
}

/**
 * 保存关卡进度
 */
function saveProgress(gameName, difficulty, level) {
  try {
    const key = 'progress_' + gameName + '_' + (difficulty || 'easy');
    const saved = wx.getStorageSync(key);
    const progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
    if (level >= progress.unlocked) progress.unlocked = level + 1;
    if (!progress.stars[level]) progress.stars[level] = 1;
    wx.setStorageSync(key, JSON.stringify(progress));
  } catch (e) {
    console.log('保存进度失败', e);
  }
}

module.exports = {
  CELL_WHITE,
  CELL_BLACK,
  formatTime,
  checkCompletion,
  _areBlackCellsConnected,
  saveProgress
};
