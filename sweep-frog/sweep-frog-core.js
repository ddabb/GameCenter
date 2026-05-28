/**
 * sweep-frog-core.js — 躲避牛蛙（Frog Escape）核心逻辑
 *
 * 扫雷换皮游戏：
 *   - 🐸牛蛙 = 地雷（碰到即失败）
 *   - 💧水花 = 安全格（周围无牛蛙）
 *   - 数字 = 周围牛蛙数量
 *
 * 包含：
 *   - 难度配置（简单/中等，对应9×9/16×16）
 *   - 随机生成棋盘（含安全重排确保首次点击安全）
 *   - 数字重算（recalcNumbers）
 */

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/minesweeper';
const RECORDS_KEY = 'sweep_frog_records';

const DIFFICULTIES = [
  { key: 'easy', label: '简单 9×9 · 10只', rows: 9, cols: 9, mines: 10 },
  { key: 'medium', label: '中等 16×16 · 40只', rows: 16, cols: 16, mines: 40 },
];

/**
 * 随机生成扫雷棋盘数据
 * @returns {Array<Array<{isFrog:boolean, nearby:number}>>}
 */
function generateBoard(rows, cols, totalMines) {
  const data = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push({ isFrog: false, nearby: 0 });
    }
    data.push(row);
  }

  let placed = 0;
  while (placed < totalMines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!data[r][c].isFrog) {
      data[r][c].isFrog = true;
      placed++;
    }
  }
  recalcNumbers(data, rows, cols);
  return data;
}

/**
 * 重新计算所有格子的 nearby 数字（周围地雷数）
 */
function recalcNumbers(boardData, rows, cols) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!boardData[r][c].isFrog) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && boardData[nr][nc].isFrog) {
              count++;
            }
          }
        }
        boardData[r][c].nearby = count;
      }
    }
  }
}

module.exports = {
  CDN_BASE,
  RECORDS_KEY,
  DIFFICULTIES,
  generateBoard,
  recalcNumbers
};
