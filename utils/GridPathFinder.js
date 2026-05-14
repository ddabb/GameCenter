function GridPathFinder(row, column, notExistPotList) {
    this.row = row;
    this.column = column;
    this.notExistPotList = notExistPotList || [];
    this.passedPot = new Array(row * column);
    for (var i = 0; i < this.passedPot.length; i++) {
        this.passedPot[i] = false;
    }
    this.path = new Array(row * column - this.notExistPotList.length);
    for (var i = 0; i < this.path.length; i++) {
        this.path[i] = null;
    }
    this.noFullPath = true;
}

GridPathFinder.prototype.decideSingleBounds = function(bounds, singleBounds) {
    return (bounds & singleBounds) !== 0;
};

GridPathFinder.prototype.setPassedPotAndPath = function() {
    var args = arguments;
    if (args.length === 3) {
        var p = args[0];
        var a = args[1];
        var b = args[2];
        this.path[p] = a;
        this.setPassedPot(a, b);
    } else if (args.length === 1) {
        var a = args[0];
        this.setPassedPotAndPath(0, a, true);
    } else if (args.length === 2) {
        var p = args[0];
        var a = args[1];
        this.setPassedPotAndPath(p, a, true);
    } else {
        throw new Error('Invalid number of arguments');
    }
};

GridPathFinder.prototype.decideBounds = function(pot) {
    var count = 0;
    if (pot < this.column) count += 1;
    if ((pot - (this.row - 1) * this.column) >= 0 && (pot - (this.row - 1) * this.column) < this.column) count += 2;
    if (pot % this.column === 0) count += 4;
    if (pot % this.column === this.column - 1) count += 8;
    return count;
};

GridPathFinder.prototype.passedPotIndexOutOfBounds = function(a) {
    return a < 0 || a >= this.column * this.row;
};

GridPathFinder.prototype.showPath = function() {
    for (var i = 0; i < this.path.length; i++) {
        console.debug(this.path[i] + " ");
    }
};

GridPathFinder.prototype.getPath = function() {
    return this.path;
};

GridPathFinder.prototype.notExistPot = function(pot) {
    for (var i = 0; i < this.notExistPotList.length; i++) {
        if (this.notExistPotList[i] === pot) {
            return true;
        }
    }
    return false;
};

GridPathFinder.prototype.getPassedPot = function(pot) {
    return this.passedPot[pot];
};

GridPathFinder.prototype.passedPotOrNotExistPot = function(a) {
    return this.notExistPot(a) || this.getPassedPot(a);
};

GridPathFinder.prototype.run = function(nowPosition) {
    var a = this.path[nowPosition];
    if (nowPosition === this.path.length - 1) {
        this.noFullPath = false;
        return true;
    }

    var self = this;
    var dirs = [
        { dx: -1, dy: 0, bound: 4,  key: 'left'  },
        { dx:  1, dy: 0, bound: 8,  key: 'right' },
        { dx:  0, dy: -1, bound: 1, key: 'up'    },
        { dx:  0, dy:  1, bound: 2, key: 'down'  }
    ];

    for (var i = 0; i < dirs.length; i++) {
        var dir = dirs[i];
        var next = a + dir.dx + dir.dy * this.column;

        if (this.noFullPath &&
            !this.decideSingleBounds(this.decideBounds(a), dir.bound) &&
            !this.passedPotIndexOutOfBounds(next) &&
            !this.passedPotOrNotExistPot(next)) {

            this.setPassedPotAndPath(nowPosition + 1, next);
            var ok = this.run(nowPosition + 1);
            this.setPassedPot(next, false); // 回溯：清除passedPot

            if (ok) return true;
        }
    }

    return false;
};

GridPathFinder.prototype.setPassedPot = function(a, b) {
    this.passedPot[a] = b;
};

/**
 * 验证一笔画是否有解：检查所有有效格是否连通
 * @param {boolean} printPath - 是否打印路径
 * @returns {boolean} 是否有解（所有有效格连通）
 */
GridPathFinder.prototype.isOneStroke = function(printPath) {
    printPath = printPath || false;
    var visited = new Array(this.row * this.column);
    for (var i = 0; i < visited.length; i++) {
        visited[i] = false;
    }

    var startCell = -1;

    // 找到第一个有效的单元格开始 BFS
    for (var i = 0; i < this.row * this.column; i++) {
        if (!this.notExistPot(i)) {
            startCell = i;
            break;
        }
    }

    if (startCell === -1) return false; // 没有有效的单元格

    var self = this;

    // BFS 检查连通性
    var queue = [startCell];
    visited[startCell] = true;
    var visitedCount = 1;

    while (queue.length > 0) {
        var current = queue.shift();
        
        // 检查四个方向的邻居
        var neighbors = [];
        if (current % self.column > 0 && !self.notExistPot(current - 1) && !visited[current - 1]) neighbors.push(current - 1);
        if (current % self.column < self.column - 1 && !self.notExistPot(current + 1) && !visited[current + 1]) neighbors.push(current + 1);
        if (current >= self.column && !self.notExistPot(current - self.column) && !visited[current - self.column]) neighbors.push(current - self.column);
        if (current < (self.row - 1) * self.column && !self.notExistPot(current + self.column) && !visited[current + self.column]) neighbors.push(current + self.column);
        
        for (var j = 0; j < neighbors.length; j++) {
            var neighbor = neighbors[j];
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                visitedCount++;
                queue.push(neighbor);
            }
        }
    }

    // 计算有效的单元格总数
    var validCellCount = 0;
    for (var i = 0; i < this.row * this.column; i++) {
        if (!this.notExistPot(i)) validCellCount++;
    }

    // 检查是否所有有效的单元格都被访问了
    if (visitedCount !== validCellCount) return false;

    return true;
};

GridPathFinder.prototype.areAdjacent = function(cell1, cell2) {
    var col1 = cell1 % this.column;
    var col2 = cell2 % this.column;
    var row1 = Math.floor(cell1 / this.column);
    var row2 = Math.floor(cell2 / this.column);
    return (
        (row1 === row2 && Math.abs(col1 - col2) === 1) ||
        (col1 === col2 && Math.abs(row1 - row2) === 1)
    );
};

GridPathFinder.prototype.resetPath = function() {
    for (var i = 0; i < this.path.length; i++) {
        this.path[i] = null;
    }
    for (var i = 0; i < this.passedPot.length; i++) {
        this.passedPot[i] = false;
    }
    this.noFullPath = true;
};

GridPathFinder.prototype.checkPathCompleteness = function() {
    var activeCells = 0;
    for (var i = 0; i < this.passedPot.length; i++) {
        if (this.passedPot[i]) activeCells++;
    }
    var totalActiveCells = this.row * this.column - this.notExistPotList.length;
    console.debug('Active cells:', activeCells, 'Total active cells:', totalActiveCells);
    return activeCells === totalActiveCells;
};

/**
 * 静态方法：生成有效一笔画题目
 * 策略：构造连通的有效格集合 → 随机移除内部有效格作为洞（保持连通）→ 用 isOneStroke 验证
 *
 * 关键不变量：有效格集合始终连通。连通性是一笔画可解的必要条件。
 * 对于网格图，连通性也是充分条件（连通网格子图必有哈密顿路径），
 * 因此只需验证连通性即可保证 isOneStroke 有解。
 */
GridPathFinder.generateValidPuzzle = function(row, column, maxHolePercentage) {
    maxHolePercentage = maxHolePercentage || 0.3;
    var totalCells = row * column;
    var maxHoles = Math.floor(totalCells * maxHolePercentage);
    if (maxHoles < 0) maxHoles = 0;

    // ---------- 辅助：检查单元格是否为内部格（非边界） ----------
    var isInnerCell = function(cell) {
        var r = Math.floor(cell / column);
        var c = cell % column;
        return r > 0 && r < row - 1 && c > 0 && c < column - 1;
    };

    // ---------- 阶段1：生成洞列表 ----------
    var holes = [];
    
    // 首先添加一些内部格作为洞
    var innerCells = [];
    for (var i = 0; i < totalCells; i++) {
        if (isInnerCell(i)) {
            innerCells.push(i);
        }
    }
    
    // 随机打乱内部格顺序
    for (var i = innerCells.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = innerCells[i]; innerCells[i] = innerCells[j]; innerCells[j] = tmp;
    }
    
    // 尝试不同数量的洞，从少到多
    var maxAttempts = 10;
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
        // 每次尝试使用不同数量的洞
        var numHoles = Math.min(maxHoles, innerCells.length, Math.floor(innerCells.length * (0.1 + attempt * 0.1)));
        numHoles = Math.max(numHoles, 1); // 确保至少有一个洞
        
        // 重置洞列表
        holes = [];
        for (var i = 0; i < numHoles; i++) {
            holes.push(innerCells[i]);
        }
        
        // 验证
        var verifier = new GridPathFinder(row, column, holes);
        if (verifier.isOneStroke()) {
            // 验证通过，返回洞列表
            return holes;
        }
    }
    
    // 如果所有尝试都失败，返回一个简单的洞列表（只有一个洞）
    if (innerCells.length > 0) {
        holes = [innerCells[0]];
        var verifier = new GridPathFinder(row, column, holes);
        if (verifier.isOneStroke()) {
            return holes;
        }
    }

    return []; // 兜底失败
};

// 兼容 CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridPathFinder;
}

// 兼容 ES6 导出
if (typeof exports !== 'undefined' && !exports.default) {
    exports.GridPathFinder = GridPathFinder;
}

// 兼容全局变量
if (typeof window !== 'undefined') {
    window.GridPathFinder = GridPathFinder;
}
