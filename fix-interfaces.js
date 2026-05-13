// 为所有 Game 和 Cell 类补全缺失的接口实现
const fs = require('fs');
const path = require('path');

const root = 'F:/SelfJob/GameCenter';

// ============ Cell 模板 ============
const cellTemplate = `public class Cell : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "cell";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int rows, int cols) => true;
    public void MoveTo(int row, int col) { Row = row; Col = col; }
}`;

// ============ 各游戏的 stub 实现 ============
const stubMethods = {
  'SokobanGame.cs': `    public override Piece? GetPiece(int row, int col) => _boxes.FirstOrDefault(b => b.Row == row && b.Col == col);
    public override bool TryPlacePiece(Piece piece, int row, int col) => false;
    public override bool TryMovePiece(Piece piece, Core.Direction dir) => false;`,
  'SudokuGame.cs': `    public override Cell? GetPiece(int row, int col) => new Cell { Row = row, Col = col };
    public override bool TryPlacePiece(Cell piece, int row, int col) => false;
    public override bool TryMovePiece(Cell piece, Core.Direction dir) => false;`,
  'AkariGame.cs': `    public override Light? GetPiece(int row, int col) => _placedLights.FirstOrDefault(l => l.Row == row && l.Col == col);
    public override bool TryPlacePiece(Light piece, int row, int col) => false;
    public override bool TryMovePiece(Light piece, Core.Direction dir) => false;`,
  'TentsGame.cs': `    public override Tent? GetPiece(int row, int col) => _tents.FirstOrDefault(t => t.Row == row && t.Col == col);
    public override bool TryPlacePiece(Tent piece, int row, int col) => false;
    public override bool TryMovePiece(Tent piece, Core.Direction dir) => false;`,
  'NonogramGame.cs': `    public override Cell? GetPiece(int row, int col) => new Cell { Row = row, Col = col };
    public override bool TryPlacePiece(Cell piece, int row, int col) => false;
    public override bool TryMovePiece(Cell piece, Core.Direction dir) => false;`,
  'SlitherLinkGame.cs': `    public override Edge? GetPiece(int row, int col) => null;
    public override bool TryPlacePiece(Edge piece, int row, int col) => false;
    public override bool TryMovePiece(Edge piece, Core.Direction dir) => false;`,
  'NurikabeGame.cs': `    public override Cell? GetPiece(int row, int col) => new Cell { Row = row, Col = col };
    public override bool TryPlacePiece(Cell piece, int row, int col) => false;
    public override bool TryMovePiece(Cell piece, Core.Direction dir) => false;`,
  'BattleshipGame.cs': `    public override Ship? GetPiece(int row, int col) => _myShips.FirstOrDefault(s => s.Row == row && s.Col == col);
    public override bool TryPlacePiece(Ship piece, int row, int col) => false;
    public override bool TryMovePiece(Ship piece, Core.Direction dir) => false;`,
  'OneStrokeSolverGame.cs': `    public override Node? GetPiece(int row, int col) => null;
    public override bool TryPlacePiece(Node piece, int row, int col) => false;
    public override bool TryMovePiece(Node piece, Core.Direction dir) => false;`,
  'OthelloGame.cs': `    public override Disc? GetPiece(int row, int col) => null;
    public override bool TryPlacePiece(Disc piece, int row, int col) => false;
    public override bool TryMovePiece(Disc piece, Core.Direction dir) => false;`,
  'TwentyFourGame.cs': `    public override Card? GetPiece(int row, int col) => null;
    public override bool TryPlacePiece(Card piece, int row, int col) => false;
    public override bool TryMovePiece(Card piece, Core.Direction dir) => false;`,
  'FrogEscapeGame.cs': `    public override Frog? GetPiece(int row, int col) => null;
    public override bool TryPlacePiece(Frog piece, int row, int col) => false;
    public override bool TryMovePiece(Frog piece, Core.Direction dir) => false;`,
};

// Cell 类也需要实现 IPiece 接口的所有方法
const cellImplementations = {
  'AkariGame.cs': `public class Light : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "light";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int rows, int cols) => false;
    public void MoveTo(int row, int col) { Row = row; Col = col; }
}`,
  'TentsGame.cs': `public class Tent : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "tent";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int rows, int cols) => false;
    public void MoveTo(int row, int col) { Row = row; Col = col; }
}`,
};

// Math 工具类的 Cell 简化实现
const mathCellImpl = `public class Cell : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "cell";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int rows, int cols) => true;
    public void MoveTo(int row, int col) { Row = row; Col = col; }
}`;

// Math game stubs need: GetPiece, TryPlacePiece, TryMovePiece
const mathStubs = {
  'NumberOneGame.cs': `    public override Cell? GetPiece(int row, int col) => new Cell { Row = row, Col = col };
    public override bool TryPlacePiece(Cell piece, int row, int col) => false;
    public override bool TryMovePiece(Cell piece, Core.Direction dir) => false;`,
  'OddEvenGame.cs': `    public override Cell? GetPiece(int row, int col) => new Cell { Row = row, Col = col };
    public override bool TryPlacePiece(Cell piece, int row, int col) => false;
    public override bool TryMovePiece(Cell piece, Core.Direction dir) => false;`,
  'PrimeCheckerGame.cs': `    public override Cell? GetPiece(int row, int col) => new Cell { Row = row, Col = col };
    public override bool TryPlacePiece(Cell piece, int row, int col) => false;
    public override bool TryMovePiece(Cell piece, Core.Direction dir) => false;`,
  'DivisorFinderGame.cs': `    public override Cell? GetPiece(int row, int col) => new Cell { Row = row, Col = col };
    public override bool TryPlacePiece(Cell piece, int row, int col) => false;
    public override bool TryMovePiece(Cell piece, Core.Direction dir) => false;`,
  'GcdLcmGame.cs': `    public override Cell? GetPiece(int row, int col) => new Cell { Row = row, Col = col };
    public override bool TryPlacePiece(Cell piece, int row, int col) => false;
    public override bool TryMovePiece(Cell piece, Core.Direction dir) => false;`,
  'RandomSelectorGame.cs': `    public override Cell? GetPiece(int row, int col) => new Cell { Row = row, Col = col };
    public override bool TryPlacePiece(Cell piece, int row, int col) => false;
    public override bool TryMovePiece(Cell piece, Core.Direction dir) => false;`,
  'PermutationCombinationGame.cs': `    public override Cell? GetPiece(int row, int col) => new Cell { Row = row, Col = col };
    public override bool TryPlacePiece(Cell piece, int row, int col) => false;
    public override bool TryMovePiece(Cell piece, Core.Direction dir) => false;`,
};

// ============ 处理 Puzzle 游戏 ============
const projects = [
  { proj: 'MiniGames.Puzzle.Akari', file: 'AkariGame.cs', stubs: stubMethods['AkariGame.cs'], cell: cellImplementations['AkariGame.cs'] },
  { proj: 'MiniGames.Puzzle.Tents', file: 'TentsGame.cs', stubs: stubMethods['TentsGame.cs'], cell: cellImplementations['TentsGame.cs'] },
  { proj: 'MiniGames.Puzzle.Nurikabe', file: 'NurikabeGame.cs', stubs: stubMethods['NurikabeGame.cs'] },
  { proj: 'MiniGames.Puzzle.Battleship', file: 'BattleshipGame.cs', stubs: stubMethods['BattleshipGame.cs'] },
  { proj: 'MiniGames.Puzzle.OneStrokeSolver', file: 'OneStrokeSolverGame.cs', stubs: stubMethods['OneStrokeSolverGame.cs'] },
  { proj: 'MiniGames.Puzzle.Othello', file: 'OthelloGame.cs', stubs: stubMethods['OthelloGame.cs'] },
  { proj: 'MiniGames.Puzzle.24point', file: 'TwentyFourGame.cs', stubs: stubMethods['TwentyFourGame.cs'] },
  { proj: 'MiniGames.Puzzle.FrogEscape', file: 'FrogEscapeGame.cs', stubs: stubMethods['FrogEscapeGame.cs'] },
];

for (const p of projects) {
  const gameFile = `${root}/${p.proj}/${p.file}`;
  if (!fs.existsSync(gameFile)) { console.log('MISSING: ' + gameFile); continue; }
  let content = fs.readFileSync(gameFile, 'utf8');
  
  // 如果有自定义 cell 类，替换默认的
  if (p.cell && !content.includes('GetOccupiedCells')) {
    // 找 class 声明后的第一个 {
    content = content.replace(/public class \w+ : Core\.IPiece \{[^}]+\}/, p.cell);
  }
  
  // 追加 stub 方法（在 BuildBoard 后加）
  if (content.includes('public override int[,] BuildBoard()') && !content.includes('GetPiece(int row')) {
    content = content.replace(
      /(public override int\[\,?\] BuildBoard\(\) \{[\s\S]*?\})/,
      '$1\n\n' + p.stubs
    );
  }
  
  fs.writeFileSync(gameFile, content, 'utf8');
  console.log('Updated: ' + gameFile);
}

// ============ 处理 Math 工具 ============
for (const [file, stubs] of Object.entries(mathStubs)) {
  const proj = Object.keys(mathStubs).find(k => k === file)?.replace('Game.cs', '');
  // 找对应的项目
  const gameDirs = ['NumberOne', 'OddEven', 'PrimeChecker', 'DivisorFinder', 'GcdLcm', 'RandomSelector', 'PermutationCombination'];
  for (const dir of gameDirs) {
    if (file.includes(dir)) {
      const gameFile = `${root}/MiniGames.Math.${dir}/${dir}Game.cs`;
      if (!fs.existsSync(gameFile)) { console.log('MISSING: ' + gameFile); continue; }
      let content = fs.readFileSync(gameFile, 'utf8');
      
      // 替换 Cell 类
      if (!content.includes('GetOccupiedCells')) {
        content = content.replace(/public class Cell : Core\.IPiece \{[^}]+\}/, mathCellImpl);
      }
      
      // 追加 stub 方法
      if (content.includes('public override int[,] BuildBoard()') && !content.includes('GetPiece(int row')) {
        content = content.replace(
          /(public override int\[\,?\] BuildBoard\(\) \{[\s\S]*?\})/,
          '$1\n\n' + stubs
        );
      }
      
      fs.writeFileSync(gameFile, content, 'utf8');
      console.log('Updated: ' + gameFile);
      break;
    }
  }
}

console.log('Done!');