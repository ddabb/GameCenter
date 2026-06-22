// SolvePuzzle 微信小游戏入口 — 分包版
// 小程序主要内容是益智解谜玩法的游戏，包含黑白棋、24点、扫蛙、一笔画、数独、推箱子、点灯、战船、合并abc、数织、数墙、搭帐篷、六连通等多种益智游戏；

const roundRect = require('./utils/round-rect.js');

// 兼容 global（开发者工具模拟器可能没有）
// 微信小游戏使用严格模式，不能直接赋值给未声明变量
var _global = typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : this);
_global.roundRect = roundRect;

// 触摸事件监听器缓存
let _touchListeners = {};

// ── 全局错误捕获 ────────────────────────────────────────────────────────────────
function showErrorOnCanvas(err) {
  try {
    const systemInfo = wx.getSystemInfoSync();
    const w = systemInfo.windowWidth;
    const h = systemInfo.windowHeight;
    let context = null;
    try { const c = wx.createCanvas(); context = c.getContext('2d'); } catch (e) { /* ignore */ }
    if (!context) return;
    context.clearRect(0, 0, w, h);
    context.fillStyle = '#1a1a2e';
    context.fillRect(0, 0, w, h);
    context.fillStyle = '#ff6b6b';
    context.font = 'bold 18px monospace';
    context.fillText('❌ 初始化错误', 20, 40);
    context.fillStyle = '#ffffff';
    context.font = '13px monospace';
    const msg = (err && err.message) ? err.message : String(err);
    const lines = [];
    let cur = '';
    for (let ch of msg) {
      cur += ch;
      if (cur.length > 20 && ch === ' ') { lines.push(cur); cur = ''; }
    }
    if (cur) lines.push(cur);
    lines.forEach((line, i) => {
      if (i < 30) context.fillText(line, 20, 70 + i * 20);
    });
    context.fillStyle = '#aaaaaa';
    context.font = '11px monospace';
    context.fillText('请在开发者工具控制台查看完整错误', 20, h - 20);
  } catch (e2) {
    console.error('[showErrorOnCanvas]', e2);
  }
}

wx.onError && wx.onError(function(err) {
  console.error('[wx.onError]', err);
  showErrorOnCanvas(typeof err === 'string' ? new Error(err) : (err || new Error('Unknown')));
});

// ── 分包加载管理（统一注册表）───────────────────────────────────────────────────
const subRegistry = {
  'games':         { loaded: false, loading: false, progress: 0 },
  'othello':       { loaded: false, loading: false, progress: 0 },
  '24point':       { loaded: false, loading: false, progress: 0 },
  'sweep-frog':    { loaded: false, loading: false, progress: 0 },
  'one-stroke':    { loaded: false, loading: false, progress: 0 },
  'sudoku-daily':  { loaded: false, loading: false, progress: 0 },
  'sokoban':       { loaded: false, loading: false, progress: 0 },
  'akari':         { loaded: false, loading: false, progress: 0 },
  'battleship':    { loaded: false, loading: false, progress: 0 },
  'merge-abc':     { loaded: false, loading: false, progress: 0 },
  'nonogram':      { loaded: false, loading: false, progress: 0 },
  'nurikabe':      { loaded: false, loading: false, progress: 0 },
  'tents':         { loaded: false, loading: false, progress: 0 },
  'slither-link':  { loaded: false, loading: false, progress: 0 }
};

let pendingGameLoad = null; // { gameName, level, difficulty }

/** 通用分包加载（所有分包统一调用，含真实下载进度 → UI） */
function loadSub(name, callback) {
  const reg = subRegistry[name];
  if (!reg) {
    console.error('[sub] 未知分包:', name);
    callback && callback(false);
    return;
  }

  if (reg.loaded) {
    callback && callback(true);
    return;
  }

  if (reg.loading) {
    const checkInterval = setInterval(function() {
      if (reg.loaded) {
        clearInterval(checkInterval);
        callback && callback(true);
      }
    }, 50);
    return;
  }

  reg.loading = true;
  reg.progress = 0;
  if (name === 'games') renderLoading(0, name);

  // PC端兼容：5秒超时直接 require
  const timeout = setTimeout(function() {
    if (reg.loaded) return;
    console.warn('[sub] ' + name + ' 加载超时，尝试直接require');
    reg.loaded = true;
    reg.loading = false;
    reg.progress = 100;
    callback && callback(true);
    _checkPendingGame();
  }, 5000);

  const task = wx.loadSubpackage({
    name: name,
    success: function() {
      clearTimeout(timeout);
      console.log('[sub] ' + name + ' 分包加载成功');
      reg.loaded = true;
      reg.loading = false;
      reg.progress = 100;
      if (name === 'games') renderLoading(100, name);
      callback && callback(true);
      _checkPendingGame();
    },
    fail: function(err) {
      clearTimeout(timeout);
      console.error('[sub] ' + name + ' 分包加载失败:', err);
      reg.loading = false;
      reg.progress = -1;
      if (name === 'games') {
        showErrorOnCanvas(new Error(name + ' 分包加载失败: ' + (err.errMsg || JSON.stringify(err))));
      }
      callback && callback(false);
    }
  });

  // 真实下载进度 → 更新 UI 进度条
  if (task && task.onProgressUpdate) {
    task.onProgressUpdate(function(res) {
      reg.progress = res.progress;
      if (name === 'games') renderLoading(res.progress, name);
      console.log('[sub] ' + name + ' 下载进度:', res.progress + '%');
    });
  }
}

function _checkPendingGame() {
  if (pendingGameLoad) {
    const p = pendingGameLoad;
    pendingGameLoad = null;
    loadGame(p.gameName, p.level, p.difficulty);
  }
}

// 向后兼容别名
function loadSubpackage(callback) { loadSub('games', callback); }

// ── 游戏模块缓存 ────────────────────────────────────────────────────────────────
const gameModules = {};

function getGameModule(name) {
  if (gameModules[name]) return gameModules[name];
  try {
    // 分包内的模块用分包路径 require
    switch (name) {
      case 'menu':         gameModules[name] = require('./games/menu.js'); break;
      case 'level-select': gameModules[name] = require('./games/level-select.js'); break;
      case 'profile':      gameModules[name] = require('./games/profile.js'); break;
      case 'checkin':      gameModules[name] = require('./games/checkin.js'); break;
      case 'privacy':      gameModules[name] = require('./games/privacy.js'); break;
      case 'stats':        gameModules[name] = require('./games/stats.js'); break;
      case 'othello':      gameModules[name] = require('./othello/othello.js'); break;
      case 'akari':        gameModules[name] = require('./akari/akari.js'); break;
      case 'sokoban':      gameModules[name] = require('./sokoban/sokoban.js'); break;
      case 'nurikabe':     gameModules[name] = require('./nurikabe/nurikabe.js'); break;
      case 'tents':        gameModules[name] = require('./tents/tents.js'); break;
      case '24point':      gameModules[name] = require('./24point/24point.js'); break;
      case 'slither-link': gameModules[name] = require('./slither-link/slither-link.js'); break;
      case 'nonogram':     gameModules[name] = require('./nonogram/nonogram.js'); break;
      case 'battleship':   gameModules[name] = require('./battleship/battleship.js'); break;
      case 'merge-abc':    gameModules[name] = require('./merge-abc/merge-abc.js'); break;
      case 'sweep-frog':   gameModules[name] = require('./sweep-frog/sweep-frog.js'); break;
      case 'one-stroke':   gameModules[name] = require('./one-stroke/one-stroke.js'); break;
      case 'sudoku-daily': gameModules[name] = require('./sudoku-daily/sudoku-daily.js'); break;
      case 'settings':     gameModules[name] = require('./games/settings.js'); break;
      case 'achievements': gameModules[name] = require('./games/achievements.js'); break;
      case 'leaderboard':  gameModules[name] = require('./games/leaderboard.js'); break;
      case 'prop-shop':    gameModules[name] = require('./games/prop-shop.js'); break;
      case 'redeem-code':  gameModules[name] = require('./games/redeem-code.js'); break;
      default:
        console.warn('[getGameModule] 未知游戏:', name);
        gameModules[name] = require('./games/menu.js');
    }
    return gameModules[name];
  } catch (e) {
    console.error('[getGameModule] require 失败:', name, e.message);
    return null;
  }
}

// ── 初始化 ──────────────────────────────────────────────────────────────────────
let systemInfo = null;
let canvas = null;
let ctx = null;
let currentGame = 'menu';
let gameInstance = null;
let loadingShown = false;
let loadingPhase = 0;
let loadingTimer = null;
let loadingProgress = -1;       // <0: 文本动画模式; >=0: 真实下载进度
let loadingSubName = '';
const loadingMessages = [
  '正在准备谜题世界...',
  '加载游戏资源中...',
  '唤醒沉睡的脑细胞...',
  '组装游戏组件...',
  '整理成就系统...',
  '马上就好啦...'
];

/** 渲染加载画面：有真实进度时显示进度条，否则显示文本轮播 */
function renderLoading(progress, subName) {
  if (!ctx) return;
  const w = systemInfo ? systemInfo.windowWidth : 375;
  const h = systemInfo ? systemInfo.windowHeight : 667;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, w, h);

  const hasProgress = typeof progress === 'number' && progress >= 0;
  const msg = hasProgress
    ? (subName ? '正在下载「' + subName + '」资源...' : '正在下载资源...')
    : loadingMessages[loadingPhase % loadingMessages.length];

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 18px -apple-system,BlinkMacSystemFont,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(msg, w / 2, h / 2 - 25);

  if (hasProgress) {
    // ── 进度条 ──
    var barW = w * 0.65;
    var barH = 8;
    var barX = (w - barW) / 2;
    var barY = h / 2 + 2;
    var radius = 4;

    // 背景
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    roundRect(ctx, barX, barY, barW, barH, radius);
    ctx.fill();

    // 已下载部分
    var pct = Math.min(Math.max(progress, 0), 100);
    var fillW = Math.max(barW * (pct / 100), radius * 2);
    ctx.fillStyle = pct >= 100 ? '#6BCB77' : '#4CAF50';
    ctx.beginPath();
    roundRect(ctx, barX, barY, fillW, barH, radius);
    ctx.fill();

    // 百分比
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '13px -apple-system';
    ctx.fillText(Math.round(pct) + '%', w / 2, barY + barH + 20);
  } else {
    var dots = '.'.repeat((loadingPhase % 3) + 1);
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '14px -apple-system';
    ctx.fillText('耐心等待' + dots, w / 2, h / 2 + 12);
  }

  ctx.textAlign = 'left';
}

/** 文本轮播模式（兼容旧调用） */
function showLoading(messageIndex) {
  if (typeof messageIndex === 'number') loadingPhase = messageIndex;
  loadingProgress = -1;
  renderLoading();
}

function startLoadingAnimation() {
  if (loadingShown) return;
  loadingShown = true;
  loadingProgress = -1;

  const animate = function() {
    renderLoading();
    loadingPhase++;
    loadingTimer = setTimeout(animate, 1500);
  };
  animate();
}

function stopLoadingAnimation() {
  if (loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }
}

function safeInit() {
  try {
    systemInfo = wx.getSystemInfoSync();
    if (!systemInfo || !systemInfo.windowWidth) throw new Error('wx.getSystemInfoSync 返回异常');

    canvas = wx.createCanvas();
    if (!canvas) throw new Error('wx.createCanvas() 返回 null');
    ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas.getContext("2d") 返回 null');
    // canvas 尺寸由系统自动管理，不手动设置避免PC端异常

    // ── canvas.addEventListener polyfill ──
    // 微信小游戏 canvas 没有 addEventListener，需映射到 wx.onTouch*
    if (!canvas.addEventListener) {
      const _touchListeners = {};
      canvas.addEventListener = function(type, handler, options) {
        if (!_touchListeners[type]) _touchListeners[type] = [];
        _touchListeners[type].push(handler);
      };
      canvas.removeEventListener = function(type, handler) {
        if (!_touchListeners[type]) return;
        const idx = _touchListeners[type].indexOf(handler);
        if (idx >= 0) _touchListeners[type].splice(idx, 1);
      };

      function createClickEvent(touch) {
        return {
          type: 'click',
          clientX: touch.clientX,
          clientY: touch.clientY,
          pageX: touch.pageX || touch.clientX,
          pageY: touch.pageY || touch.clientY,
          offsetX: touch.clientX,
          offsetY: touch.clientY,
          target: canvas,
          preventDefault: function() {},
          stopPropagation: function() {}
        };
      }

      let lastTouch = null;
      wx.onTouchStart(function(res) {
        if (res.touches && res.touches[0]) lastTouch = res.touches[0];
        if (!res.preventDefault) res.preventDefault = function() {};
        if (!res.stopPropagation) res.stopPropagation = function() {};
        (_touchListeners['touchstart'] || []).slice().forEach(function(h) {
          try { h(res); } catch(e) { console.error('[polyfill touchstart]', e); }
        });
      });
      wx.onTouchMove(function(res) {
        if (!res.preventDefault) res.preventDefault = function() {};
        if (!res.stopPropagation) res.stopPropagation = function() {};
        (_touchListeners['touchmove'] || []).slice().forEach(function(h) {
          try { h(res); } catch(e) { console.error('[polyfill touchmove]', e); }
        });
      });
      wx.onTouchEnd(function(res) {
        // 确保 res 有 preventDefault/stopPropagation 方法
        if (!res.preventDefault) res.preventDefault = function() {};
        if (!res.stopPropagation) res.stopPropagation = function() {};
        (_touchListeners['touchend'] || []).slice().forEach(function(h) {
          try { h(res); } catch(e) { console.error('[polyfill touchend]', e); }
        });
        // 模拟 click 事件
        if (lastTouch) {
          const clickEvt = createClickEvent(lastTouch);
          // 快照 handler 列表，避免 switchGame 在迭代中修改同一数组导致新游戏误触
          const handlers = (_touchListeners['click'] || []).slice();
          handlers.forEach(function(h) {
            try { h(clickEvt); } catch(e) { console.error('[polyfill click]', e); }
          });
        }
        lastTouch = null;
      });
    }

    // 显示加载画面，同时加载分包
    startLoadingAnimation();
    console.log('[init] 开始加载分包...');
    draw(); // 启动渲染循环

    loadSubpackage(function(success) {
      console.log('[init] 分包加载回调, success=', success);
      if (success) {
        loadGame('menu');
      }
      // 失败时 showErrorOnCanvas 已在 loadSubpackage 内调用
    });

    console.log('[init] 初始化完成');
  } catch (e) {
    console.error('[init] 初始化失败:', e.message, e.stack);
    showErrorOnCanvas(e);
  }
}

function loadGame(gameName, level, difficulty) {
  if (!subRegistry['games'].loaded) {
    pendingGameLoad = { gameName: gameName, level: level, difficulty: difficulty };
    loadSubpackage();
    return;
  }

  // 独立游戏分包按需加载（统一处理，替代原来13段重复代码）
  if (subRegistry[gameName] && !subRegistry[gameName].loaded) {
    pendingGameLoad = { gameName: gameName, level: level, difficulty: difficulty };
    loadSub(gameName);
    return;
  }

  if (!ctx) {
    showErrorOnCanvas(new Error('ctx is undefined'));
    return;
  }

  _drawErrorOccurred = false;
  stopLoadingAnimation();

  if (gameInstance) {
    try { gameInstance.destroy(); } catch(e) { console.warn('[game] destroy error:', e.message); }
    gameInstance = null;
    for (let type in _touchListeners) _touchListeners[type] = [];
  }

  // 若 draw 循环之前因异常停止，重启它
  if (_drawErrorOccurred) {
    requestAnimationFrame(draw);
  }

  try {
    const Module = getGameModule(gameName);
    if (!Module) {
      console.error('[loadGame] 模块加载失败:', gameName);
      gameInstance = new (getGameModule('menu'))(ctx, canvas, systemInfo, switchGame);
      currentGame = 'menu';
      return;
    }
    gameInstance = new Module(ctx, canvas, systemInfo, switchGame, level, difficulty);
    currentGame = gameName;
    loadingShown = false;
    console.log('[loadGame] 加载成功:', gameName, 'level:', level || '', 'difficulty:', difficulty || '');
  } catch (e) {
    console.error('[loadGame] 加载失败:', gameName, e.message, e.stack);
    showErrorOnCanvas(e);
  }
}

function switchGame(gameName, level, difficulty) {
  loadGame(gameName, level, difficulty);
}

let _drawErrorOccurred = false;

function draw() {
  if (_drawErrorOccurred) return;
  
  try {
    if (gameInstance) {
      if (typeof gameInstance.update === 'function') {
        gameInstance.update();
      }
      if (typeof gameInstance.draw === 'function') {
        gameInstance.draw();
      }
    }
  } catch (e) {
    console.error('[Draw]', e.message, e.stack);
    showErrorOnCanvas(e);
    _drawErrorOccurred = true;
    return;
  }
  // 兼容微信PC端：requestAnimationFrame 可能不存在
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(draw);
  } else {
    setTimeout(draw, 16);
  }
}

// 兼容微信PC端：canvas 尺寸可能需要用 devicePixelQuery
safeInit();
