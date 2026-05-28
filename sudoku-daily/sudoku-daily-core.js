/**
 * sudoku-daily-core.js - 每日数独核心逻辑
 * 常量和纯数据处理函数
 */
const sudoku = require('./sudoku-algo');

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data';
const DAILY_CACHE_PREFIX = 'cdn_daily_sudoku_';
const DAILY_TS_PREFIX = 'cdn_daily_sudoku_ts_';
const PROGRESS_KEY = 'sudoku_daily_progress';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatDateValue(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getDailyCacheKey(dateValue) {
  return `${DAILY_CACHE_PREFIX}${dateValue.replace(/-/g, '')}`;
}

function buildDailyDisplay(dateValue) {
  const [year, month, day] = dateValue.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function createEmptyBoard() {
  const board = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      row.push({
        value: '',
        fixed: false,
        candidates: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        showCandidates: false,
        error: false
      });
    }
    board.push(row);
  }
  return board;
}

function calculateCandidates(board, showCandidates) {
  if (!showCandidates) return;

  const grid = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      const val = board[r][c].value ? parseInt(board[r][c].value) : 0;
      row.push(val);
    }
    grid.push(row);
  }

  const candidates = sudoku.calculateAllCandidates(grid);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cellCandidates = candidates[r][c];
      const arr = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      cellCandidates.forEach(n => arr[n - 1] = n);
      board[r][c].candidates = arr;
      board[r][c].showCandidates = board[r][c].value === '' && showCandidates;
    }
  }
}

module.exports = {
  CDN_BASE,
  DAILY_CACHE_PREFIX,
  DAILY_TS_PREFIX,
  PROGRESS_KEY,
  pad2,
  formatDateValue,
  getDailyCacheKey,
  buildDailyDisplay,
  createEmptyBoard,
  calculateCandidates
};
