// SolvePuzzle 微信小游戏入口 — 分包版

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

// ── 分包加载管理 ────────────────────────────────────────────────────────────────
let subpackageLoaded = false;
let subpackageLoading = false;
let pendingGameLoad = null; // { gameName, level }

function loadSubpackage(callback) {
  if (subpackageLoaded) {
    callback && callback(true);
    return;
  }
  if (subpackageLoading) {
    // 正在加载中，等待完成
    const checkInterval = setInterval(function() {
      if (subpackageLoaded) {
        clearInterval(checkInterval);
        callback && callback(true);
      }
    }, 50);
    return;
  }
  subpackageLoading = true;
  
  // PC端兼容：3秒超时，直接尝试 require
  const timeout = setTimeout(function() {
    if (!subpackageLoaded && !subpackageLoading) return; // 已完成
    console.warn('[subpackage] 加载超时，尝试直接require');
    try {
      require('./games/menu.js');
      subpackageLoaded = true;
      subpackageLoading = false;
      callback && callback(true);
      if (pendingGameLoad) {
        const p = pendingGameLoad;
        pendingGameLoad = null;
        loadGame(p.gameName, p.level);
      }
    } catch(e) {
      console.error('[subpackage] 超时后直接require也失败:', e.message);
    }
  }, 3000);
  
  const task = wx.loadSubpackage({
    name: 'games',
    success: function() {
      clearTimeout(timeout);
      console.log('[subpackage] games 分包加载成功');
      subpackageLoaded = true;
      subpackageLoading = false;
      callback && callback(true);
      // 处理等待中的游戏加载
      if (pendingGameLoad) {
        const p = pendingGameLoad;
        pendingGameLoad = null;
        loadGame(p.gameName, p.level);
      }
    },
    fail: function(err) {
      clearTimeout(timeout);
      console.error('[subpackage] games 分包加载失败:', err);
      subpackageLoading = false;
      showErrorOnCanvas(new Error('分包加载失败: ' + (err.errMsg || JSON.stringify(err))));
      callback && callback(false);
    }
  });

  // 下载进度（可选）
  if (task && task.onProgressUpdate) {
    task.onProgressUpdate(function(res) {
      console.log('[subpackage] 下载进度:', res.progress + '%');
    });
  }
}

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
      case 'privacy':      gameModules[name] = require('./games/privacy.js'); break;
      case 'stats':        gameModules[name] = require('./games/stats.js'); break;
      case 'othello':      gameModules[name] = require('./games/othello.js'); break;
      case 'akari':        gameModules[name] = require('./games/akari.js'); break;
      case 'sokoban':      gameModules[name] = require('./games/sokoban.js'); break;
      case 'nurikabe':     gameModules[name] = require('./games/nurikabe.js'); break;
      case 'tents':        gameModules[name] = require('./games/tents.js'); break;
      case '24point':      gameModules[name] = require('./games/24point.js'); break;
      case 'slither-link': gameModules[name] = require('./games/slither-link.js'); break;
      case 'nonogram':     gameModules[name] = require('./games/nonogram.js'); break;
      case 'battleship':   gameModules[name] = require('./games/battleship.js'); break;
      case 'merge-abc':    gameModules[name] = require('./games/merge-abc.js'); break;
      case 'frog-escape':  gameModules[name] = require('./games/frog-escape.js'); break;
      case 'one-stroke':   gameModules[name] = require('./games/one-stroke.js'); break;
      case 'settings':     gameModules[name] = require('./games/settings.js'); break;
      case 'achievements': gameModules[name] = require('./games/achievements.js'); break;
      case 'leaderboard':  gameModules[name] = require('./games/leaderboard.js'); break;
      case 'prop-shop':    gameModules[name] = require('./games/prop-shop.js'); break;
      case 'redeem-code':  gameModules[name] = require('./games/redeem-code.js').RedeemCodeUI; break;
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
const loadingMessages = [
  '正在准备谜题世界...',
  '加载游戏资源中...',
  '唤醒沉睡的脑细胞...',
  '组装游戏组件...',
  '整理成就系统...',
  '马上就好啦...'
];

function showLoading(messageIndex) {
  if (!ctx) return;
  const w = systemInfo ? systemInfo.windowWidth : 375;
  const h = systemInfo ? systemInfo.windowHeight : 667;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, w, h);
  
  const msg = loadingMessages[messageIndex % loadingMessages.length];
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 18px -apple-system,BlinkMacSystemFont,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(msg, w / 2, h / 2);
  
  const dots = '.'.repeat((messageIndex % 3) + 1);
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '14px -apple-system';
  ctx.fillText('耐心等待' + dots, w / 2, h / 2 + 30);
  
  ctx.textAlign = 'left';
}

function startLoadingAnimation() {
  if (loadingShown) return;
  loadingShown = true;
  
  const animate = () => {
    showLoading(loadingPhase);
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
        (_touchListeners['touchstart'] || []).forEach(function(h) {
          try { h(res); } catch(e) { console.error('[polyfill touchstart]', e); }
        });
      });
      wx.onTouchMove(function(res) {
        if (!res.preventDefault) res.preventDefault = function() {};
        if (!res.stopPropagation) res.stopPropagation = function() {};
        (_touchListeners['touchmove'] || []).forEach(function(h) {
          try { h(res); } catch(e) { console.error('[polyfill touchmove]', e); }
        });
      });
      wx.onTouchEnd(function(res) {
        // 确保 res 有 preventDefault/stopPropagation 方法
        if (!res.preventDefault) res.preventDefault = function() {};
        if (!res.stopPropagation) res.stopPropagation = function() {};
        (_touchListeners['touchend'] || []).forEach(function(h) {
          try { h(res); } catch(e) { console.error('[polyfill touchend]', e); }
        });
        // 模拟 click 事件
        if (lastTouch) {
          const clickEvt = createClickEvent(lastTouch);
          (_touchListeners['click'] || []).forEach(function(h) {
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

function loadGame(gameName, level) {
  // 如果分包还没加载完，先排队
  if (!subpackageLoaded) {
    pendingGameLoad = { gameName: gameName, level: level };
    loadSubpackage();
    return;
  }

  if (!ctx) {
    showErrorOnCanvas(new Error('ctx is undefined'));
    return;
  }

  // 重置绘制错误标志位，允许新游戏正常绘制
  _drawErrorOccurred = false;

  // 停止加载动画
  stopLoadingAnimation();

  if (gameInstance) {
    try { gameInstance.destroy(); } catch(e) { console.warn('[game] destroy error:', e.message); }
    gameInstance = null;
    // 清空残留的事件监听器
    for (let type in _touchListeners) _touchListeners[type] = [];
  }

  try {
    const Module = getGameModule(gameName);
    if (!Module) {
      console.error('[loadGame] 模块加载失败:', gameName);
      gameInstance = new (getGameModule('menu'))(ctx, canvas, systemInfo, switchGame);
      currentGame = 'menu';
      return;
    }
    gameInstance = new Module(ctx, canvas, systemInfo, switchGame, level);
    currentGame = gameName;
    loadingShown = false;
    console.log('[loadGame] 加载成功:', gameName, level || '');
  } catch (e) {
    console.error('[loadGame] 加载失败:', gameName, e.message, e.stack);
    showErrorOnCanvas(e);
  }
}

function switchGame(gameName, level) {
  loadGame(gameName, level);
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
