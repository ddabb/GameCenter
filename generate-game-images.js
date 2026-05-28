const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');

function registerEmojiFonts() {
  const fontPaths = [
    'C:\\Windows\\Fonts\\seguiemj.ttf',
    'C:\\Windows\\Fonts\\NotoColorEmoji.ttf',
    'C:\\Windows\\Fonts\\symbola.ttf',
  ];
  
  for (const fontPath of fontPaths) {
    if (fs.existsSync(fontPath)) {
      try {
        registerFont(fontPath, { family: 'EmojiFont' });
        return true;
      } catch (e) {}
    }
  }
  return false;
}

registerEmojiFonts();

const gameConfigs = [
  { name: 'one-stroke',    title: '一笔画',    icon: '✍️', color: '#F6AD55', bgColor: '#DD6B20' },
  { name: 'othello',       title: '黑白棋',    icon: '⚫', color: '#4A5568', bgColor: '#2D3748' },
  { name: 'sweep-frog',    title: '扫青蛙',    icon: '🐸', color: '#48BB78', bgColor: '#38A169' },
  { name: 'akari',         title: '灯塔',      icon: '💡', color: '#ECC94B', bgColor: '#D69E2E' },
  { name: 'sokoban',       title: '推箱子',    icon: '📦', color: '#ED8936', bgColor: '#CD853F' },
  { name: 'nurikabe',      title: '数墙',      icon: '🧱', color: '#718096', bgColor: '#4A5568' },
  { name: 'tents',         title: '帐篷',      icon: '⛺', color: '#38A169', bgColor: '#2F855A' },
  { name: '24point',       title: '24点',      icon: '🧮', color: '#E53E3E', bgColor: '#C53030' },
  { name: 'slither-link', title: '数回',      icon: '🔗', color: '#3182CE', bgColor: '#2B6CB0' },
  { name: 'nonogram',      title: '数织',      icon: '🎨', color: '#805AD5', bgColor: '#6B46C1' },
  { name: 'battleship',    title: '海战',      icon: '🚢', color: '#00B5D8', bgColor: '#00A3C4' },
  { name: 'merge-abc',     title: '合成ABC',   icon: '🔤', color: '#D69E2E', bgColor: '#B7791F' },
];

function drawOthelloCard(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const radius = 14;
  
  ctx.fillStyle = '#2D5A27';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  const boardSize = size * 0.88;
  const boardX = (size - boardSize) / 2;
  const boardY = (size - boardSize) / 2;
  const cellSize = boardSize / 8;
  
  ctx.fillStyle = '#1B4332';
  ctx.beginPath();
  ctx.roundRect(boardX, boardY, boardSize, boardSize, 8);
  ctx.fill();
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const x = boardX + col * cellSize;
      const y = boardY + row * cellSize;
      
      if ((row + col) % 2 === 0) {
        ctx.fillStyle = '#2D6A4F';
      } else {
        ctx.fillStyle = '#40916C';
      }
      ctx.fillRect(x, y, cellSize, cellSize);
      
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }
  
  const centerRow = 3;
  const centerCol = 3;
  
  const drawPiece = (row, col, isBlack) => {
    const x = boardX + col * cellSize + cellSize / 2;
    const y = boardY + row * cellSize + cellSize / 2;
    const pieceRadius = cellSize * 0.44;
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    
    ctx.beginPath();
    ctx.arc(x, y, pieceRadius, 0, Math.PI * 2);
    
    if (isBlack) {
      const gradient = ctx.createRadialGradient(x - pieceRadius * 0.3, y - pieceRadius * 0.3, 0, x, y, pieceRadius);
      gradient.addColorStop(0, '#555555');
      gradient.addColorStop(0.5, '#222222');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
    } else {
      const gradient = ctx.createRadialGradient(x - pieceRadius * 0.3, y - pieceRadius * 0.3, 0, x, y, pieceRadius);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.5, '#EEEEEE');
      gradient.addColorStop(1, '#CCCCCC');
      ctx.fillStyle = gradient;
    }
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    ctx.fillStyle = isBlack ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.arc(x - pieceRadius * 0.3, y - pieceRadius * 0.3, pieceRadius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  };
  
  drawPiece(centerRow, centerCol, false);
  drawPiece(centerRow, centerCol + 1, true);
  drawPiece(centerRow + 1, centerCol, true);
  drawPiece(centerRow + 1, centerCol + 1, false);
  
  return canvas.toBuffer('image/png');
}

function drawOneStrokeCard(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const radius = 14;
  ctx.fillStyle = '#DD6B20';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  const gridSize = size * 0.75;
  const offset = (size - gridSize) / 2;
  const cellSize = gridSize / 4;
  
  ctx.fillStyle = '#0a1628';
  ctx.beginPath();
  ctx.roundRect(offset, offset, gridSize, gridSize, 8);
  ctx.fill();
  
  const holes = [5, 10];
  const path = [0, 1, 2, 6, 7, 11, 15, 14, 13, 9, 8, 4];
  
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const idx = row * 4 + col;
      const x = offset + col * cellSize;
      const y = offset + row * cellSize;
      const isHole = holes.includes(idx);
      const inPath = path.includes(idx);
      const pathIdx = path.indexOf(idx);
      
      if (isHole) {
        ctx.fillStyle = '#1a2a3a';
      } else if (inPath) {
        ctx.fillStyle = '#2a3a4a';
      } else {
        ctx.fillStyle = '#1a2a3a';
      }
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      
      if (isHole) {
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.25, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      if (inPath && !isHole) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(10, cellSize * 0.35)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pathIdx + 1, x + cellSize / 2, y + cellSize / 2);
      }
      
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }
  
  if (path.length > 1) {
    ctx.strokeStyle = '#FFB800';
    ctx.lineWidth = Math.max(2, cellSize * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const first = path[0];
    ctx.moveTo(offset + (first % 4) * cellSize + cellSize / 2,
               offset + Math.floor(first / 4) * cellSize + cellSize / 2);
    for (let i = 1; i < path.length; i++) {
      const idx = path[i];
      ctx.lineTo(offset + (idx % 4) * cellSize + cellSize / 2,
                 offset + Math.floor(idx / 4) * cellSize + cellSize / 2);
    }
    ctx.stroke();
  }
  
  return canvas.toBuffer('image/png');
}

function drawFrogEscapeCard(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const radius = 14;
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, '#48BB78');
  gradient.addColorStop(1, '#2F855A');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  const cellSize = size * 0.8 / 6;
  const offset = (size - cellSize * 6) / 2;
  
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const x = offset + col * cellSize;
      const y = offset + row * cellSize;
      ctx.fillStyle = row % 2 === col % 2 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
  
  const frogX = offset + 2 * cellSize + cellSize / 2;
  const frogY = offset + 2 * cellSize + cellSize / 2;
  const frogSize = cellSize * 0.9;
  
  ctx.fillStyle = '#FF6B6B';
  ctx.beginPath();
  ctx.ellipse(frogX, frogY, frogSize / 2, frogSize / 3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${frogSize * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🐸', frogX, frogY);
  
  return canvas.toBuffer('image/png');
}

function drawAkariCard(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const radius = 14;
  ctx.fillStyle = '#D69E2E';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  const cellSize = size * 0.8 / 5;
  const offset = (size - cellSize * 5) / 2;
  
  ctx.fillStyle = '#1A202C';
  ctx.beginPath();
  ctx.roundRect(offset, offset, cellSize * 5, cellSize * 5, 8);
  ctx.fill();
  
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const x = offset + col * cellSize;
      const y = offset + row * cellSize;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }
  
  const lightX = offset + 2 * cellSize + cellSize / 2;
  const lightY = offset + 2 * cellSize + cellSize / 2;
  
  const glowGradient = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, cellSize * 1.5);
  glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
  glowGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
  glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(lightX, lightY, cellSize * 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#FFD700';
  ctx.font = `${cellSize * 0.8}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💡', lightX, lightY);
  
  return canvas.toBuffer('image/png');
}

function drawSokobanCard(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const radius = 14;
  ctx.fillStyle = '#ED8936';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  const cellSize = size * 0.8 / 5;
  const offset = (size - cellSize * 5) / 2;
  
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const x = offset + col * cellSize;
      const y = offset + row * cellSize;
      ctx.fillStyle = '#FFF8E7';
      ctx.fillRect(x, y, cellSize, cellSize);
      
      ctx.fillStyle = '#ED8936';
      ctx.strokeStyle = '#D69E2E';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }
  
  ctx.fillStyle = '#4A5568';
  ctx.fillRect(offset + cellSize, offset + cellSize, cellSize, cellSize);
  ctx.fillRect(offset + cellSize, offset + 3 * cellSize, cellSize, cellSize);
  ctx.fillRect(offset + 3 * cellSize, offset + cellSize, cellSize, cellSize);
  
  const boxX = offset + 2 * cellSize + cellSize / 2;
  const boxY = offset + 2 * cellSize + cellSize / 2;
  
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(boxX - cellSize * 0.35, boxY - cellSize * 0.35, cellSize * 0.7, cellSize * 0.7);
  
  ctx.fillStyle = '#A0522D';
  ctx.fillRect(boxX - cellSize * 0.35, boxY - cellSize * 0.35, cellSize * 0.7, cellSize * 0.15);
  
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.arc(offset + 4 * cellSize + cellSize / 2, offset + 3 * cellSize + cellSize / 2, cellSize * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas.toBuffer('image/png');
}

function drawNurikabeCard(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const radius = 14;
  ctx.fillStyle = '#4A5568';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  const cellSize = size * 0.8 / 7;
  const offset = (size - cellSize * 7) / 2;
  
  ctx.fillStyle = '#2D3748';
  ctx.beginPath();
  ctx.roundRect(offset, offset, cellSize * 7, cellSize * 7, 8);
  ctx.fill();
  
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      const x = offset + col * cellSize;
      const y = offset + row * cellSize;
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }
  
  const islands = [
    { row: 1, col: 1, num: 3 },
    { row: 3, col: 3, num: 5 },
    { row: 5, col: 5, num: 4 },
    { row: 2, col: 6, num: 2 },
  ];
  
  islands.forEach(isl => {
    const x = offset + isl.col * cellSize;
    const y = offset + isl.row * cellSize;
    ctx.fillStyle = '#68D391';
    ctx.fillRect(x, y, cellSize, cellSize);
    
    ctx.fillStyle = '#276749';
    ctx.font = `bold ${cellSize * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isl.num.toString(), x + cellSize / 2, y + cellSize / 2);
  });
  
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(Math.random() * 7);
    const col = Math.floor(Math.random() * 7);
    if (!islands.some(isl => isl.row === row && isl.col === col)) {
      ctx.fillStyle = '#1A202C';
      ctx.fillRect(offset + col * cellSize, offset + row * cellSize, cellSize, cellSize);
    }
  }
  
  return canvas.toBuffer('image/png');
}

function drawTentsCard(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const radius = 14;
  ctx.fillStyle = '#38A169';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  const cellSize = size * 0.8 / 5;
  const offset = (size - cellSize * 5) / 2;
  
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const x = offset + col * cellSize;
      const y = offset + row * cellSize;
      ctx.fillStyle = row % 2 === col % 2 ? '#2F855A' : '#38A169';
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
  
  ctx.fillStyle = '#8B4513';
  const drawTree = (row, col) => {
    const x = offset + col * cellSize + cellSize / 2;
    const y = offset + row * cellSize + cellSize / 2;
    
    ctx.fillStyle = '#2D5A27';
    ctx.beginPath();
    ctx.moveTo(x, y - cellSize * 0.35);
    ctx.lineTo(x - cellSize * 0.25, y + cellSize * 0.2);
    ctx.lineTo(x + cellSize * 0.25, y + cellSize * 0.2);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x - cellSize * 0.05, y + cellSize * 0.2, cellSize * 0.1, cellSize * 0.2);
  };
  
  drawTree(1, 1);
  drawTree(3, 3);
  drawTree(2, 4);
  
  ctx.fillStyle = '#FFD700';
  const drawTent = (row, col) => {
    const x = offset + col * cellSize + cellSize / 2;
    const y = offset + row * cellSize + cellSize / 2;
    
    ctx.beginPath();
    ctx.moveTo(x, y - cellSize * 0.3);
    ctx.lineTo(x - cellSize * 0.25, y + cellSize * 0.2);
    ctx.lineTo(x + cellSize * 0.25, y + cellSize * 0.2);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#1A202C';
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  
  drawTent(1, 2);
  drawTent(3, 2);
  
  return canvas.toBuffer('image/png');
}

function draw24PointCard(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const radius = 14;
  ctx.fillStyle = '#C53030';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  const nums = ['9', '5', '2', '7'];
  
  const cellSize = size * 0.32;
  const gap = 6;
  const gridW = cellSize * 2 + gap;
  const gridH = cellSize * 2 + gap;
  const offsetX = (size - gridW) / 2;
  const offsetY = (size - gridH) / 2;
  
  nums.forEach((num, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = offsetX + col * (cellSize + gap);
    const y = offsetY + row * (cellSize + gap);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(x, y, cellSize, cellSize, 8);
    ctx.fill();
    
    ctx.fillStyle = '#C53030';
    ctx.font = `bold ${cellSize * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num, x + cellSize / 2, y + cellSize / 2);
  });
  
  return canvas.toBuffer('image/png');
}

function drawSlitherLinkCard(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const radius = 14;
  ctx.fillStyle = '#2B6CB0';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  const cellSize = size * 0.8 / 6;
  const offset = (size - cellSize * 6) / 2;
  
  ctx.fillStyle = '#1A365D';
  ctx.beginPath();
  ctx.roundRect(offset, offset, cellSize * 6, cellSize * 6, 8);
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(offset, offset + i * cellSize);
    ctx.lineTo(offset + cellSize * 6, offset + i * cellSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(offset + i * cellSize, offset);
    ctx.lineTo(offset + i * cellSize, offset + cellSize * 6);
    ctx.stroke();
  }
  
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  ctx.moveTo(offset + cellSize * 2, offset + cellSize);
  ctx.lineTo(offset + cellSize * 5, offset + cellSize);
  ctx.lineTo(offset + cellSize * 5, offset + cellSize * 3);
  ctx.lineTo(offset + cellSize * 4, offset + cellSize * 3);
  ctx.lineTo(offset + cellSize * 4, offset + cellSize * 5);
  ctx.lineTo(offset + cellSize, offset + cellSize * 5);
  ctx.lineTo(offset + cellSize, offset + cellSize * 2);
  ctx.lineTo(offset + cellSize * 2, offset + cellSize * 2);
  ctx.closePath();
  ctx.stroke();
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${cellSize * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', offset + cellSize * 1.5, offset + cellSize * 1.5);
  ctx.fillText('3', offset + cellSize * 3.5, offset + cellSize * 1.5);
  ctx.fillText('2', offset + cellSize * 4.5, offset + cellSize * 2.5);
  ctx.fillText('2', offset + cellSize * 2.5, offset + cellSize * 4.5);
  
  return canvas.toBuffer('image/png');
}

function drawNonogramCard(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const radius = 14;
  ctx.fillStyle = '#6B46C1';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  const gridSize = size * 0.78;
  const cellSize = gridSize / 5;
  const offset = (size - gridSize) / 2;
  
  ctx.fillStyle = '#4A35A8';
  ctx.beginPath();
  ctx.roundRect(offset, offset, gridSize, gridSize, 8);
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(offset, offset + i * cellSize);
    ctx.lineTo(offset + gridSize, offset + i * cellSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(offset + i * cellSize, offset);
    ctx.lineTo(offset + i * cellSize, offset + gridSize);
    ctx.stroke();
  }
  
  ctx.fillStyle = '#1A202C';
  const filledCells = [
    [0, 0], [1, 0], [2, 0],
    [1, 1], [2, 1],
    [0, 2], [2, 2],
    [0, 3], [1, 3], [2, 3],
    [1, 4],
  ];
  
  filledCells.forEach(cell => {
    ctx.fillRect(offset + cell[0] * cellSize, offset + cell[1] * cellSize, cellSize, cellSize);
  });
  
  return canvas.toBuffer('image/png');
}

function drawBattleshipCard(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const roundRect = (ctx, x, y, w, h, r) => {
    if (typeof r === 'number') r = [r, r, r, r];
    const [tl, tr, br, bl] = r.length === 1 ? [r[0], r[0], r[0], r[0]] : r;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.arcTo(x + w, y, x + w, y + tr, tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
    ctx.lineTo(x + bl, y + h);
    ctx.arcTo(x, y + h, x, y + h - bl, bl);
    ctx.lineTo(x, y + tl);
    ctx.arcTo(x, y, x + tl, y, tl);
    ctx.closePath();
  };
  
  const radius = 14;
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#1E3A5F');
  gradient.addColorStop(1, '#0D2137');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  roundRect(ctx, 0, 0, size, size, radius);
  ctx.fill();
  
  const gridSize = size * 0.8;
  const offset = (size - gridSize) / 2;
  const cellSize = gridSize / 8;
  
  ctx.fillStyle = '#0A1929';
  ctx.beginPath();
  roundRect(ctx, offset, offset, gridSize, gridSize, 8);
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(offset, offset + i * cellSize);
    ctx.lineTo(offset + gridSize, offset + i * cellSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(offset + i * cellSize, offset);
    ctx.lineTo(offset + i * cellSize, offset + gridSize);
    ctx.stroke();
  }
  
  const hits = [
    { x: 2, y: 3, hit: true },
    { x: 3, y: 3, hit: true },
    { x: 4, y: 3, hit: true },
    { x: 1, y: 1, hit: false },
    { x: 6, y: 5, hit: false },
    { x: 2, y: 6, hit: true },
    { x: 3, y: 6, hit: true },
  ];
  
  hits.forEach(h => {
    const cx = offset + h.x * cellSize + cellSize / 2;
    const cy = offset + h.y * cellSize + cellSize / 2;
    
    if (h.hit) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${cellSize * 0.5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✕', cx, cy);
    } else {
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  
  return canvas.toBuffer('image/png');
}

function drawMergeAbcCard(size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const roundRect = (ctx, x, y, w, h, r) => {
    if (typeof r === 'number') r = [r, r, r, r];
    const [tl, tr, br, bl] = r.length === 1 ? [r[0], r[0], r[0], r[0]] : r;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.arcTo(x + w, y, x + w, y + tr, tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
    ctx.lineTo(x + bl, y + h);
    ctx.arcTo(x, y + h, x, y + h - bl, bl);
    ctx.lineTo(x, y + tl);
    ctx.arcTo(x, y, x + tl, y, tl);
    ctx.closePath();
  };
  
  const radius = 14;
  ctx.fillStyle = '#B7791F';
  ctx.beginPath();
  roundRect(ctx, 0, 0, size, size, radius);
  ctx.fill();
  
  const gridSize = size * 0.8;
  const offset = (size - gridSize) / 2;
  const cellSize = gridSize / 4;
  
  ctx.fillStyle = '#1A1A2E';
  ctx.beginPath();
  roundRect(ctx, offset, offset, gridSize, gridSize, 8);
  ctx.fill();
  
  const colors = {
    'A': '#FF6B6B', 'B': '#4ECDC4', 'C': '#45B7D1', 'D': '#96CEB4',
    'E': '#FFEAA7', 'F': '#DDA0DD', 'G': '#98D8C8', 'H': '#F7DC6F',
  };
  
  const board = [
    ['A', 'B', '', ''],
    ['', 'C', 'D', ''],
    ['E', '', '', 'F'],
    ['', 'G', 'H', ''],
  ];
  
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = offset + col * cellSize;
      const y = offset + row * cellSize;
      
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSize, cellSize);
      
      const letter = board[row][col];
      if (letter) {
        ctx.fillStyle = colors[letter] || '#777';
        ctx.beginPath();
        roundRect(ctx, x + 4, y + 4, cellSize - 8, cellSize - 8, 6);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${cellSize * 0.45}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter, x + cellSize / 2, y + cellSize / 2);
      }
    }
  }
  
  return canvas.toBuffer('image/png');
}

function drawGameCardWithText(game, size = 128) {
  switch (game.name) {
    case 'othello': return drawOthelloCard(size);
    case 'one-stroke': return drawOneStrokeCard(size);
    case 'sweep-frog': return drawFrogEscapeCard(size);
    case 'akari': return drawAkariCard(size);
    case 'sokoban': return drawSokobanCard(size);
    case 'nurikabe': return drawNurikabeCard(size);
    case 'tents': return drawTentsCard(size);
    case '24point': return draw24PointCard(size);
    case 'slither-link': return drawSlitherLinkCard(size);
    case 'nonogram': return drawNonogramCard(size);
    case 'battleship': return drawBattleshipCard(size);
    case 'merge-abc': return drawMergeAbcCard(size);
    default:
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, game.color);
      gradient.addColorStop(1, game.bgColor);
      
      const radius = 14;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, radius);
      ctx.fill();
      
      const iconSize = Math.floor(size * 0.45);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${iconSize}px "EmojiFont", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      ctx.fillText(game.icon, size / 2, size / 2);
      
      ctx.shadowColor = 'transparent';
      
      return canvas.toBuffer('image/png');
  }
}

console.log('开始重新生成包含文字的菜单卡片...\n');

gameConfigs.forEach(game => {
  const dir = `assets/images/games/${game.name}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // 生成包含文字的菜单卡片
  const cardBuffer = drawGameCardWithText(game, 128);
  fs.writeFileSync(`${dir}/menu-card.png`, cardBuffer);
  console.log(`✓ ${game.name}/menu-card.png`);
});

console.log('\n✅ 所有菜单卡片重新生成完成！');

// ========== 道具商城图标生成（从 twemoji CDN 下载彩色 PNG） ==========
console.log('\n开始生成道具商城图标（从 twemoji CDN 下载）...\n');

const https = require('https');

const propEmojiMap = {
  'hint':       { emoji: '💡', codepoint: '1f4a1' },
  'undo':       { emoji: '↩️', codepoint: '21a9' },
  'answer':     { emoji: '🔍', codepoint: '1f50d' },
  'extra_life': { emoji: '❤️', codepoint: '2764' },
};

const propDir = 'assets/images/props';
if (!fs.existsSync(propDir)) {
  fs.mkdirSync(propDir, { recursive: true });
}

function downloadTwemojiPNG(codepoint, filePath) {
  const urls = [
    `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/${codepoint}.png`,
    `https://cdn.jsdelivr.net/gh/twitter/twemoji@master/assets/72x72/${codepoint}.png`,
  ];

  const downloadRaw = (u, maxRedirects = 3) => {
    return new Promise((resolve, reject) => {
      console.log(`  请求: ${u}`);
      https.get(u, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode)) {
          if (maxRedirects <= 0) return reject(new Error('too many redirects'));
          // 解析重定向 URL（可能是相对路径）
          const loc = res.headers.location;
          const nextUrl = loc.startsWith('http') ? loc : new URL(u).origin + loc;
          return resolve(downloadRaw(nextUrl, maxRedirects - 1));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => { fs.writeFileSync(filePath, Buffer.concat(chunks)); resolve(); });
        res.on('error', reject);
      }).on('error', reject);
    });
  };

  async function tryUrl(idx) {
    if (idx >= urls.length) throw new Error('all mirrors failed');
    try {
      await downloadRaw(urls[idx]);
      return;
    } catch (e) {
      console.log(`  失败: ${e.message}，尝试下一个镜像...`);
      return tryUrl(idx + 1);
    }
  }
  return tryUrl(0);
}

(async () => {
  for (const [key, info] of Object.entries(propEmojiMap)) {
    const filePath = `${propDir}/${key}.png`;
    try {
      await downloadTwemojiPNG(info.codepoint, filePath);
      const stat = fs.statSync(filePath);
      console.log(`  ✓ ${key}.png (${stat.size} bytes)`);
    } catch (e) {
      console.log(`  ✗ ${key}.png 下载失败: ${e.message}`);
    }
  }
  console.log('\n✅ 道具商城图标生成完成！');
})().catch(console.error);