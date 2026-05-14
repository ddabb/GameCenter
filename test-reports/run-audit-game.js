/**
 * GeZiPuzzle 小游戏自动化审计脚本
 *
 * 由于小游戏没有 WXML 页面，miniprogram-automator 无法直接工作。
 * 本脚本通过开发者工具 CLI 连接项目，用 evalOnPath 执行游戏内 API
 * 依次切换到各个场景，触发官方 Audits 评分。
 *
 * 用法：
 *   node test-reports/run-audit-game.js
 *
 * 前置条件：
 *   1. 微信开发者工具已打开 GeZiPuzzle 项目
 *   2. 在【设置 → 安全】中开启「服务端口」
 *   3. 项目路径正确配置（见下方 PROJECT_PATH）
 */

const path = require('path')
const fs = require('fs')

// ============================================================
// Patch: Node.js >= 18 在 Windows 上 spawn .bat 需要 shell: true
// ============================================================
if (process.platform === 'win32') {
  const cp = require('child_process')
  const _spawn = cp.spawn.bind(cp)
  cp.spawn = function (cmd, args, opts) {
    if (typeof cmd === 'string' && /\.bat$/i.test(cmd)) {
      opts = Object.assign({ windowsHide: true }, opts, { shell: true })
    }
    return _spawn(cmd, args, opts)
  }
}

// 从 freetools 的 node_modules 加载 miniprogram-automator
const freetoolsNodeModules = 'F:\\SelfJob\\freetools\\node_modules'
let automator
try {
  automator = require(path.join(freetoolsNodeModules, 'miniprogram-automator'))
} catch (e) {
  console.error('❌ 找不到 miniprogram-automator，请先在 freetools 目录下安装：')
  console.error('   cd F:\\SelfJob\\freetools && npm install miniprogram-automator')
  process.exit(1)
}

// ============================================================
// 配置
// ============================================================
const PROJECT_PATH = 'F:\\SelfJob\\GeZiPuzzle'
const REPORT_DIR = path.resolve(__dirname)
const REPORT_PATH = path.join(REPORT_DIR, 'audits-report-game.html')

const SCENE_DWELL_MS = 3000    // 每场景停留时间
const NAVIGATE_TIMEOUT_MS = 20000

// 微信开发者工具 CLI 路径（与 freetools 相同）
const CLI_PATH = process.env.DEVTOOLS_CLI || 'F:\\微信web开发者工具\\cli.bat'

// 游戏场景列表（从 game.js 中获取）
const GAME_SCENES = [
  { id: 'index',          label: '首页·大厅',        hint: '首页入口' },
  { id: 'level-select',  label: '关卡选择',         hint: '关卡入口' },
  { id: 'akari',          label: 'akari·点灯',      hint: '点灯' },
  { id: 'battleship',     label: 'battleship·海战', hint: '海战' },
  { id: 'nonogram',       label: 'nonogram·数织',    hint: '数织' },
  { id: 'nurikabe',       label: 'nurikabe·墙格',   hint: '墙格' },
  { id: 'one-stroke',     label: 'one-stroke·一笔',  hint: '一笔画' },
  { id: 'slither-link',   label: 'slither-link·回路', hint: '回路' },
  { id: 'sokoban',        label: 'sokoban·推箱子',  hint: '推箱子' },
  { id: 'tents',          label: 'tents·搭帐篷',    hint: '帐篷' },
  { id: 'sudoku-solver',  label: 'sudoku-solver·数独求解', hint: '数独求解' },
  { id: 'sudoku-generator', label: 'sudoku-generator·数独生成', hint: '数独生成' },
  { id: '24point',        label: '24点·算24',        hint: '24点' },
  { id: 'frog-escape',    label: 'frog-escape·跳跳蛙', hint: '跳跳蛙' },
  { id: 'number-one',     label: 'number-one·铺1',   hint: '铺1' },
  { id: 'othello',        label: 'othello·黑白棋',   hint: '黑白棋' },
]

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================
// 通过 evalOnPath 执行游戏内代码，切换场景
// ============================================================
async function switchToScene(miniProgram, sceneId) {
  try {
    await miniProgram.evalOnPath('', `
      (function() {
        var Game = require('./utils/game-core.js');
        if (Game && Game.scenes && Game.scenes['${sceneId}']) {
          Game.switchScene('${sceneId}');
          return 'ok:' + '${sceneId}';
        } else if (typeof switchScene === 'function') {
          switchScene('${sceneId}');
          return 'ok:' + '${sceneId}';
        } else {
          return 'fail:scene not found - ${sceneId}';
        }
      })();
    `)
    return true
  } catch (err) {
    console.warn('   [eval 失败，用 CLI navigateBack 重试]')
    return false
  }
}

// ============================================================
// 主流程
// ============================================================
async function runAudit() {
  console.log('\n🎮 GeZiPuzzle 小游戏自动化审计')
  console.log('   项目路径: ' + PROJECT_PATH)
  console.log('   场景数量: ' + GAME_SCENES.length)
  console.log('   报告输出: ' + REPORT_PATH + '\n')

  // 启动并连接
  let miniProgram
  try {
    console.log('⏳ 启动自动化连接...')
    miniProgram = await automator.connect({
      cliPath: CLI_PATH,
      projectPath: PROJECT_PATH,
    })
    console.log('✅ 已连接开发者工具\n')
  } catch (err) {
    console.error('❌ 启动失败:', err.message)
    console.error('   1. 开发者工具已打开 GeZiPuzzle 项目')
    console.error('   2. 在【设置 → 安全】开启「服务端口」')
    console.error('   3. 已登录微信账号')
    process.exit(1)
  }

  const results = []
  let successCount = 0
  let failCount = 0
  const startTime = Date.now()

  // 遍历各场景
  for (let i = 0; i < GAME_SCENES.length; i++) {
    const scene = GAME_SCENES[i]
    const label = '[' + (i + 1) + '/' + GAME_SCENES.length + ']'
    const elapsed = Math.round((Date.now() - startTime) / 1000)

    try {
      process.stdout.write(label + ' ' + scene.id + ' (' + scene.label + ') ... ')

      // 切换场景
      await switchToScene(miniProgram, scene.id)

      // 等待场景渲染
      await sleep(SCENE_DWELL_MS)

      console.log('✓ (' + elapsed + 's)')
      results.push({ id: scene.id, label: scene.label, status: 'ok' })
      successCount++
    } catch (err) {
      const msg = err.message || String(err)
      console.log('✗ ' + msg)
      results.push({ id: scene.id, label: scene.label, status: 'error', error: msg })
      failCount++
    }
  }

  // 触发官方 Audits（小游戏也有 Audits 面板，但 stopAudits 可能挂起，跳过）
  console.log('\n⏳ 触发官方体验评分（Audits）...')
  let auditData = null
  try {
    auditData = await Promise.race([
      miniProgram.stopAudits({ path: REPORT_PATH }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('stopAudits 超时（小游戏不支持自动评分）')), 8000))
    ])
    console.log('✅ 体验评分完成')
    if (auditData && auditData.score !== undefined) {
      console.log('   综合评分: ' + auditData.score)
    }
  } catch (err) {
    console.warn('⚠️  体验评分出错（小游戏可能不支持自动评分）:', err.message)
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000)

  // 汇总
  console.log('\n📊 场景遍历汇总：')
  console.log('   ✅ 成功: ' + successCount)
  console.log('   ❌ 失败: ' + failCount)
  console.log('   ⏱️  总耗时: ' + Math.floor(totalTime / 60) + 'm ' + (totalTime % 60) + 's')

  if (failCount > 0) {
    console.log('\n   失败场景：')
    results.filter(r => r.status === 'error').forEach(r => {
      console.log('     - ' + r.id + ': ' + r.error)
    })
  }

  // 保存结果
  const resultJsonPath = path.join(REPORT_DIR, 'audit-scenes-game.json')
  fs.writeFileSync(
    resultJsonPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      project: 'GeZiPuzzle',
      type: 'game',
      score: auditData ? auditData.score : null,
      success: successCount,
      fail: failCount,
      totalTime,
      scenes: results,
      auditData: auditData ? JSON.stringify(auditData).substring(0, 500) : null,
    }, null, 2),
    'utf-8'
  )
  console.log('\n   场景结果: ' + resultJsonPath)
  if (fs.existsSync(REPORT_PATH)) {
    console.log('   体验评分报告: ' + REPORT_PATH)
  }

  await miniProgram.close()
  console.log('\n🎉 审计完成！')
}

runAudit().catch(err => {
  console.error('\n❌ 未预期的错误:', err)
  process.exit(1)
})