/**
 * 24点场景 (Canvas版)
 * 规则：用4个数字，通过+-×÷运算得到24
 */
const Game = require('../../utils/game-core.js');

const PAD = 15;
const CARD_W = (Game.BASE_W - PAD * 2 - 30) / 4;
const CARD_H = 80;
const CARD_Y = 100;

// 操作符按钮
const OPS = ['+', '-', '×', '÷', '(', ')'];
const OP_W = 48;
const OP_H = 40;
const OP_GAP = 8;
const OP_START_Y = CARD_Y + CARD_H + 20;

let cards = []; // 4张牌
let expression = '';
let result = null; // null=未提交, 'correct', 'wrong'
let history = [];
let stats = { played: 0, correct: 0 };
let currentHint = 0;
let showHint = false;
let hintText = '';
let showSolution = false;
let solutions = [];
let backBtn = {};
let enterBtn = {};
let clearBtn = {};
let hintBtn = {};
let solutionBtn = {};
let opBtns = [];

function shuffle() {
  const pool = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  cards = pool.slice(0, 4);
  expression = '';
  result = null;
  showHint = false;
  showSolution = false;
}

function buildButtons() {
  backBtn = { x: PAD, y: 10, w: 50, h: 28, label: '←' };
  clearBtn = { x: PAD, y: CARD_Y + CARD_H + 180, w: 60, h: 38, label: '清空' };
  enterBtn = { x: Game.BASE_W - PAD - 60, y: CARD_Y + CARD_H + 180, w: 60, h: 38, label: '提交' };
  hintBtn = { x: PAD + 68, y: CARD_Y + CARD_H + 180, w: 60, h: 38, label: '💡提示' };
  solutionBtn = { x: PAD + 136, y: CARD_Y + CARD_H + 180, w: 60, h: 38, label: '📋答案' };
  shuffleBtn = { x: Game.BASE_W - PAD - 130, y: CARD_Y + CARD_H + 180, w: 62, h: 38, label: '🔀' };

  // 数字卡片
  const cardY = CARD_Y;
  for (let i = 0; i < 4; i++) {
    cards[i] = cards[i] || Math.floor(Math.random() * 9) + 1;
  }

  // 操作符
  opBtns = [];
  const totalW = OPS.length * OP_W + (OPS.length - 1) * OP_GAP;
  let ox = (Game.BASE_W - totalW) / 2;
  OPS.forEach((op, i) => {
    opBtns.push({ x: ox + i * (OP_W + OP_GAP), y: OP_START_Y + 48, w: OP_W, h: OP_H, label: op });
  });
}

function onEnter() {
  shuffle();
  buildButtons();
}

function onExit() {}
function update(dt) {}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  // 标题
  Game.drawText('24点', Game.BASE_W / 2, 14, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });

  // 统计
  Game.drawText(`已玩: ${stats.played}  正确: ${stats.correct}`, Game.BASE_W / 2, 38, {
    size: 10, color: Game.THEME.textGray, align: 'center'
  });

  // 返回
  Game.roundRect(ctx, backBtn.x, backBtn.y, backBtn.w, backBtn.h, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  Game.drawText(backBtn.label, backBtn.x + backBtn.w / 2, backBtn.y + backBtn.h / 2, {
    size: 14, color: '#fff', align: 'center', baseline: 'middle'
  });

  // 牌
  const totalCardW = 4 * CARD_W + 3 * 10;
  const cardStartX = (Game.BASE_W - totalCardW) / 2;
  for (let i = 0; i < 4; i++) {
    const cx = cardStartX + i * (CARD_W + 10);
    const cy = CARD_Y;
    const val = cards[i] || 1;
    const used = expression.includes(String(val));

    Game.roundRect(ctx, cx, cy, CARD_W, CARD_H, 12);
    ctx.fillStyle = used ? 'rgba(102,126,234,0.3)' : '#fff';
    ctx.fill();
    ctx.strokeStyle = used ? Game.THEME.primary : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `bold 36px sans-serif`;
    ctx.fillStyle = used ? '#fff' : '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(val), cx + CARD_W / 2, cy + CARD_H / 2 - 6);
    ctx.font = `11px sans-serif`;
    ctx.fillStyle = '#aaa';
    ctx.fillText(`×${4 - i + 1}`, cx + CARD_W / 2, cy + CARD_H / 2 + 16);
  }

  // 表达式输入框
  const inputY = CARD_Y + CARD_H + 8;
  Game.drawCard(PAD, inputY, Game.BASE_W - PAD * 2, 36, 8);
  Game.drawText(expression || '请输入表达式...', PAD + 10, inputY + 18, {
    size: 14, color: expression ? '#333' : '#aaa', baseline: 'middle'
  });

  // 操作符
  const totalOpW = OPS.length * OP_W + (OPS.length - 1) * OP_GAP;
  const opStartX = (Game.BASE_W - totalOpW) / 2;
  opBtns.forEach(btn => {
    Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fillStyle = '#667eea';
    ctx.fill();
    Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
      size: 16, bold: true, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  // 底部按钮
  const btns = [clearBtn, hintBtn, solutionBtn, shuffleBtn, enterBtn];
  btns.forEach(btn => {
    Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fillStyle = btn === enterBtn ? '#f5576c' : (btn === shuffleBtn ? '#4ecdc4' : 'rgba(255,255,255,0.1)');
    ctx.fill();
    Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
      size: 11, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  // 结果提示
  if (result === 'correct') {
    Game.drawCard(PAD, CARD_Y + CARD_H + 130, Game.BASE_W - PAD * 2, 44, 8);
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    Game.roundRect(ctx, PAD, CARD_Y + CARD_H + 130, Game.BASE_W - PAD * 2, 44, 8);
    ctx.stroke();
    Game.drawText('✅ 正确！24点达成！', Game.BASE_W / 2, CARD_Y + CARD_H + 152, {
      size: 14, bold: true, color: '#4ecdc4', align: 'center', baseline: 'middle'
    });
  } else if (result === 'wrong') {
    Game.drawCard(PAD, CARD_Y + CARD_H + 130, Game.BASE_W - PAD * 2, 44, 8);
    ctx.strokeStyle = '#f5576c';
    ctx.lineWidth = 2;
    Game.roundRect(ctx, PAD, CARD_Y + CARD_H + 130, Game.BASE_W - PAD * 2, 44, 8);
    ctx.stroke();
    Game.drawText('❌ 不等于24，试试其他组合', Game.BASE_W / 2, CARD_Y + CARD_H + 152, {
      size: 12, color: '#f5576c', align: 'center', baseline: 'middle'
    });
  }

  // 提示
  if (showHint && hintText) {
    Game.drawCard(PAD, CARD_Y + CARD_H + 130, Game.BASE_W - PAD * 2, 44, 8);
    Game.drawText('💡 ' + hintText, PAD + 10, CARD_Y + CARD_H + 152, {
      size: 11, color: Game.THEME.textGray, baseline: 'middle'
    });
  }

  // 答案
  if (showSolution && solutions.length > 0) {
    const solY = CARD_Y + CARD_H + 130;
    Game.drawCard(PAD, solY, Game.BASE_W - PAD * 2, 36 + solutions.length * 18, 8);
    Game.drawText('📋 解法：', PAD + 10, solY + 14, {
      size: 11, bold: true, color: '#fff', baseline: 'middle'
    });
    solutions.slice(0, 3).forEach((s, i) => {
      Game.drawText(`${i + 1}. ${s}`, PAD + 10, solY + 32 + i * 18, {
        size: 10, color: Game.THEME.textGray, baseline: 'middle'
      });
    });
  }
}

function checkAnswer(expr) {
  // 替换中文符号
  const e = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/／/g, '/');
  // 验证只用了4张牌
  const nums = e.replace(/[^1-9]/g, '').split('').map(Number);
  if (nums.length !== 4) return false;
  // 验证等于24
  try {
    const val = eval(e);
    return Math.abs(val - 24) < 0.001;
  } catch (err) {
    return false;
  }
}

function solve24(nums) {
  // 24点求解器：尝试所有可能的表达式
  const ops = [
    (a, b) => [a + b, a - b, b - a, a * b, a / b, b / a],
    (a, b) => [a + b, a - b, b - a, a * b, a / b, b / a]
  ];

  function combine(a, b) {
    return [a + b, a - b, b - a, a * b, a / b, b / a].filter(v => isFinite(v));
  }

  function solve(nums) {
    if (nums.length === 1) {
      if (Math.abs(nums[0] - 24) < 0.001) return [String(nums[0])];
      return [];
    }
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const rest = nums.filter((_, k) => k !== i && k !== j);
        const combos = combine(nums[i], nums[j]);
        for (const c of combos) {
          const results = solve([c, ...rest]);
          if (results.length > 0) {
            // 重建表达式
            return results.map(r => {
              if (r === String(nums[i]) || r === String(nums[j])) return r;
              return `(${r})`;
            });
          }
        }
      }
    }
    return [];
  }

  // 更直接的方法：枚举
  const n = nums;
  const results = [];

  function eval2(a, b, op) {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/' && b !== 0) return a / b;
    return null;
  }

  const ops2 = ['+', '-', '*', '/'];
  // ((a op b) op c) op d
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        // (a op b)
        const r1 = eval2(n[0], n[1], ops2[i]);
        if (r1 === null) continue;
        // (r1 op c)
        const r2 = eval2(r1, n[2], ops2[j]);
        if (r2 === null) continue;
        // (r2 op d)
        const r3 = eval2(r2, n[3], ops2[k]);
        if (r3 !== null && Math.abs(r3 - 24) < 0.001) {
          results.push(`(${n[0]}${ops2[i]}${n[1]})${ops2[j]}${n[2]}${ops2[k]}${n[3]}`);
        }
        // (a op b) op (c op d)
        const r4 = eval2(n[2], n[3], ops2[k]);
        if (r4 === null) continue;
        const r5 = eval2(r1, r4, ops2[j]);
        if (r5 !== null && Math.abs(r5 - 24) < 0.001) {
          results.push(`(${n[0]}${ops2[i]}${n[1]})${ops2[j]}(${n[2]}${ops2[k]}${n[3]})`);
        }
        // a op ((b op c) op d)
        const r6 = eval2(n[1], n[2], ops2[j]);
        if (r6 === null) continue;
        const r7 = eval2(r6, n[3], ops2[k]);
        if (r7 === null) continue;
        const r8 = eval2(n[0], r7, ops2[i]);
        if (r8 !== null && Math.abs(r8 - 24) < 0.001) {
          results.push(`${n[0]}${ops2[i]}((${n[1]}${ops2[j]}${n[2]})${ops2[k]}${n[3]})`);
        }
      }
    }
  }

  return [...new Set(results)];
}

let shuffleBtn = {};

function onTouchStart(x, y) {
  if (Game.hitTest({ x, y }, backBtn)) {
    Game.switchScene('index');
    return;
  }

  if (Game.hitTest({ x, y }, clearBtn)) {
    expression = '';
    result = null;
    showHint = false;
    showSolution = false;
    return;
  }

  if (Game.hitTest({ x, y }, shuffleBtn)) {
    shuffle();
    return;
  }

  if (Game.hitTest({ x, y }, hintBtn)) {
    const hints = [
      '尝试 3×8=24、4×6=24、12×2=24',
      '利用括号改变运算顺序',
      '除法可以产生分数，分数运算有时有惊喜',
      '先算出24的因数，再看其他数字能否得到另一个因数',
    ];
    hintText = hints[currentHint % hints.length];
    currentHint++;
    showHint = true;
    showSolution = false;
    return;
  }

  if (Game.hitTest({ x, y }, solutionBtn)) {
    solutions = solve24(cards);
    showSolution = true;
    showHint = false;
    if (solutions.length === 0) {
      hintText = '此题无解！';
      showSolution = false;
      showHint = true;
    }
    return;
  }

  if (Game.hitTest({ x, y }, enterBtn)) {
    if (!expression) return;
    const correct = checkAnswer(expression);
    result = correct ? 'correct' : 'wrong';
    stats.played++;
    if (correct) stats.correct++;
    return;
  }

  // 操作符
  for (const btn of opBtns) {
    if (Game.hitTest({ x, y }, btn)) {
      expression += btn.label;
      result = null;
      return;
    }
  }
}

module.exports = { onEnter, onExit, update, render, onTouchStart };
