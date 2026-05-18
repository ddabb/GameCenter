/**
 * undo-manager.js — 通用撤销管理器
 * 
 * 用法：
 *   构造函数：this.undoMgr = new UndoManager()
 *   操作前保存：this.undoMgr.save(this.getGameState())
 *   撤销：let state = this.undoMgr.undo()
 *   能否撤销：this.undoMgr.canUndo()
 * 
 * 状态对象由各游戏自行定义（如 grid 数组、选中状态等）
 * 最大保存20步，防止内存过大
 */
class UndoManager {
  constructor(maxSteps = 20) {
    this.history = [];
    this.maxSteps = maxSteps;
  }

  save(state) {
    // 深拷贝状态
    const snapshot = JSON.parse(JSON.stringify(state));
    this.history.push(snapshot);
    if (this.history.length > this.maxSteps) {
      this.history.shift();
    }
  }

  undo() {
    if (this.history.length === 0) return null;
    return this.history.pop();
  }

  canUndo() {
    return this.history.length > 0;
  }

  clear() {
    this.history = [];
  }
}

module.exports = UndoManager;
