/**
 * 图片生成工具（文案生图核心模块）
 * 支持文本、图片、二维码的绘制和导出
 * 平台兼容：微信小程序 + 鸿蒙
 */

const fontLoader = require('./fontLoader');

// 检测运行环境
const isHarmonyOS = typeof ohos !== 'undefined' || (typeof window !== 'undefined' && typeof window.$element !== 'undefined');

// 日志收集数组
let drawLogs = [];

/**
 * 记录绘制日志
 * @param {string} message - 日志信息
 * @param {object} data - 附加数据
 */
function logDraw(message, data = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    data
  };
  drawLogs.push(logEntry);
  console.debug(`[ImageGenerator] ${message}`, data);
}

/**
 * 获取所有绘制日志
 * @returns {string} 日志列表的字符串表示
 */
function getDrawLogs() {
  return JSON.stringify(drawLogs, null, 2);
}

/**
 * 清空绘制日志
 */
function clearDrawLogs() {
  drawLogs = [];
}

/**
 * 默认配置
 */
const defaultConfig = {
  width: 375,
  height: 667,
  padding: 10,
  qrSize: 85,
  qrMargin: 35,
  background: {
    gradient: true,
    colors: ['#f9f7fe', '#f0f4ff', '#e8f0ff', '#f5f0ff', '#fef7f9']
  }
};

/**
 * 计算文案绘制参数
 * @param {number} textLength - 文字长度
 * @param {number} availableHeight - 可用高度
 * @returns {object} {fontSize, lineHeight, maxLines}
 */
function calculateTextParams(textLength, availableHeight) {
  let fontSize, lineHeight;

  if (textLength <= 15) {
    fontSize = 36;
    lineHeight = 50;
  } else if (textLength <= 30) {
    fontSize = 32;
    lineHeight = 46;
  } else if (textLength <= 50) {
    fontSize = 28;
    lineHeight = 42;
  } else if (textLength <= 80) {
    fontSize = 24;
    lineHeight = 38;
  } else {
    fontSize = 22;
    lineHeight = 36;
  }

  // 根据可用高度计算最大行数
  const maxLines = Math.floor(availableHeight / lineHeight);

  return { fontSize, lineHeight, maxLines };
}

/**
 * 绘制背景
 * @param {object} ctx - Canvas上下文
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @param {object} options - 配置选项
 */
function drawBackground(ctx, width, height, options = {}) {
  const bg = { ...defaultConfig.background, ...options.background };
  
  if (bg.gradient) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    bg.colors.forEach((color, i) => {
      gradient.addColorStop(i / (bg.colors.length - 1), color);
    });
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = bg.color || '#ffffff';
  }
  ctx.fillRect(0, 0, width, height);
  
  // 绘制装饰圆形
  ctx.fillStyle = 'rgba(255, 166, 0, 0.08)';
  ctx.beginPath();
  ctx.arc(width * 0.2, height * 0.2, 120, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(138, 43, 226, 0.08)';
  ctx.beginPath();
  ctx.arc(width * 0.8, height * 0.3, 100, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(0, 191, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(width * 0.3, height * 0.8, 140, 0, 2 * Math.PI);
  ctx.fill();
  
  // 绘制装饰曲线
  const padding = options.padding || defaultConfig.padding;
  ctx.strokeStyle = 'rgba(147, 112, 219, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding, height * 0.3);
  ctx.bezierCurveTo(width * 0.25, height * 0.2, width * 0.75, height * 0.4, width - padding, height * 0.3);
  ctx.stroke();
  
  ctx.strokeStyle = 'rgba(255, 105, 180, 0.1)';
  ctx.beginPath();
  ctx.moveTo(padding, height * 0.7);
  ctx.bezierCurveTo(width * 0.25, height * 0.6, width * 0.75, height * 0.8, width - padding, height * 0.7);
  ctx.stroke();
}

/**
 * 设置Canvas字体
 * @param {object} ctx - Canvas上下文
 * @param {number} fontSize - 字体大小
 * @param {string} fontType - 字体类型
 * @param {boolean} isBold - 是否加粗
 */
function setCanvasFont(ctx, fontSize, fontType = 'handwriting', isBold = false) {
  // 基础字体栈
  const baseFontStacks = {
    title: ['Montserrat', 'Pacifico', 'Inter', 'Roboto', 'Noto Sans SC', '-apple-system', 'sans-serif'],
    body: ['Inter', 'Roboto', 'Open Sans', 'Noto Sans SC', '-apple-system', 'sans-serif'],
    handwriting: ['Pacifico', 'Dancing Script', 'Noto Sans SC', 'Inter', 'Roboto', 'cursive', 'STKaiti', 'KaiTi', 'serif'],
    elegant: ['Raleway', 'Lato', 'Source Sans 3', 'Noto Sans SC', 'STKaiti', 'serif']
  };

  // 构建字体栈
  const fontList = baseFontStacks[fontType] || baseFontStacks.body;
  const fontFamily = fontList.join(', ');
  const style = isBold ? 'bold ' : '';
  
  ctx.font = `${style}${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // 获取实际使用的字体
  const actualFont = ctx.font;
  logDraw('设置Canvas字体', { fontSize, fontType, isBold, fontFamily, actualFont });
}

/**
 * 根据像素宽度截断文本
 * @param {object} ctx - Canvas上下文
 * @param {string} text - 文本
 * @param {number} maxWidth - 最大宽度
 * @returns {object} {text, nextIndex}
 */
function getLineText(ctx, text, maxWidth) {
  let width = 0;
  let i = 0;
  const punctChars = ['，', '。', '！', '？', ',', '.', '!', '?', '、', '；', ':', '：'];

  // 先尝试测量能放下多少字符
  for (; i < text.length; i++) {
    const charWidth = ctx.measureText(text[i]).width;
    if (width + charWidth > maxWidth) {
      break;
    }
    width += charWidth;
  }

  // 如果没超，直接返回全部
  if (i >= text.length) {
    return { text: text, nextIndex: text.length };
  }

  // 智能断行逻辑
  let endPos = i;
  
  // 情况1：当前位置是标点符号，需要向前查找非标点字符
  if (punctChars.includes(text[i])) {
    for (let j = i - 1; j >= 0; j--) {
      if (!punctChars.includes(text[j])) {
        endPos = j + 1;
        break;
      }
    }
  }
  // 情况2：当前位置不是标点，向前查找最近的标点符号
  else {
    for (let j = i - 1; j >= 0; j--) {
      if (punctChars.includes(text[j])) {
        endPos = j + 1;
        break;
      }
    }
  }

  // 确保至少有一个字符
  if (endPos === 0) {
    endPos = i;
  }

  return { text: text.substring(0, endPos), nextIndex: endPos };
}

/**
 * 绘制文案内容
 * @param {object} ctx - Canvas上下文
 * @param {string} text - 文案内容
 * @param {object} options - 配置 {x, y, maxWidth, maxHeight, align}
 * @returns {number} 实际绘制高度
 */
async function drawText(ctx, text, options = {}) {
  const {
    x = 10,
    startY = 95,
    maxWidth = 285,
    maxHeight = 400,
    align = 'left'
  } = options;

  // 加载字体
  await fontLoader.loadFonts('core');

  const params = calculateTextParams(text.length, maxHeight);
  const { fontSize, lineHeight, maxLines } = params;

  setCanvasFont(ctx, fontSize, 'handwriting', true);
  // 绘制文案前设置字体，包含实际使用的字体
  logDraw('绘制文案前设置字体', { fontSize, fontType: 'handwriting', isBold: true, actualFont: ctx.font });

  // 根据文本长度动态调整maxWidth
  let adjustedMaxWidth = maxWidth;
  if (text.length > 80) {
    // 对于长文本，适当增加maxWidth以减少换行
    adjustedMaxWidth = maxWidth + 10;
  }

  let currentY = startY;
  let lineCount = 0;
  let hasMoreText = false;
  const paragraphs = text.split(/[\r\n]+/);

  for (let p = 0; p < paragraphs.length; p++) {
    let paragraphText = paragraphs[p];
    if (!paragraphText.trim()) continue;

    let pos = 0;
    while (pos < paragraphText.length && lineCount < maxLines) {
      const remainingText = paragraphText.substring(pos);
      const result = getLineText(ctx, remainingText, adjustedMaxWidth);
      const lineText = result.text.trim();

      if (lineText) {
        // 渐变色文字
        const gradient = ctx.createLinearGradient(x, currentY, x + adjustedMaxWidth, currentY);
        gradient.addColorStop(0, '#8e44ad');
        gradient.addColorStop(1, '#3498db');
        ctx.fillStyle = gradient;

        // 根据对齐方式设置绘制位置
        let drawX = x;
        if (align === 'center') {
          const textWidth = ctx.measureText(lineText).width;
          drawX = x + (adjustedMaxWidth - textWidth) / 2;
        }
        ctx.fillText(lineText, drawX, currentY);
        currentY += lineHeight;
        lineCount++;
      }

      pos += result.nextIndex;

      // 检查是否还有更多内容未显示
      if (pos < paragraphText.length && lineCount >= maxLines) {
        hasMoreText = true;
      }
    }

    // 检查段落间是否还有更多内容
    if (p < paragraphs.length - 1 && lineCount >= maxLines) {
      hasMoreText = true;
    }

    if (p < paragraphs.length - 1 && lineCount < maxLines) {
      currentY += lineHeight * 0.3;
    }
  }

  // 只有在确实还有更多内容未显示时才添加省略号
  if (hasMoreText) {
    ctx.fillStyle = '#8e44ad';
    ctx.fillText('...', x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

/**
 * 绘制来源信息
 * @param {object} ctx - Canvas上下文
 * @param {string} from - 来源
 * @param {object} options - 配置 {x, y, maxWidth, align}
 */
function drawFrom(ctx, from, options = {}) {
  const { x = 10, y, maxWidth = 285, align = 'right' } = options;
  
  if (from && from !== '佚名') {
    setCanvasFont(ctx, 16, 'elegant', false);
    // 绘制来源信息前设置字体，包含实际使用的字体
    logDraw('绘制来源信息前设置字体', { fontSize: 16, fontType: 'elegant', isBold: false, actualFont: ctx.font });
    ctx.fillStyle = '#8a9aaf';
    ctx.textAlign = align;
    const text = '@ ' + from;
    if (align === 'center') {
      ctx.fillText(text, x, y);
    } else {
      ctx.fillText(text, x + maxWidth, y);
    }
    ctx.textAlign = 'left';
  }
}

/**
 * 绘制日期信息
 * @param {object} ctx - Canvas上下文
 * @param {object} options - 配置 {x, y}
 */
function drawDate(ctx, options = {}) {
  const { x = 10, qrY, qrSize, qrMargin } = options;
  const now = new Date();
  
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekDay = weekDays[now.getDay()];
  
  // 尝试使用农历（如果可用）
  let lunarInfo = '';
  try {
    const { Solar } = require('lunar-javascript');
    const solar = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const lunarDate = solar.getLunar();
    lunarInfo = lunarDate.getYearInGanZhi();
  } catch (e) {
    lunarInfo = '';
  }
  
  const qrCenterY = qrY + qrSize / 2;
  
  setCanvasFont(ctx, 14, 'title', true);
  // 绘制日期信息前设置字体，包含实际使用的字体
  logDraw('绘制日期信息前设置字体', { fontSize: 14, fontType: 'title', isBold: true, actualFont: ctx.font });
  ctx.fillStyle = '#4a5568';
  ctx.fillText(dateStr, x, qrCenterY - 20);
  
  setCanvasFont(ctx, 12, 'body');
  // 绘制星期信息前设置字体，包含实际使用的字体
  logDraw('绘制星期信息前设置字体', { fontSize: 12, fontType: 'body', isBold: false, actualFont: ctx.font });
  ctx.fillStyle = '#718096';
  const weekText = lunarInfo ? `星期${weekDay} ${lunarInfo}` : `星期${weekDay}`;
  ctx.fillText(weekText, x, qrCenterY + 5);
}

/**
 * 绘制二维码
 * @param {object} ctx - Canvas上下文
 * @param {string} qrPath - 二维码图片路径
 * @param {object} options - 配置 {qrX, qrY, qrSize, hasBorder}
 */
function drawQRCode(ctx, qrPath, options = {}) {
  const {
    qrX,
    qrY,
    qrSize = 85,
    hasBorder = true
  } = options;
  
  // 白色背景边框
  if (hasBorder) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);
  }
  
  // 绘制二维码
  ctx.drawImage(qrPath, qrX, qrY, qrSize, qrSize);
}

/**
 * 导出图片
 * @param {object} ctx - Canvas上下文
 * @param {object} options - 配置 {canvasId, width, height, pixelRatio, success, fail}
 */
function exportImage(ctx, options = {}) {
  const {
    canvasId,
    width,
    height,
    pixelRatio = 2,
    quality = 1,
    success,
    fail
  } = options;
  
  if (isHarmonyOS) {
    // 鸿蒙平台导出
    const canvas = this.$element(canvasId);
    if (canvas) {
      const imageData = canvas.toDataURL('image/png');
      if (success) success(imageData);
    } else {
      if (fail) fail({ error: 'Canvas not found' });
    }
  } else {
    // 微信小程序导出 (新版 type="2d" Canvas 不需要 draw)
    if (success) success();
  }
}

/**
 * 保存图片到相册
 * @param {string} filePath - 文件路径
 * @param {function} success - 成功回调
 * @param {function} fail - 失败回调
 */
function saveToAlbum(filePath, success, fail) {
  if (isHarmonyOS) {
    // 鸿蒙平台
    const image = require('@system.image');
    image.saveToPhotosAlbum({
      uri: filePath,
      success: (res) => {
        if (success) success(res);
      },
      fail: (data, code) => {
        if (fail) fail({ code, data });
      }
    });
  } else {
    // 微信小程序
    wx.saveImageToPhotosAlbum({
      filePath,
      success: (res) => {
        if (success) success(res);
      },
      fail: (err) => {
        if (fail) fail(err);
      }
    });
  }
}

module.exports = {
  defaultConfig,
  calculateTextParams,
  drawBackground,
  setCanvasFont,
  drawText,
  drawFrom,
  drawDate,
  drawQRCode,
  exportImage,
  saveToAlbum,
  // 日志相关函数
  logDraw,
  getDrawLogs,
  clearDrawLogs
};
