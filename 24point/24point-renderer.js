/**
 * 24point-renderer.js — 24点速算画面渲染（纯函数）
 *
 * 所有函数接收 ctx 和渲染所需的状态参数，不持有内部状态。
 * 依赖 ../utils/round-rect.js 绘制圆角矩形。
 */

const roundRect = require('../utils/round-rect.js');

/**
 * 绘制背景：使用难度对应颜色的线性渐变。
 */
function drawBackground(ctx, width, height, config) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, config.colors[0] + '15');
  gradient.addColorStop(1, config.colors[1] + '10');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * 绘制状态信息：难度名称 · 当前关卡 · 已完成题数 · 正确率。
 */
function drawStatusInfo(ctx, width, contentStartY, config, level, stats) {
  const y = contentStartY + 15;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '13px Arial, -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${config.name} · 第${level}关 · ${stats.gamesPlayed || 0}题 · ${stats.accuracy || 0}%正确率`,
    width / 2, y
  );
  ctx.textAlign = 'left';
}

/**
 * 绘制4张数字卡（带浮动动画）。
 * 每张卡：阴影 + 渐变色前景 + 居中数字，各卡以不同相位波动。
 */
function drawNumberCards(ctx, width, contentStartY, numbers, config, animationTime) {
  const cardW = Math.min(70, width * 0.18);
  const cardH = cardW;
  const gap = 15;
  const totalCardWidth = cardW * 4 + gap * 3;
  const startX = (width - totalCardWidth) / 2;
  const startY = contentStartY + 40;

  for (let i = 0; i < 4; i++) {
    const x = startX + i * (cardW + gap);
    const y = startY + Math.sin(animationTime + i * 0.8) * 3;

    // 阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    roundRect(ctx, x + 2, y + 4, cardW, cardH, 12);
    ctx.fill();

    // 渐变色前景
    const gradient = ctx.createLinearGradient(x, y, x, y + cardH);
    gradient.addColorStop(0, config.colors[0]);
    gradient.addColorStop(1, config.colors[1]);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    roundRect(ctx, x, y, cardW, cardH, 12);
    ctx.fill();

    // 数字
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${cardW * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(numbers[i], x + cardW / 2, y + cardH / 2);
  }
}

/**
 * 绘制运算符按钮行（+ - × ÷ ( )）。
 */
function drawOperators(ctx, width, contentStartY) {
  const ops = ['+', '-', '×', '÷', '(', ')'];
  const opW = Math.min(50, width * 0.13);
  const opH = opW * 0.8;
  const gap = 15;
  const opStartX = (width - (opW * 6 + gap * 5)) / 2;
  const startY = contentStartY + 40 + Math.min(70, width * 0.18) + 40;

  for (let i = 0; i < 6; i++) {
    const x = opStartX + i * (opW + gap);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    roundRect(ctx, x, startY, opW, opH, 8);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${opW * 0.45}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ops[i], x + opW / 2, startY + opH / 2);
  }
}

/**
 * 绘制表达式输入框。
 */
function drawExpression(ctx, width, contentStartY, expression) {
  const cardW = Math.min(70, width * 0.18);
  const opW = Math.min(50, width * 0.13);
  const opH = opW * 0.8;
  const exprY = contentStartY + 40 + cardW + 40 + opH + 40;
  const boxH = 50;
  const padding = 15;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  roundRect(ctx, padding, exprY, width - padding * 2, boxH, 10);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const displayText = expression || '点击数字和运算符...';
  ctx.fillStyle = expression ? '#fff' : 'rgba(255, 255, 255, 0.5)';
  ctx.font = `${width / 20}px Arial`;
  ctx.fillText(displayText, padding + 12, exprY + boxH / 2);
}

/**
 * 绘制"清除"和"检查"按钮。
 */
function drawActionButtons(ctx, width, contentStartY) {
  const cardW = Math.min(70, width * 0.18);
  const opW = Math.min(50, width * 0.13);
  const opH = opW * 0.8;
  const btnY = contentStartY + 40 + cardW + 40 + opH + 40 + 50 + 30;
  const btnH = 45;
  const btnW = Math.min(60, width * 0.15);
  const btnGap = 20;
  const btnStartX = (width - (btnW * 2 + btnGap)) / 2;

  // 清除（红色）
  const clearX = btnStartX;
  ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
  ctx.beginPath();
  roundRect(ctx, clearX, btnY, btnW, btnH, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `${width / 25}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('清除', clearX + btnW / 2, btnY + btnH / 2);

  // 检查（绿色）
  const checkX = btnStartX + btnW + btnGap;
  ctx.fillStyle = 'rgba(107, 203, 119, 0.3)';
  ctx.beginPath();
  roundRect(ctx, checkX, btnY, btnW, btnH, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText('检查', checkX + btnW / 2, btnY + btnH / 2);
}

/**
 * 绘制检查结果提示条。
 */
function drawResult(ctx, width, contentStartY, isCorrect, resultMessage) {
  const cardW = Math.min(70, width * 0.18);
  const opW = Math.min(50, width * 0.13);
  const opH = opW * 0.8;
  const btnY = contentStartY + 40 + cardW + 40 + opH + 40 + 50 + 30;
  const btnH = 45;

  const boxW = width * 0.8;
  const boxH = 60;
  const boxX = (width - boxW) / 2;
  const boxY = btnY + btnH + 12;

  ctx.fillStyle = isCorrect ? 'rgba(107, 203, 119, 0.95)' : 'rgba(255, 107, 107, 0.95)';
  ctx.beginPath();
  roundRect(ctx, boxX, boxY, boxW, boxH, 12);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${width / 22}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(resultMessage, width / 2, boxY + boxH / 2);
  ctx.textBaseline = 'alphabetic';
}

/**
 * 文本自动换行绘制。
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split('');
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

/**
 * 绘制提示弹窗（遮罩 + 卡片 + 提示文字）。
 */
function drawHint(ctx, width, height, currentHint) {
  const boxW = width * 0.85;
  const boxH = 140;
  const boxX = (width - boxW) / 2;
  const boxY = height / 2 - boxH / 2 - 30;

  // 遮罩
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, width, height);

  // 卡片
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  roundRect(ctx, boxX, boxY, boxW, boxH, 16);
  ctx.fill();

  // 灯泡
  ctx.fillStyle = '#FFD700';
  ctx.font = `${width / 12}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('💡', width / 2, boxY + 35);

  // 提示文字
  ctx.fillStyle = '#333';
  ctx.font = `${width / 25}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  wrapText(ctx, currentHint, width / 2, boxY + 50, boxW - 40, 20);

  // 关闭提示
  ctx.fillStyle = '#4CAF50';
  ctx.font = `${width / 28}px Arial`;
  ctx.fillText('点击任意位置关闭', width / 2, boxY + boxH - 25);
}

module.exports = {
  drawBackground,
  drawStatusInfo,
  drawNumberCards,
  drawOperators,
  drawExpression,
  drawActionButtons,
  drawResult,
  drawHint,
  wrapText
};
