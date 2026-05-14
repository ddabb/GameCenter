/**
 * one-stroke - 一笔画 (One-Stroke) 场景 (Canvas版)
 * 一笔不间断地画过所有路径
 */
const Game = require('../../utils/game-core.js');

// ========== CDN 题库加载 ==========
const CDN_BASE_one_stroke = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/one-stroke';
const PUZZLE_COUNTS_one_stroke = {"easy":1000,"medium":1000,"hard":1000};
let currentPuzzleId_one_stroke = 0;
let isLoading_one_stroke = false;

function loadPuzzle(puzzleId) {
  if (isLoading_one_stroke) return;
  isLoading_one_stroke = true;
  const diff = difficulty;
  const id = puzzleId !== undefined ? puzzleId : currentPuzzleId_one_stroke;
  const count = PUZZLE_COUNTS_one_stroke[diff] || 1000;
  const actualId = id % count;
  const filename = diff + '/' + diff + '-' + String(actualId + 1).padStart(4, '0') + '.json';
  const cacheKey = 'cdn_one_stroke_' + diff + '_' + String(actualId + 1).padStart(4, '0');

  // 本地缓存
  try {
    const cached = wx.getStorageSync(cacheKey);
    if (cached && cached.holes) {
      applyPuzzle(cached, diff, actualId);
      isLoading_one_stroke = false;
      return;
    }
  } catch(e) {}

  console.info('[one-stroke] CDN加载: ' + filename);
  wx.request({
    url: CDN_BASE_one_stroke + '/' + filename,
    timeout: 10000,
    success(res) {
      if (res.statusCode === 200 && res.data && res.data.holes) {
        try { wx.setStorageSync(cacheKey, res.data); } catch(e) {}
        applyPuzzle(res.data, diff, actualId);
      } else {
        console.warn('[one-stroke] CDN数据错误, 使用本地生成');
        _generateFallback();
      }
    },
    fail(err) {
      console.warn('[one-stroke] CDN请求失败, 使用本地生成', err);
      _generateFallback();
    },
    complete() {
      isLoading_one_stroke = false;
    }
  });
}

function loadLevel(data) {
  applyPuzzle(data, data.difficulty || difficulty, data.id ? data.id - 1 : 0);
}


const PAD = 15;

let nodes = [];     // {x, y, id}
let edges = [];     // {from, to}
let path = [];      // 当前路径
let usedEdge = new Set();
let isComplete = false;
let hasError = false;
let errorTimer = 0;
let backBtn = {}, newBtn = {};
let difficulty = 'easy';
let diffBtns = [];

function applyPuzzle(data, diff, id) {
  const size = data.size || 6;
  rows = size; cols = size;
  holes = data.holes || [];
  answer = data.answer || [];
  totalCells = size * size;
  visitOrder = new Array(totalCells).fill(-1);
  currentStep = 0;
  isComplete = false;
  currentPuzzleId_one_stroke = id;
  timer = 0;
  buildButtons();
}

function _generateFallback() {
  const nodeSets = {
    easy: [
      { nodes: [{x: 0.3, y: 0.3}, {x: 0.7, y: 0.3}, {x: 0.7, y: 0.7}, {x: 0.3, y: 0.7}], edges: [[0,1],[1,2],[2,3],[3,0],[0,2]] },
      { nodes: [{x: 0.2, y: 0.2}, {x: 0.8, y: 0.2}, {x: 0.5, y: 0.75}], edges: [[0,1],[0,2],[1,2],[0,2]] },
    ],
    medium: [
      { nodes: [{x: 0.5, y: 0.15}, {x: 0.2, y: 0.45}, {x: 0.8, y: 0.45}, {x: 0.5, y: 0.75}], edges: [[0,1],[0,2],[1,2],[1,3],[2,3],[0,3]] },
      { nodes: [{x: 0.2, y: 0.2}, {x: 0.8, y: 0.2}, {x: 0.8, y: 0.7}, {x: 0.2, y: 0.7}, {x: 0.5, y: 0.45}], edges: [[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]] },
    ],
    hard: [
      { nodes: [{x: 0.15, y: 0.2}, {x: 0.5, y: 0.1}, {x: 0.85, y: 0.2}, {x: 0.85, y: 0.6}, {x: 0.5, y: 0.8}, {x: 0.15, y: 0.6}], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,2],[2,4],[4,0],[1,3],[3,5],[5,1]] },
    ],
  };

  const puzzles = nodeSets[difficulty] || nodeSets.easy;
  const puz = puzzles[Math.floor(Math.random() * puzzles.length)];

  const canvasW = Game.BASE_W - PAD * 2;
  const canvasH = 420;
  const margin = 40;

  nodes = puz.nodes.map((n, i) => ({
    id: i,
    x: PAD + margin + n.x * (canvasW - margin * 2),
    y: 90 + margin + n.y * (canvasH - margin * 2)
  }));

  edges = puz.edges.map(([a, b]) => ({ from: a, to: b }));

  path = [];
  usedEdge = new Set();
  isComplete = false;
  hasError = false;
  errorTimer = 0;
}

function getEdgeKey(from, to) {
  return from < to ? `${from}-${to}` : `${to}-${from}`;
}

function getNodeDist(p) {
  let best = { node: null, dist: Infinity };
  for (const n of nodes) {
    const d = Math.hypot(p.x - n.x, p.y - n.y);
    if (d < best.dist) best = { node: n, dist: d };
  }
  return best;
}

function isEdge(from, to) {
  return edges.some(e => (e.from === from && e.to === to) || (e.from === to && e.to === from));
}

function onEnter() {
  loadPuzzle(0);
  buildButtons();
}

function onExit() {}

function update(dt) {
  if (errorTimer > 0) errorTimer -= dt;
}

function buildButtons() {
  backBtn = { x: PAD, y: 8, w: 44, h: 26, label: '←' };
  const bw = 60, bh = 26;
  const diffs = ['easy', 'medium', 'hard'];
  const labels = { easy: '简单', medium: '中等', hard: '困难' };
  const totalW = diffs.length * bw + 8 * (diffs.length - 1);
  const startX = (Game.BASE_W - totalW) / 2;
  diffBtns = diffs.map((d, i) => ({
    x: startX + i * (bw + 8),
    y: 38,
    w: bw,
    h: bh,
    id: d,
    label: labels[d]
  }));
  newBtn = { x: PAD, y: 530, w: Game.BASE_W - PAD * 2, h: 34, label: '🔄 重新开始' };
}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  Game.drawText('一笔画', Game.BASE_W / 2, 10, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });
  Game.drawText('点击节点开始，连接所有线段', Game.BASE_W / 2, 38, {
    size: 10, color: Game.THEME.textGray, align: 'center'
  });

  drawBackBtn();
  diffBtns.forEach(btn => {
    const isActive = btn.id === difficulty;
    Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.h / 2);
    ctx.fillStyle = isActive ? '#f5576c' : 'rgba(255,255,255,0.1)';
    ctx.fill();
    Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
      size: 11, bold: isActive, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  // 画边
  for (const e of edges) {
    const na = nodes[e.from], nb = nodes[e.to];
    const key = getEdgeKey(e.from, e.to);
    const isUsed = usedEdge.has(key);

    ctx.strokeStyle = isUsed ? '#f5576c' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = isUsed ? 4 : 2;
    ctx.setLineDash(isUsed ? [] : [6, 4]);
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 画路径
  if (path.length > 1) {
    ctx.strokeStyle = '#f5576c';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // 画节点
  for (const n of nodes) {
    const isStart = path.length > 0 && path[0].id === n.id;
    const isEnd = path.length > 0 && path[path.length - 1].id === n.id;
    const isVisited = path.some(p => p.id === n.id);

    const radius = 14;
    if (isStart || isEnd) {
      ctx.fillStyle = '#f5576c';
    } else if (isVisited) {
      ctx.fillStyle = 'rgba(245,87,108,0.4)';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
    }
    Game.drawCircle(n.x, n.y, radius, { fill: ctx.fillStyle });
    ctx.strokeStyle = '#f5576c';
    ctx.lineWidth = 2;
    Game.drawCircle(n.x, n.y, radius, { stroke: '#f5576c', strokeWidth: 2 });
  }

  // 错误提示
  if (hasError && errorTimer > 0) {
    Game.drawCard(PAD, 540, Game.BASE_W - PAD * 2, 28, 6);
    Game.drawText('❌ 这条边已走过！', Game.BASE_W / 2, 554, {
      size: 11, color: '#f5576c', align: 'center', baseline: 'middle'
    });
  }

  if (isComplete) {
    Game.drawCard(PAD, 540, Game.BASE_W - PAD * 2, 28, 6);
    Game.drawText('🎉 一笔画完成！', Game.BASE_W / 2, 554, {
      size: 13, bold: true, color: '#f5576c', align: 'center', baseline: 'middle'
    });
  }

  drawBtn(newBtn, '#f5576c');
}

function drawBackBtn() {
  const ctx = Game.ctx;
  Game.roundRect(ctx, backBtn.x, backBtn.y, backBtn.w, backBtn.h, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  Game.drawText(backBtn.label, backBtn.x + backBtn.w / 2, backBtn.y + backBtn.h / 2, {
    size: 14, color: '#fff', align: 'center', baseline: 'middle'
  });
}

function drawBtn(btn, color) {
  const ctx = Game.ctx;
  Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
  ctx.fillStyle = color;
  ctx.fill();
  Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
    size: 12, color: '#fff', align: 'center', baseline: 'middle'
  });
}

function onTouchStart(x, y) {
  if (Game.hitTest({ x, y }, backBtn)) { Game.switchScene('index'); return; }
  for (const btn of diffBtns) {
    if (Game.hitTest({ x, y }, btn)) {
      difficulty = btn.id;
      loadPuzzle(0);
      return;
    }
  }
  if (Game.hitTest({ x, y }, newBtn)) {
    path = [];
    usedEdge = new Set();
    isComplete = false;
    hasError = false;
    return;
  }

  const { node: nearNode } = getNodeDist({ x, y });
  if (!nearNode || nearNode.dist > 30) return;

  if (path.length === 0) {
    // 开始
    path = [nearNode];
  } else {
    const last = path[path.length - 1];
    const key = getEdgeKey(last.id, nearNode.id);

    if (!isEdge(last.id, nearNode.id)) return;

    if (usedEdge.has(key)) {
      hasError = true;
      errorTimer = 1.0;
      return;
    }

    usedEdge.add(key);
    path.push(nearNode);

    // 检查是否完成
    if (usedEdge.size === edges.length) {
      isComplete = true;
    }
  }
}

module.exports = { onEnter, onExit, update, render, onTouchStart , loadLevel,};
