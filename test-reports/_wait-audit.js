/**
 * 等待审计完成轮询脚本（被 run-audit-game.js 调用）
 * 小游戏场景下只做简单等待，不依赖页面访问结果
 */
async function waitAudit(miniProgram, timeoutMs) {
  const interval = 2000
  let waited = 0
  while (waited < timeoutMs) {
    await new Promise(r => setTimeout(r, interval))
    waited += interval
  }
  return {}
}

module.exports = { waitAudit }