/**
 * 小游戏题库服务
 * 部署到腾讯云开发容器
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 题库存放目录（相对于 server.js）
const DATA_DIR = path.join(__dirname, 'data');

// 排行榜数据文件
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// 排行榜内存缓存
let leaderboardCache = null;

function loadLeaderboard() {
  if (!leaderboardCache) {
    try {
      if (fs.existsSync(LEADERBOARD_FILE)) {
        leaderboardCache = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf-8'));
      } else {
        leaderboardCache = {};
      }
    } catch (e) {
      leaderboardCache = {};
    }
  }
  return leaderboardCache;
}

function saveLeaderboard(data) {
  leaderboardCache = data;
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 获取题目（单题）
function getPuzzle(game, level, difficulty = 'easy') {
  try {
    const filePath = path.join(DATA_DIR, game, difficulty, `${difficulty}-${level}.json`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      return { code: 0, data };
    }
    
    return { code: 404, message: '关卡不存在' };
  } catch (e) {
    return { code: 500, message: e.message };
  }
}

// 批量获取题目
function getPuzzles(game, start, count = 10, difficulty = 'easy') {
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const level = start + i;
    const result = getPuzzle(game, level, difficulty);
    
    if (result.code === 0) {
      results.push(result.data);
    }
  }
  
  return { code: 0, data: results };
}

// 获取题库统计
function getStats(game) {
  try {
    const diffs = ['easy', 'medium', 'hard'];
    const stats = {};
    
    for (const diff of diffs) {
      const dir = path.join(DATA_DIR, game, diff);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        stats[diff] = files.length;
      } else {
        stats[diff] = 0;
      }
    }
    
    return { code: 0, data: stats };
  } catch (e) {
    return { code: 500, message: e.message };
  }
}

// 获取游戏列表
function getGames() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      return { code: 0, data: [] };
    }
    
    const games = fs.readdirSync(DATA_DIR).filter(f => {
      return fs.statSync(path.join(DATA_DIR, f)).isDirectory();
    });
    
    return { code: 0, data: games };
  } catch (e) {
    return { code: 500, message: e.message };
  }
}

// 排行榜：获取排名
function getLeaderboard(game, limit = 100) {
  const board = loadLeaderboard();
  const gameScores = board[game] || [];
  
  const sorted = gameScores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item, index) => ({
      rank: index + 1,
      openid: item.openid,
      nickname: item.nickname || '匿名玩家',
      score: item.score,
      timestamp: item.timestamp
    }));
  
  return { code: 0, data: sorted };
}

// 排行榜：提交分数
function submitScore(game, openid, nickname, score) {
  const board = loadLeaderboard();
  
  if (!board[game]) {
    board[game] = [];
  }
  
  const existing = board[game].findIndex(item => item.openid === openid);
  
  if (existing >= 0) {
    if (score > board[game][existing].score) {
      board[game][existing] = { openid, nickname, score, timestamp: Date.now() };
    }
  } else {
    board[game].push({ openid, nickname, score, timestamp: Date.now() });
  }
  
  saveLeaderboard(board);
  return { code: 0, message: '分数已提交', rank: getRank(game, openid) };
}

// 获取用户排名
function getRank(game, openid) {
  const board = loadLeaderboard();
  const sorted = (board[game] || []).sort((a, b) => b.score - a.score);
  const index = sorted.findIndex(item => item.openid === openid);
  return index >= 0 ? index + 1 : -1;
}

// 路由处理
function route(req, body) {
  const url = req.url.split('?')[0];
  const method = req.method;

  if (url === '/puzzle' || url.startsWith('/puzzle')) {
    if (method === 'POST') {
      const { action, game, level, difficulty, start, count } = body;

      if (action === 'get' && game && level) {
        return getPuzzle(game, parseInt(level), difficulty || 'easy');
      }
      if (action === 'batch' && game && start && count) {
        return getPuzzles(game, parseInt(start), parseInt(count), difficulty || 'easy');
      }
      if (action === 'stats' && game) {
        return getStats(game);
      }
      if (action === 'games') {
        return getGames();
      }
    }
  }

  if (url === '/leaderboard' || url.startsWith('/leaderboard')) {
    if (method === 'POST') {
      const { action, game, openid, nickname, score, limit } = body;

      if (action === 'get' && game) {
        return getLeaderboard(game, parseInt(limit) || 100);
      }
      if (action === 'submit' && game && openid && score !== undefined) {
        return submitScore(game, openid, nickname, parseInt(score));
      }
      if (action === 'rank' && game && openid) {
        return { code: 0, data: { rank: getRank(game, openid) } };
      }
    }
  }

  if (url === '/health' || url === '/') {
    return { code: 0, message: 'OK', service: 'SolvePuzzle题库服务', version: '1.0.0' };
  }

  return { code: 404, message: 'Not Found' };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const parsed = body ? JSON.parse(body) : {};
      const result = route(req, parsed);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 500, message: e.message }));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 SolvePuzzle题库服务启动，端口 ${PORT}`);
  console.log(`📁 题库目录: ${DATA_DIR}`);
});

module.exports = server;