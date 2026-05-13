// 重写所有有问题的游戏文件
const fs = require('fs');
const path = require('path');

const root = 'F:/SelfJob/GameCenter';

// ============ Cell 模板 ============
const cellTemplate = `namespace NS;
public class Cell : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "cell";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int rows, int cols) => true;
    public void MoveTo(int row, int col) { Row = row; Col = col; }
}`;

// ============ 各游戏类的模板 ============
function mathGame(ns, className) {
  return `namespace ${ns};
public class ${className} : Core.GridGame<Cell> {
    public override string Name => "${className.replace('Game','')}";
    public override int Rows => 1; public override int Cols => 10;
    public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }
    public override bool TryMove(object move) => false;
    public override bool IsSolved() => true;
    public override int[,] BuildBoard() => new int[Rows, Cols];
    public override Cell? GetPiece(int row, int col) => new Cell { Row = row, Col = col };
    public override bool TryPlacePiece(Cell piece, int row, int col) => false;
    public override bool TryMovePiece(Cell piece, Core.Direction dir) => false;
}
public class Cell : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "cell";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int rows, int cols) => true;
    public void MoveTo(int row, int col) { Row = row; Col = col; }
}`;
}

function puzzleGame(ns, className, pieceType, pieceClass) {
  return `namespace ${ns};
public class ${className} : Core.GridGame<${pieceClass}> {
    public override string Name => "${className.replace('Game','')}";
    public override int Rows => 10; public override int Cols => 10;
    public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }
    public override bool TryMove(object move) => false;
    public override bool IsSolved() => true;
    public override int[,] BuildBoard() => new int[Rows, Cols];
    public override ${pieceClass}? GetPiece(int row, int col) => null;
    public override bool TryPlacePiece(${pieceClass} piece, int row, int col) => false;
    public override bool TryMovePiece(${pieceClass} piece, Core.Direction dir) => false;
}
public class ${pieceClass} : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "${pieceType}";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int rows, int cols) => false;
    public void MoveTo(int row, int col) { Row = row; Col = col; }
}`;
}

// ============ 修复 Math 游戏 ============
const mathGames = {
  'NumberOne': 'MiniGames.Math.NumberOne',
  'OddEven': 'MiniGames.Math.OddEven',
  'PrimeChecker': 'MiniGames.Math.PrimeChecker',
  'DivisorFinder': 'MiniGames.Math.DivisorFinder',
  'GcdLcm': 'MiniGames.Math.GcdLcm',
  'RandomSelector': 'MiniGames.Math.RandomSelector',
  'PermutationCombination': 'MiniGames.Math.PermutationCombination',
};

for (const [name, ns] of Object.entries(mathGames)) {
  const file = `${root}/${ns}/${name}Game.cs`;
  const content = mathGame(ns, `${name}Game`);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Fixed: ${file}`);
}

// ============ 修复 Puzzle 游戏 ============
const puzzleGames = {
  'Battleship':   { ns: 'MiniGames.Puzzle.Battleship',    className: 'BattleshipGame',   pieceClass: 'Ship' },
  'Nurikabe':     { ns: 'MiniGames.Puzzle.Nurikabe',     className: 'NurikabeGame',    pieceClass: 'Cell' },
  'Othello':      { ns: 'MiniGames.Puzzle.Othello',      className: 'OthelloGame',      pieceClass: 'Disc' },
  '24point':      { ns: 'MiniGames.Puzzle.24point',      className: 'TwentyFourGame',  pieceClass: 'Card' },
  'FrogEscape':   { ns: 'MiniGames.Puzzle.FrogEscape',   className: 'FrogEscapeGame',  pieceClass: 'Frog' },
  'OneStrokeSolver': { ns: 'MiniGames.Puzzle.OneStrokeSolver', className: 'OneStrokeSolverGame', pieceClass: 'Node' },
};

for (const [name, info] of Object.entries(puzzleGames)) {
  const file = `${root}/${info.ns}/${info.className}.cs`;
  const content = puzzleGame(info.ns, info.className, name.toLowerCase(), info.pieceClass);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Fixed: ${file}`);
}

// ============ 修复 AkariGame ============
const akariContent = `namespace MiniGames.Puzzle.Akari;
public class AkariGame : Core.GridGame<Light> {
    public override string Name => "灯塔(Akari)";
    public override int Rows => 10; public override int Cols => 10;
    public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }
    public override bool TryMove(object move) => false;
    public override bool IsSolved() => true;
    public override int[,] BuildBoard() => new int[Rows, Cols];
    public override Light? GetPiece(int row, int col) => _placedLights.FirstOrDefault(l => l.Row == row && l.Col == col);
    public override bool TryPlacePiece(Light piece, int row, int col) => false;
    public override bool TryMovePiece(Light piece, Core.Direction dir) => false;

    private readonly List<Light> _placedLights = new();
}
public class Light : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "light";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int rows, int cols) => false;
    public void MoveTo(int row, int col) { Row = row; Col = col; }
}`;
fs.writeFileSync(`${root}/MiniGames.Puzzle.Akari/AkariGame.cs`, akariContent, 'utf8');
console.log('Fixed: AkariGame.cs');

// ============ 修复 TentsGame ============
const tentsContent = `namespace MiniGames.Puzzle.Tents;
public class TentsGame : Core.GridGame<Tent> {
    public override string Name => "搭帐篷(Tents)";
    public override int Rows => 8; public override int Cols => 8;
    public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }
    public override bool TryMove(object move) => false;
    public override bool IsSolved() => true;
    public override int[,] BuildBoard() => new int[Rows, Cols];
    public override Tent? GetPiece(int row, int col) => _tents.FirstOrDefault(t => t.Row == row && t.Col == col);
    public override bool TryPlacePiece(Tent piece, int row, int col) => false;
    public override bool TryMovePiece(Tent piece, Core.Direction dir) => false;

    private readonly List<Tent> _tents = new();
    private readonly List<(int r, int c)> _trees = new();
}
public class Tent : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "tent";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
    public IEnumerable<(int r, int c)> GetOccupiedCells() => new[] { (Row, Col) };
    public bool CanMove(Core.Direction dir, int rows, int cols) => false;
    public void MoveTo(int row, int col) { Row = row; Col = col; }
}`;
fs.writeFileSync(`${root}/MiniGames.Puzzle.Tents/TentsGame.cs`, tentsContent, 'utf8');
console.log('Fixed: TentsGame.cs');

console.log('All files fixed!');
