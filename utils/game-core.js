/**
 * GameCore - 小游戏核心框架
 * 提供：Canvas渲染、触摸事件、游戏循环、场景管理、音效、关卡
 */
// 延迟初始化（onLaunch 之后才创建）
let canvas = null;
let ctx = null;

// 音效管理器（延迟加载）
let Audio = null;

// 设计尺寸（375x667 基准，根据设备缩放）
const BASE_W = 375;
const BASE_H = 667;
let scale = 1;
let offsetX = 0;
let offsetY = 0;

// 颜色主题
const THEME = {
  bg: '#1a1a2e',
  card: 'rgba(255,255,255,0.08)',
  primary: '#667eea',
  accent: '#f093fb',
  text: '#ffffff',
  textGray: '#aaaaaa',
  success: '#4ecdc4',
  danger: '#f5576c',
  warning: '#ff7f4d',
};

// 当前场景
let currentScene = null;
let scenes = {};
let gameLoopId = null;
let lastTime = 0;

// ============== 初始化 ==============
function init(canvasInput) {
  canvas = canvasInput || wx.createCanvas();
  ctx = canvas.getContext('2d');
  resize();
  try {
    Audio = require('./audio-manager.js');
    Audio.init();
    Audio.registerAllSfx();
  } catch(e) {
    console.warn('[GameCore] 音效模块加载失败:', e.message);
  }
  console.info('[GameCore] 初始化完成，画布尺寸:', canvas.width, 'x', canvas.height);
}

// ============== 尺寸适配 ==============
function resize() {
  const sysInfo = wx.getSystemInfoSync();
  const screenW = sysInfo.windowWidth;
  const screenH = sysInfo.windowHeight;

  // 竖屏模式，宽度撑满，高度按比例
  scale = screenW / BASE_W;
  offsetX = 0;
  offsetY = (screenH - BASE_H * scale) / 2;

  canvas.width = screenW;
  canvas.height = screenH;
}

// ============== 坐标转换 ==============
function screenToGame(x, y) {
  return {
    x: (x - offsetX) / scale,
    y: (y - offsetY) / scale
  };
}

// ============== 绘制工具函数 ==============
function drawBg(color = THEME.bg) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCard(x, y, w, h, radius = 12) {
  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = THEME.card;
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
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

function drawText(text, x, y, opts = {}) {
  const {
    size = 14,
    color = THEME.text,
    align = 'left',
    baseline = 'top',
    bold = false,
    maxWidth = null
  } = opts;

  ctx.save();
  ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (maxWidth) {
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

function drawButton(x, y, w, h, label, opts = {}) {
  const {
    bg = THEME.primary,
    color = '#fff',
    radius = 10,
    fontSize = 14,
    active = false
  } = opts;

  const ay = active ? y + 2 : y;

  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = active ? shadeColor(bg, -15) : bg;
  ctx.fill();

  // 阴影
  if (!active) {
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fill();
  }

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, ay + h / 2);
  ctx.restore();

  return { x, y, w, h };
}

function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function drawLine(x1, y1, x2, y2, color = THEME.textGray, width = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawCircle(x, y, r, opts = {}) {
  const { fill = THEME.primary, stroke = null, strokeWidth = 1 } = opts;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
  ctx.restore();
}

// ============== 触摸检测 ==============
function hitTest(px, py, rect) {
  if (!rect || rect.x === undefined) return false;
  return px >= rect.x && px <= rect.x + rect.w &&
         py >= rect.y && py <= rect.y + rect.h;
}

// ============== 游戏循环 ==============
function startLoop() {
  if (gameLoopId) return;
  lastTime = Date.now();
  function loop() {
    const now = Date.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1); // 限制最大dt
    lastTime = now;

    if (currentScene && currentScene.update) {
      currentScene.update(dt);
    }
    if (currentScene && currentScene.render) {
      currentScene.render();
    }

    gameLoopId = wx.requestAnimationFrame(loop);
  }
  loop();
}

function stopLoop() {
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
  }
}

// ============== 场景管理 ==============
function registerScene(name, scene) {
  scenes[name] = scene;
}

function switchScene(name) {
  if (currentScene && currentScene.onExit) {
    currentScene.onExit();
  }
  currentScene = scenes[name];
  if (currentScene && currentScene.onEnter) {
    currentScene.onEnter();
  }
}

// ============== 触摸事件转发 ==============
function setupTouchEvents() {
  canvas.addEventListener('touchstart', (e) => {
    if (!e || !e.touches || !e.touches.length) return;
    const t = e.touches[0];
    if (currentScene && currentScene.onTouchStart) {
      const x = t.clientX !== undefined ? t.clientX : t.x || 0;
      const y = t.clientY !== undefined ? t.clientY : t.y || 0;
      const pos = screenToGame(x, y);
      currentScene.onTouchStart(pos.x, pos.y, t.identifier);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (!e || !e.touches || !e.touches.length) return;
    const t = e.touches[0];
    if (currentScene && currentScene.onTouchMove) {
      const x = t.clientX !== undefined ? t.clientX : t.x || 0;
      const y = t.clientY !== undefined ? t.clientY : t.y || 0;
      const pos = screenToGame(x, y);
      currentScene.onTouchMove(pos.x, pos.y, t.identifier);
    }
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (currentScene && currentScene.onTouchEnd) {
      if (e.changedTouches && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        const x = t.clientX !== undefined ? t.clientX : t.x || 0;
        const y = t.clientY !== undefined ? t.clientY : t.y || 0;
        const pos = screenToGame(x, y);
        currentScene.onTouchEnd(pos.x, pos.y, t.identifier);
      }
    }
  }, { passive: true });
}

// ============== 导出 ==============
module.exports = {
  // 初始化
  init,
  // 画布（懒加载）
  get canvas() { return canvas; },
  get ctx() { return ctx; },
  // 尺寸
  BASE_W,
  BASE_H,
  scale,
  offsetX,
  offsetY,
  resize,
  screenToGame,
  // 颜色
  THEME,
  // 绘制
  drawBg,
  drawCard,
  roundRect,
  drawText,
  drawButton,
  drawLine,
  drawCircle,
  hitTest,
  shadeColor,
  // 场景
  scenes,
  registerScene,
  switchScene,
  getCurrentScene: () => currentScene,
  // 循环
  startLoop,
  stopLoop,
  // 触摸
  setupTouchEvents,
  // 音效
  Audio: () => Audio,
  // 通用
  requestAnimationFrame: wx.requestAnimationFrame,
  showLoading: wx.showLoading,
  hideLoading: wx.hideLoading,
};
