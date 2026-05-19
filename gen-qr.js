/**
 * freetools 调试二维码生成脚本
 *
 * 调用微信开发者工具 CLI 生成当前代码的预览二维码，
 * 输出为 PNG 图片并保存到 test-reports/qr_preview --clean.png。
 *
 * 用法：
 *   node test-reports/gen-qr.js
 *
 * 前置条件：
 *   1. 微信开发者工具已安装并配置好 CLI（cli.bat）
 *   2. 已登录微信开发者工具账号
 */

const path = require('path')
const fs = require('fs')
const { execSync, spawn } = require('child_process')

// ============================================================
// 配置
// ============================================================
const PROJECT_PATH = path.resolve('F:/SelfJob/Puzzle/SolvePuzzle')
const CLI_PATH = process.env.DEVTOOLS_CLI || 'F:\\微信web开发者工具\\cli.bat'
const QR_OUTPUT_PATH = path.resolve(__dirname, 'qr_preview.png')

// ============================================================
// Windows spawn patch（Node.js >= 18 on Windows 必需）
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

// ============================================================
// 运行 CLI preview 命令
// ============================================================
function runPreview() {
  const args = [
    'preview',
    '--project', PROJECT_PATH,
    '--qr-format', 'image',
    '--qr-output', QR_OUTPUT_PATH,
  ]

  console.log('🔧 调用微信开发者工具 CLI 生成预览二维码...')
  console.log('   项目路径: ' + PROJECT_PATH)
  console.log('   输出文件: ' + QR_OUTPUT_PATH + '\n')

  // 使用 execSync 简化处理，检查返回码
  try {
    // 强制使用 UTF-8 输出编码
    const result = execSync(`"${CLI_PATH}" ${args.join(' ')}`, {
      encoding: 'utf-8',
      windowsHide: true,
      timeout: 300 * 1000,
    })
    console.log(result)
    return true
  } catch (err) {
    // Windows PowerShell 的 NativeCommandError 通常不影响实际功能
    // 只要文件生成了就 OK
    if (err.status === 1) {
      // status=1 可能是 PowerShell 编码警告，实际命令成功
      console.log('[警告] CLI 退出码 1，可能是编码警告（可忽略）')
      if (err.stdout) console.log(err.stdout)
      return true
    }
    console.error('❌ CLI 执行失败:', err.message)
    if (err.stdout) console.error('stdout:', err.stdout)
    if (err.stderr) console.error('stderr:', err.stderr)
    return false
  }
}

// ============================================================
// 主流程
// ============================================================
function main() {
  console.log('\n🔲 freetools 调试二维码生成')
  console.log('='.repeat(40) + '\n')

  const startTime = Date.now()

  // 1. 检查 CLI 是否存在
  if (!fs.existsSync(CLI_PATH)) {
    console.error('❌ CLI 不存在: ' + CLI_PATH)
    console.error('   请设置环境变量 DEVTOOLS_CLI 或确认开发者工具路径')
    process.exit(1)
  }

  // 2. 检查项目路径（小游戏用 game.json，小程序用 app.json）
  const appJsonPath = path.join(PROJECT_PATH, 'app.json')
  const gameJsonPath = path.join(PROJECT_PATH, 'game.json')
  if (!fs.existsSync(appJsonPath) && !fs.existsSync(gameJsonPath)) {
    console.error('❌ app.json 和 game.json 均不存在')
    console.error('   请确认项目路径正确')
    process.exit(1)
  }
  const isGame = fs.existsSync(gameJsonPath)
  console.log('📦 项目类型: ' + (isGame ? '小游戏' : '小程序') + '\n')

  // 3. 清理旧二维码
  if (fs.existsSync(QR_OUTPUT_PATH)) {
    fs.unlinkSync(QR_OUTPUT_PATH)
    console.log('🗑️  已清理旧二维码\n')
  }

  // 4. 生成二维码
  const ok = runPreview()
  if (!ok) {
    process.exit(1)
  }

  // 5. 验证输出
  if (!fs.existsSync(QR_OUTPUT_PATH)) {
    console.error('\n❌ 二维码生成失败，输出文件不存在')
    process.exit(1)
  }

  const stats = fs.statSync(QR_OUTPUT_PATH)
  const elapsed = Math.round((Date.now() - startTime) / 1000)

  console.log('\n✅ 调试二维码生成成功！')
  console.log('   文件: ' + QR_OUTPUT_PATH)
  console.log('   大小: ' + (stats.size / 1024).toFixed(1) + ' KB')
  console.log('   耗时: ' + elapsed + 's')
  console.log('\n   扫描此二维码可在微信中预览当前代码')
}

main()
