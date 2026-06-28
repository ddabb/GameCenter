/**
 * battleship-core.js — 战舰谜题核心逻辑（纯函数 + 数据常量）
 *
 * 包含：
 *   - 棋盘常量（空白/战舰）
 *   - 布局计算（格子大小、偏移量、提示区域）
 *   - 谜题数据处理（CDN数据解析、内置生成器）
 *   - 通关检查（行列计数匹配、战舰形状验证、相邻检查）
 *   - 进度保存
 *
 * 游戏规则：
 *   1. 边缘数字表示该行/列的战舰格子总数
 *   2. 战舰必须为直线（水平或垂直），不能对角线
 *   3. 不同战舰之间不能相邻（8方向）
 */

const CELL_EMPTY = 0;
const CELL_SHIP = 1;
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/battleship';

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    const radii = Array.isArray(r) ? r : [r, r, r, r];
    ctx.roundRect(x, y, w, h, radii);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function getSizeByDifficulty(difficulty) {
  switch (difficulty) {
    case 'easy': return 6;
    case 'medium': return 8;
    case 'hard': return 10;
    default: return 6;
  }
}

function calcCellSize(width, height, size) {
  const maxW = width - 60;
  const maxH = height - 280;
  const sizeByW = Math.floor(maxW / size);
  const sizeByH = Math.floor(maxH / size);
  return Math.max(25, Math.min(sizeByW, sizeByH, 45));
}

function getHintSize(cellSize) {
  return Math.max(25, Math.min(cellSize, 35));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function computeOffsets(width, height, statusBarHeight, cellSize, size, hintAreaSize) {
  const boardOffsetX = (width - cellSize * size - hintAreaSize) / 2;
  const boardOffsetY = statusBarHeight + 100;
  return { boardOffsetX, boardOffsetY };
}

function computeAll(width, height, statusBarHeight, size) {
  const cellSize = calcCellSize(width, height, size);
  const hintAreaSize = getHintSize(cellSize);
  const { boardOffsetX, boardOffsetY } = computeOffsets(width, height, statusBarHeight, cellSize, size, hintAreaSize);
  return { cellSize, hintAreaSize, boardOffsetX, boardOffsetY };
}

function applyPuzzleData(puzzleData, width, height, statusBarHeight) {
  const size = puzzleData.size || 6;
  let grid = puzzleData.grid;
  if (grid && grid[0] && typeof grid[0][0] === 'string') {
    grid = grid.map(row => row.map(cell => cell === 'S' ? CELL_SHIP : CELL_EMPTY));
  }

  const rowHints = puzzleData.rowCounts || Array(size).fill(0);
  const colHints = puzzleData.colCounts || Array(size).fill(0);

  let totalShips = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_SHIP) totalShips++;
    }
  }

  return { size, grid, rowHints, colHints, totalShips };
}

function generateFallback(size, difficulty) {
  const rows = size, cols = size;
  const grid = Array(rows).fill(null).map(() => Array(cols).fill(CELL_EMPTY));

  const shipTypes = difficulty === 'easy'
    ? [4, 3, 2, 1]
    : difficulty === 'medium'
      ? [4, 4, 3, 3, 2, 1]
      : [4, 4, 3, 3, 3, 2, 1];

  for (const length of shipTypes) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const isHorizontal = Math.random() > 0.5;
      const r = Math.floor(Math.random() * (rows - (isHorizontal ? 0 : length - 1)));
      const c = Math.floor(Math.random() * (cols - (isHorizontal ? length - 1 : 0)));

      let canPlace = true;
      for (let i = 0; i < length; i++) {
        const nr = isHorizontal ? r : r + i;
        const nc = isHorizontal ? c + i : c;
        if (nr >= rows || nc >= cols || grid[nr][nc] === CELL_SHIP) {
          canPlace = false;
          break;
        }
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const checkR = nr + dr;
            const checkC = nc + dc;
            if (checkR >= 0 && checkR < rows && checkC >= 0 && checkC < cols && grid[checkR][checkC] === CELL_SHIP) {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }
      }

      if (canPlace) {
        for (let i = 0; i < length; i++) {
          const nr = isHorizontal ? r : r + i;
          const nc = isHorizontal ? c + i : c;
          grid[nr][nc] = CELL_SHIP;
        }
        placed = true;
      }
    }
  }

  const rowCounts = Array(rows).fill(0);
  const colCounts = Array(cols).fill(0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CELL_SHIP) {
        rowCounts[r]++;
        colCounts[c]++;
      }
    }
  }

  return { size, grid, rowCounts, colCounts };
}

function checkCompletion(grid, size, rowHints, colHints, totalShips, shipCount) {
  // 1. 行列战舰数匹配边缘提示
  for (let r = 0; r < size; r++) {
    let cnt = 0;
    for (let c = 0; c < size; c++) if (grid[r][c] === CELL_SHIP) cnt++;
    if (cnt !== rowHints[r]) {
      if (shipCount === totalShips) return { error: `第${r + 1}行战舰数应为${rowHints[r]}，当前${cnt}` };
      return null;
    }
  }
  for (let c = 0; c < size; c++) {
    let cnt = 0;
    for (let r = 0; r < size; r++) if (grid[r][c] === CELL_SHIP) cnt++;
    if (cnt !== colHints[c]) {
      if (shipCount === totalShips) return { error: `第${c + 1}列战舰数应为${colHints[c]}，当前${cnt}` };
      return null;
    }
  }

  // 2. 收集所有战舰格子
  const ships = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_SHIP) ships.push({ r, c });
    }
  }
  if (ships.length !== totalShips) return null;

  // 3. BFS 找出所有正交连通的战舰组件
  const visited = new Set();
  const components = [];
  for (const { r, c } of ships) {
    const key = r + ',' + c;
    if (visited.has(key)) continue;
    const comp = [];
    const queue = [{ r, c }];
    visited.add(key);
    while (queue.length) {
      const { r: cr, c: cc } = queue.shift();
      comp.push({ r: cr, c: cc });
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = cr + dr, nc = cc + dc;
        const nkey = nr + ',' + nc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size &&
            grid[nr][nc] === CELL_SHIP && !visited.has(nkey)) {
          visited.add(nkey);
          queue.push({ r: nr, c: nc });
        }
      }
    }
    components.push(comp);
  }

  // 4. 每个组件必须是直线（同一行或同一列）
  for (const comp of components) {
    const rows = new Set(comp.map(p => p.r));
    const cols = new Set(comp.map(p => p.c));
    if (rows.size > 1 && cols.size > 1) {
      return { error: '存在非直线的战舰形状' };
    }
  }

  // 5. 不同组件之间不能相邻（8方向）
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      for (const a of components[i]) {
        for (const b of components[j]) {
          if (Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1) {
            return { error: '战舰之间不能相邻' };
          }
        }
      }
    }
  }

  return { success: true };
}

function saveProgress(gameName, difficulty, level) {
  try {
    const key = 'progress_' + gameName + '_' + difficulty;
    const saved = wx.getStorageSync(key);
    let progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };

    if (level >= progress.unlocked) {
      progress.unlocked = level + 1;
    }
    if (!progress.stars[level]) {
      progress.stars[level] = 1;
    }
    wx.setStorageSync(key, JSON.stringify(progress));
  } catch (e) {
    console.log('[Battleship] 保存进度失败', e);
  }
}

module.exports = {
  CELL_EMPTY,
  CELL_SHIP,
  CDN_BASE,
  roundRect,
  getSizeByDifficulty,
  calcCellSize,
  getHintSize,
  formatTime,
  computeAll,
  applyPuzzleData,
  generateFallback,
  checkCompletion,
  saveProgress,
};
