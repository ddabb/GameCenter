// 创建 GameCenter 所有游戏项目的 csproj 和 .cs 文件
const fs = require('fs');
const path = require('path');

const root = 'F:/SelfJob/GameCenter';

function mkDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
}

// ============ csproj 模板 ============
function csproj(name, file) {
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <RootNamespace>MiniGames</Namespace>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="..\\MiniGames.Core\\MiniGames.Core.csproj" />
  </ItemGroup>
</Project>`;
}

// ============ 13个 Puzzle 游戏 ============
const puzzles = [
  {
    name: 'Sokoban',
    displayName: '推箱子',
    ns: 'MiniGames.Puzzle.Sokoban',
    desc: '将箱子推到目标位置',
    row: 10, col: 10,
    file: 'SokobanGame.cs'
  },
  {
    name: 'Sudoku',
    displayName: '数独',
    ns: 'MiniGames.Puzzle.Sudoku',
    desc: '经典数独益智游戏',
    row: 9, col: 9,
    file: 'SudokuGame.cs'
  },
  {
    name: 'Nonogram',
    displayName: '填字画',
    ns: 'MiniGames.Puzzle.Nonogram',
    desc: '根据提示填格子的益智游戏',
    row: 10, col: 10,
    file: 'NonogramGame.cs'
  },
  {
    name: 'SlitherLink',
    displayName: '数回',
    ns: 'MiniGames.Puzzle.SlitherLink',
    desc: '在格子间画闭合回路',
    row: 8, col: 8,
    file: 'SlitherLinkGame.cs'
  },
  {
    name: 'Akari',
    displayName: '灯塔',
    ns: 'MiniGames.Puzzle.Akari',
    desc: '照亮所有白格，不能互相照亮',
    row: 12, col: 12,
    file: 'AkariGame.cs'
  },
  {
    name: 'Tents',
    displayName: '搭帐篷',
    ns: 'MiniGames.Puzzle.Tents',
    desc: '在树旁搭帐篷，一树一帐不相邻',
    row: 8, col: 8,
    file: 'TentsGame.cs'
  },
  {
    name: 'Nurikabe',
    displayName: '数墙',
    ns: 'MiniGames.Puzzle.Nurikabe',
    desc: '数字格属于对应大小的白色区域',
    row: 10, col: 10,
    file: 'NurikabeGame.cs'
  },
  {
    name: 'Battleship',
    displayName: '海战棋',
    ns: 'MiniGames.Puzzle.Battleship',
    desc: '猜对方舰艇位置的策略游戏',
    row: 10, col: 10,
    file: 'BattleshipGame.cs'
  },
  {
    name: 'OneStrokeSolver',
    displayName: '一笔画',
    ns: 'MiniGames.Puzzle.OneStrokeSolver',
    desc: '一笔画完所有线段',
    row: 6, col: 6,
    file: 'OneStrokeSolverGame.cs'
  },
  {
    name: 'Othello',
    displayName: '黑白棋',
    ns: 'MiniGames.Puzzle.Othello',
    desc: '翻转棋子，吃子多者胜',
    row: 8, col: 8,
    file: 'OthelloGame.cs'
  },
  {
    name: '24point',
    displayName: '24点',
    ns: 'MiniGames.Puzzle.24point',
    desc: '用4个数字和基本运算得24',
    row: 2, col: 4,
    file: 'TwentyFourGame.cs'
  },
  {
    name: 'FrogEscape',
    displayName: '青蛙跳',
    ns: 'MiniGames.Puzzle.FrogEscape',
    desc: '青蛙过河，跳到对岸',
    row: 8, col: 5,
    file: 'FrogEscapeGame.cs'
  },
  {
    name: 'Tents',
    displayName: '搭帐篷',
    ns: 'MiniGames.Puzzle.Tents',
    desc: '一树一帐不相邻',
    row: 8, col: 8,
    file: 'TentsGame.cs'
  }
];

// 已有项目（跳过创建）
const existingProjects = [
  'MiniGames.Puzzle.Sokoban',
  'MiniGames.Puzzle.Sudoku',
  'MiniGames.Puzzle.Nonogram',
  'MiniGames.Puzzle.SlitherLink',
  'MiniGames.Puzzle.24point',
  'MiniGames.Board.Othello',
];

// 9个 Math 工具
const mathTools = [
  { name: 'NumberOne', displayName: '谁是第1', desc: '计算排名和第N名' },
  { name: 'OddEven', displayName: '奇偶判断', desc: '判断奇偶性' },
  { name: 'PrimeChecker', displayName: '质数判定', desc: '判断质数' },
  { name: 'DivisorFinder', displayName: '因数查找', desc: '找整数因数' },
  { name: 'GcdLcm', displayName: '最大公因数/最小公倍数', desc: 'GCD和LCM计算' },
  { name: 'RandomSelector', displayName: '随机选择器', desc: '从列表中随机选择' },
  { name: 'PermutationCombination', displayName: '排列组合', desc: '计算排列和组合数' },
];

// ============ 生成 Puzzle 游戏类 ============
const puzzleTemplates = {
  'SokobanGame.cs': `namespace MiniGames.Puzzle.Sokoban;

public class SokobanGame : Puzzle.PuzzleGame<Piece>
{
    public override string Name => "推箱子";
    public override int Rows => 10;
    public override int Cols => 10;
    private int _playerRow, _playerCol;
    private readonly List<Box> _boxes = new();
    private readonly List<(int r,int c)> _goals = new();
    private int _width = 8, _height = 8;
    private readonly int[,] _map = new int[10, 10]; // 0=空,1=墙,2=目标

    public override void LoadLevel(int level) {
        _boxes.Clear(); _goals.Clear();
        State = Core.GameState.NotStarted;
        // TODO: 从 CDN 数据加载关卡 (https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/sokoban)
        // 数据格式: @ =玩家, $ =箱子, . =目标, * =箱在目标, + =人在目标, # =墙, 空格 =空
    }

    public override bool TryMove(object move) {
        if (move is (int dr, int dc) m) {
            int nr = _playerRow + dr, nc = _playerCol + dc;
            if (nr < 0 || nr >= _height || nc < 0 || nc >= _width) return false;
            if (_map[nr, nc] == 1) return false; // 墙
            var box = _boxes.FirstOrDefault(b => b.Row == nr && b.Col == nc);
            if (box != null) {
                int br = nr + dr, bc = nc + dc;
                if (br < 0 || br >= _height || bc < 0 || bc >= _width) return false;
                if (_map[br, bc] == 1) return false;
                if (_boxes.Any(b => b.Row == br && b.Col == bc)) return false;
                box.Row = br; box.Col = bc;
            }
            _playerRow = nr; _playerCol = nc;
            if (State == Core.GameState.NotStarted) State = Core.GameState.InProgress;
            return true;
        }
        return false;
    }

    public override bool IsSolved() => _goals.All(g => _boxes.Any(b => b.Row == g.r && b.Col == g.c));

    public override int[,] BuildBoard() {
        int[,] b = new int[Rows, Cols];
        b[_playerRow, _playerCol] = 9; // 玩家
        foreach (var bx in _boxes) b[bx.Row, bx.Col] = 2;
        foreach (var g in _goals) b[g.r, g.c] = 3;
        return b;
    }

    public class Box { public int Row, Col; }
}

public class Piece : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "box";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
}
`,

  'SudokuGame.cs': `namespace MiniGames.Puzzle.Sudoku;

public class SudokuGame : Puzzle.PuzzleGame<SudokuCell>
{
    public override string Name => "数独";
    public override int Rows => 9;
    public override int Cols => 9;
    private readonly int[,] _puzzle = new int[9, 9];
    private readonly int[,] _solution = new int[9, 9];
    private readonly int[,] _userBoard = new int[9, 9];
    private readonly bool[,] _fixed = new bool[9, 9];
    private int _selectedRow = -1, _selectedCol = -1;

    public override void LoadLevel(int level) {
        for (int r = 0; r < 9; r++)
            for (int c = 0; c < 9; c++) { _puzzle[r, c] = 0; _fixed[r, c] = false; }
        // TODO: 从 CDN 数据加载 (https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/sudoku)
        State = Core.GameState.NotStarted;
    }

    public override bool TryMove(object move) {
        if (move is ValueTuple<int,int,int> m) { // (row, col, value)
            int r = m.Item1, c = m.Item2, v = m.Item3;
            if (_fixed[r, c]) return false;
            _userBoard[r, c] = v;
            if (State == Core.GameState.NotStarted) State = Core.GameState.InProgress;
            return true;
        }
        return false;
    }

    public override bool IsSolved() {
        for (int r = 0; r < 9; r++)
            for (int c = 0; c < 9; c++) {
                int v = _fixed[r, c] ? _puzzle[r, c] : _userBoard[r, c];
                if (v != _solution[r, c]) return false;
            }
        return true;
    }

    public override int[,] BuildBoard() {
        int[,] b = new int[9, 9];
        for (int r = 0; r < 9; r++)
            for (int c = 0; c < 9; c++)
                b[r, c] = _fixed[r, c] ? _puzzle[r, c] : _userBoard[r, c];
        return b;
    }
}

public class SudokuCell : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "cell";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
    public int Value;
}
`,

  'AkariGame.cs': `namespace MiniGames.Puzzle.Akari;

public class AkariGame : Puzzle.PuzzleGame<Light>
{
    public override string Name => "灯塔";
    public override int Rows => 12;
    public override int Cols => 12;
    // 0=白格,1=黑格(无数字),2-6=黑格(数字0-4)
    private readonly int[,] _grid = new int[12, 12];
    private readonly bool[,] _lights = new bool[12, 12];
    private readonly List<Light> _placedLights = new();

    public override void LoadLevel(int level) {
        _placedLights.Clear();
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++) {
                _lights[r, c] = false;
                // TODO: 从 CDN 加载 (https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/akari)
            }
        State = Core.GameState.NotStarted;
    }

    public override bool TryMove(object move) {
        if (move is ValueTuple<int,int> p) {
            int r = p.Item1, c = p.Item2;
            if (r < 0 || r >= Rows || c < 0 || c >= Cols) return false;
            if (_grid[r, c] != 0) return false; // 非白格不能放灯
            // 取消灯塔
            if (_lights[r, c]) { _lights[r, c] = false; return true; }
            // 检查冲突：不能照亮其他灯或数字格
            for (int dr = -1; dr <= 1; dr++)
                for (int dc = -1; dc <= 1; dc++) {
                    int nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < Rows && nc >= 0 && nc < Cols && _lights[nr, nc]) return false;
                }
            // 检查直线照亮
            foreach (var (dr, dc) in new[] { (-1,0),(1,0),(0,-1),(0,1) }) {
                int nr = r+dr, nc = c+dc;
                while (nr >= 0 && nr < Rows && nc >= 0 && nc < Cols) {
                    if (_grid[nr, nc] >= 1) break; // 黑格阻挡
                    if (_lights[nr, nc]) return false; // 照到另一个灯
                    nr += dr; nc += dc;
                }
            }
            _lights[r, c] = true;
            if (State == Core.GameState.NotStarted) State = Core.GameState.InProgress;
            return true;
        }
        return false;
    }

    public override bool IsSolved() {
        // 检查所有白格都被照亮
        bool[,] lit = new bool[Rows, Cols];
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++) {
                if (_grid[r, c] != 0) continue; // 非白格跳过
                if (_lights[r, c]) { lit[r, c] = true; continue; }
                // 检查四个方向
                foreach (var (dr, dc) in new[] { (-1,0),(1,0),(0,-1),(0,1) }) {
                    int nr = r+dr, nc = c+dc;
                    while (nr >= 0 && nr < Rows && nc >= 0 && nc < Cols) {
                        if (_grid[nr, nc] >= 1) break;
                        if (_lights[nr, nc]) { lit[r, c] = true; break; }
                        nr += dr; nc += dc;
                    }
                    if (lit[r, c]) break;
                }
            }
        // 检查数字格约束
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++) {
                int v = _grid[r, c];
                if (v < 2 || v > 6) continue; // 非数字格
                int expected = v - 2; // 2->0, 3->1, 4->2, 5->3, 6->4
                int count = 0;
                foreach (var (dr, dc) in new[] { (-1,0),(1,0),(0,-1),(0,1) }) {
                    int nr = r+dr, nc = c+dc;
                    if (nr >= 0 && nr < Rows && nc >= 0 && nc < Cols && _lights[nr, nc]) count++;
                }
                if (count != expected) return false;
            }
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++)
                if (_grid[r, c] == 0 && !lit[r, c]) return false;
        return true;
    }

    public override int[,] BuildBoard() {
        int[,] b = new int[Rows, Cols];
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++) {
                if (_lights[r, c]) b[r, c] = 9; // 灯塔
                else b[r, c] = _grid[r, c];
            }
        return b;
    }
}

public class Light : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "light";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
}
`,

  'TentsGame.cs': `namespace MiniGames.Puzzle.Tents;

public class TentsGame : Puzzle.PuzzleGame<Tent>
{
    public override string Name => "搭帐篷";
    public override int Rows => 8;
    public override int Cols => 8;
    // 0=空,1=树,2=帐篷
    private readonly int[,] _grid = new int[8, 8];
    private readonly List<(int r, int c)> _trees = new();
    private readonly List<Tent> _tents = new();

    public override void LoadLevel(int level) {
        _trees.Clear(); _tents.Clear();
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++) {
                _grid[r, c] = 0;
                // TODO: 从 CDN 加载 (https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/tents)
            }
        State = Core.GameState.NotStarted;
    }

    public override bool TryMove(object move) {
        if (move is ValueTuple<int,int> p) {
            int r = p.Item1, c = p.Item2;
            if (r < 0 || r >= Rows || c < 0 || c >= Cols) return false;
            if (_grid[r, c] == 1) return false; // 不能放树上
            // toggle
            if (_grid[r, c] == 2) { _grid[r, c] = 0; _tents.RemoveAll(t => t.Row == r && t.Col == c); }
            else {
                // 检查是否在树旁
                bool nearTree = false;
                foreach (var (dr, dc) in new[] { (-1,0),(1,0),(0,-1),(0,1) }) {
                    int nr = r+dr, nc = c+dc;
                    if (nr >= 0 && nr < Rows && nc >= 0 && nc < Cols && _grid[nr, nc] == 1) { nearTree = true; break; }
                }
                if (!nearTree) return false;
                _grid[r, c] = 2;
                _tents.Add(new Tent { Row = r, Col = c });
            }
            if (State == Core.GameState.NotStarted) State = Core.GameState.InProgress;
            return true;
        }
        return false;
    }

    public override bool IsSolved() {
        if (_tents.Count != _trees.Count) return false;
        foreach (var tree in _trees) {
            bool hasTent = false;
            foreach (var (dr, dc) in new[] { (-1,0),(1,0),(0,-1),(0,1) }) {
                int nr = tree.r+dr, nc = tree.c+dc;
                if (nr >= 0 && nr < Rows && nc >= 0 && nc < Cols && _grid[nr, nc] == 2) { hasTent = true; break; }
            }
            if (!hasTent) return false;
        }
        return true;
    }

    public override int[,] BuildBoard() {
        int[,] b = new int[Rows, Cols];
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++) b[r, c] = _grid[r, c];
        return b;
    }
}

public class Tent : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "tent";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
}
`,

  'NonogramGame.cs': `namespace MiniGames.Puzzle.Nonogram;

public class NonogramGame : Puzzle.PuzzleGame<Cell>
{
    public override string Name => "填字画";
    public override int Rows => 10;
    public override int Cols => 10;
    // 0=未填,1=填黑,2=叉
    private readonly int[,] _board = new int[10, 10];
    private int[] _rowHints = Array.Empty<int>();
    private int[] _colHints = Array.Empty<int>();

    public override void LoadLevel(int level) {
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++) _board[r, c] = 0;
        // TODO: 从 CDN 加载 (https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/nonogram)
        State = Core.GameState.NotStarted;
    }

    public override bool TryMove(object move) {
        if (move is ValueTuple<int,int> p) {
            int r = p.Item1, c = p.Item2;
            // 点击循环: 0→1→2→0
            _board[r, c] = (_board[r, c] + 1) % 3;
            if (State == Core.GameState.NotStarted) State = Core.GameState.InProgress;
            return true;
        }
        return false;
    }

    public override bool IsSolved() {
        // TODO: 对比 board 与 solution
        return false;
    }

    public override int[,] BuildBoard() {
        int[,] b = new int[Rows, Cols];
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++) b[r, c] = _board[r, c];
        return b;
    }
}

public class Cell : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "cell";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
}
`,

  'SlitherLinkGame.cs': `namespace MiniGames.Puzzle.SlitherLink;

public class SlitherLinkGame : Puzzle.PuzzleGame<Edge>
{
    public override string Name => "数回";
    public override int Rows => 8;
    public override int Cols => 8;
    // _hEdges[r][c] = 上边(r,c)是否画线，_vEdges[r][c] = 左边(r,c)是否画线
    private bool[,] _hEdges, _vEdges;
    private readonly int[,] _clues = new int[8, 8]; // 0-4 数字提示

    public override void LoadLevel(int level) {
        _hEdges = new bool[Rows+1, Cols];
        _vEdges = new bool[Rows, Cols+1];
        for (int r = 0; r <= Rows; r++)
            for (int c = 0; c < Cols; c++) _hEdges[r, c] = false;
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c <= Cols; c++) _vEdges[r, c] = false;
        // TODO: 从 CDN 加载 (https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/slither-link)
        State = Core.GameState.NotStarted;
    }

    public override bool TryMove(object move) {
        if (move is ValueTuple<string,int,int> m) {
            string type = m.Item1; int r = m.Item2, c = m.Item3;
            if (type == "h") { if (r >= 0 && r <= Rows && c >= 0 && c < Cols) _hEdges[r, c] = !_hEdges[r, c]; }
            else if (type == "v") { if (r >= 0 && r < Rows && c >= 0 && c <= Cols) _vEdges[r, c] = !_vEdges[r, c]; }
            if (State == Core.GameState.NotStarted) State = Core.GameState.InProgress;
            return true;
        }
        return false;
    }

    public override bool IsSolved() {
        // 验证：所有提示格满足、线条闭合、无孤立线段
        return false; // TODO
    }

    public override int[,] BuildBoard() {
        int[,] b = new int[Rows*2+1, Cols*2+1];
        for (int r = 0; r <= Rows; r++)
            for (int c = 0; c < Cols; c++)
                if (_hEdges[r, c]) b[r*2, c*2+1] = 1;
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c <= Cols; c++)
                if (_vEdges[r, c]) b[r*2+1, c*2] = 1;
        return b;
    }
}

public class Edge : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "edge";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
}
`,

  'NurikabeGame.cs': `namespace MiniGames.Puzzle.Nurikabe;

public class NurikabeGame : Puzzle.PuzzleGame<Cell>
{
    public override string Name => "数墙";
    public override int Rows => 10;
    public override int Cols => 10;
    // 0=未填白,1=黑,2=已标记白
    private readonly int[,] _board = new int[10, 10];
    private readonly int[,] _numbers = new int[10, 10]; // 数字提示

    public override void LoadLevel(int level) {
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++) { _board[r, c] = 0; _numbers[r, c] = 0; }
        // TODO: 从 CDN 加载 (https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/nurikabe)
        State = Core.GameState.NotStarted;
    }

    public override bool TryMove(object move) {
        if (move is ValueTuple<int,int> p) {
            int r = p.Item1, c = p.Item2;
            _board[r, c] = _board[r, c] == 0 ? 1 : 0; // toggle 黑
            if (State == Core.GameState.NotStarted) State = Core.GameState.InProgress;
            return true;
        }
        return false;
    }

    public override bool IsSolved() { return false; } // TODO: 验证白格连通且大小匹配

    public override int[,] BuildBoard() {
        int[,] b = new int[Rows, Cols];
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++) b[r, c] = _board[r, c];
        return b;
    }
}

public class Cell : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "cell";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
}
`,

  'BattleshipGame.cs': `namespace MiniGames.Puzzle.Battleship;

public class BattleshipGame : Puzzle.PuzzleGame<Ship>
{
    public override string Name => "海战棋";
    public override int Rows => 10;
    public override int Cols => 10;
    // 0=未知,1=击中,2=未击中,3=沉没
    private readonly int[,] _myBoard = new int[10, 10];
    private readonly int[,] _enemyBoard = new int[10, 10];
    private readonly List<Ship> _myShips = new();

    public override void LoadLevel(int level) {
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++) { _myBoard[r, c] = 0; _enemyBoard[r, c] = 0; }
        // TODO: 从 CDN 加载题库 (https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/battleship)
        State = Core.GameState.NotStarted;
    }

    public override bool TryMove(object move) {
        if (move is ValueTuple<int,int> p) {
            int r = p.Item1, c = p.Item2;
            // AI 回合... 
            if (State == Core.GameState.NotStarted) State = Core.GameState.InProgress;
            return true;
        }
        return false;
    }

    public override bool IsSolved() { return false; } // TODO

    public override int[,] BuildBoard() {
        int[,] b = new int[Rows, Cols];
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++) b[r, c] = _enemyBoard[r, c];
        return b;
    }
}

public class Ship : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "ship";
    public int Row { get; set; } public int Col { get; set; }
    public int Height { get; set; } public int Width { get; set; }
}
`,

  'OneStrokeSolverGame.cs': `namespace MiniGames.Puzzle.OneStrokeSolver;

public class OneStrokeSolverGame : Puzzle.PuzzleGame<Node>
{
    public override string Name => "一笔画";
    public override int Rows => 6;
    public override int Cols => 6;
    private readonly bool[,] _edges = new bool[36, 36]; // 节点连通
    private readonly List<Node> _path = new();
    private bool _solved = false;

    public override void LoadLevel(int level) {
        _path.Clear(); _solved = false;
        for (int i = 0; i < 36; i++)
            for (int j = 0; j < 36; j++) _edges[i, j] = false;
        // TODO: 从 CDN 加载 (https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/one-stroke-solver)
        State = Core.GameState.NotStarted;
    }

    public override bool TryMove(object move) {
        if (move is int nodeId) {
            if (_path.Count > 0 && !_edges[_path.Last(), nodeId]) return false;
            if (_path.Contains(nodeId)) return false; // 不能重复
            _path.Add(nodeId);
            if (State == Core.GameState.NotStarted) State = Core.GameState.InProgress;
            return true;
        }
        return false;
    }

    public override bool IsSolved() => _solved; // TODO: 检查是否覆盖所有边

    public override int[,] BuildBoard() {
        int[,] b = new int[Rows*2-1, Cols*2-1];
        foreach (var p in _path) b[p / Cols, p % Cols] = 1;
        return b;
    }
}

public class Node : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "node";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
}
`,

  'OthelloGame.cs': `namespace MiniGames.Puzzle.Othello;

public class OthelloGame : Puzzle.PuzzleGame<Disc>
{
    public override string Name => "黑白棋";
    public override int Rows => 8;
    public override int Cols => 8;
    private readonly int[,] _board = new int[8, 8];
    private int _currentPlayer = 1; // 1=黑,2=白

    public override void LoadLevel(int level) {
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++) _board[r, c] = 0;
        _board[3,3] = 2; _board[3,4] = 1;
        _board[4,3] = 1; _board[4,4] = 2;
        _currentPlayer = 1;
        State = Core.GameState.NotStarted;
    }

    public override bool TryMove(object move) {
        if (move is ValueTuple<int,int> p) {
            int r = p.Item1, c = p.Item2;
            if (r < 0 || r >= 8 || c < 0 || c >= 8 || _board[r, c] != 0) return false;
            // 翻转逻辑见 MiniGames.Board.Othello 已有完整实现
            var dirs = new[] { (-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1) };
            bool valid = false;
            foreach (var (dr, dc) in dirs) {
                int nr = r+dr, nc = c+dc;
                var toFlip = new List<(int,int)>();
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && _board[nr, nc] == 3 - _currentPlayer) {
                    toFlip.Add((nr, nc)); nr += dr; nc += dc;
                }
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && _board[nr, nc] == _currentPlayer && toFlip.Count > 0) {
                    valid = true;
                    foreach (var (fr, fc) in toFlip) _board[fr, fc] = _currentPlayer;
                }
            }
            if (!valid) return false;
            _board[r, c] = _currentPlayer;
            _currentPlayer = 3 - _currentPlayer;
            if (State == Core.GameState.NotStarted) State = Core.GameState.InProgress;
            return true;
        }
        return false;
    }

    public override bool IsSolved() {
        bool noMoves = true;
        for (int r = 0; r < 8 && noMoves; r++)
            for (int c = 0; c < 8 && noMoves; c++)
                if (_board[r, c] == 0) noMoves = false;
        return noMoves;
    }

    public override int[,] BuildBoard() {
        int[,] b = new int[8, 8];
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++) b[r, c] = _board[r, c];
        return b;
    }
}

public class Disc : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "disc";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
}
`,

  'TwentyFourGame.cs': `namespace MiniGames.Puzzle.TwentyFour;

public class TwentyFourGame : Puzzle.PuzzleGame<Card>
{
    public override string Name => "24点";
    public override int Rows => 2;
    public override int Cols => 4;
    private int[] _nums = new int[4];
    private bool _solved = false;
    private string _solution = "";

    public override void LoadLevel(int level) {
        var rand = new Random(level);
        for (int i = 0; i < 4; i++) _nums[i] = rand.Next(1, 10);
        _solved = false; _solution = "";
        State = Core.GameState.NotStarted;
    }

    public override bool TryMove(object move) {
        if (move is string expr) {
            if (Solve(_nums, out string result)) { _solved = true; _solution = result; }
            if (State == Core.GameState.NotStarted) State = Core.GameState.InProgress;
            return true;
        }
        return false;
    }

    public override bool IsSolved() => _solved;

    public override int[,] BuildBoard() {
        int[,] b = new int[2, 4];
        for (int i = 0; i < 4; i++) b[i / 4, i % 4] = _nums[i];
        return b;
    }

    private static bool Solve(int[] nums, out string result) {
        result = "";
        // 暴力枚举所有表达式组合
        var ops = new[] { '+', '-', '*', '/' };
        bool TryPerm(int[] a, int n) {
            if (n == 1) {
                if (Math.Abs(a[0] - 24) < 0.0001) { result = ""; return true; }
                return false;
            }
            for (int i = 0; i < n; i++) {
                for (int j = i+1; j < n; j++) {
                    int x = a[i], y = a[j];
                    int[] rest = new int[n-1];
                    for (int k = 0; k < n; k++) if (k != i && k != j) rest[k < i || k < j ? k : k-1] = a[k];
                    foreach (var (op, res) in new[] { ('+', x+y), ('-', x-y), ('-', y-x), ('*', x*y), ('/', x!=0?x/y:0), ('/', y!=0?y/x:0) }) {
                        rest[0] = res;
                        if (TryPerm(rest, n-1)) return true;
                    }
                }
            }
            return false;
        }
        return TryPerm(nums, 4);
    }
}

public class Card : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "card";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
}
`,

  'FrogEscapeGame.cs': `namespace MiniGames.Puzzle.FrogEscape;

public class FrogEscapeGame : Puzzle.PuzzleGame<Frog>
{
    public override string Name => "青蛙跳";
    public override int Rows => 8;
    public override int Cols => 5;
    // 0=空,1=左青蛙,2=右青蛙,3=荷叶(可跳)
    private int[] _slots = new int[] { 1, 1, 1, 0, 2, 2, 2, 3 };
    private int _moves = 0;

    public override void LoadLevel(int level) {
        _slots = new int[] { 1, 1, 1, 0, 2, 2, 2, 3 };
        _moves = 0;
        State = Core.GameState.NotStarted;
    }

    public override bool TryMove(object move) {
        if (move is int fromIdx) {
            if (fromIdx < 0 || fromIdx >= 8) return false;
            int frog = _slots[fromIdx];
            if (frog == 0) return false;
            // 相邻跳 or 隔一跳
            int target = fromIdx + 1;
            if (target < 8 && _slots[target] == 0) {
                _slots[target] = frog; _slots[fromIdx] = 0; _moves++; return true;
            }
            target = fromIdx + 2;
            if (target < 8 && _slots[target] == 0 && _slots[fromIdx+1] != 0) {
                _slots[target] = frog; _slots[fromIdx] = 0; _moves++; return true;
            }
            target = fromIdx - 1;
            if (target >= 0 && _slots[target] == 0) {
                _slots[target] = frog; _slots[fromIdx] = 0; _moves++; return true;
            }
            target = fromIdx - 2;
            if (target >= 0 && _slots[target] == 0 && _slots[fromIdx-1] != 0) {
                _slots[target] = frog; _slots[fromIdx] = 0; _moves++; return true;
            }
            return false;
        }
    }

    public override bool IsSolved() {
        // 左青蛙全到右边(>=5) 或右青蛙全到左边(<=2)
        int left = _slots.Take(3).Count(s => s == 1 || s == 3);
        return left == 0 || _slots.Take(5).Count(s => s == 2) == 0;
    }

    public override int[,] BuildBoard() {
        int[,] b = new int[1, 8];
        for (int i = 0; i < 8; i++) b[0, i] = _slots[i];
        return b;
    }
}

public class Frog : Core.IPiece {
    public string Name { get; set; } = "";
    public object Type => "frog";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
}
`,
};

// ============ Math 工具类模板 ============
const mathTemplates = {
  'NumberOneGame.cs': `namespace MiniGames.Math.NumberOne;

public class NumberOneGame : Core.GridGame<Cell>
{
    public override string Name => "谁是第1";
    public override int Rows => 1;
    public override int Cols => 10;
    public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }
    public override bool TryMove(object move) { return false; }
    public override bool IsSolved() => true;
    public override int[,] BuildBoard() => new int[1, Cols];
}

public class Cell : Core.IPiece {
    public string Name { get; set; } = ""; public object Type => "cell";
    public int Row { get; set; } public int Col { get; set; }
    public int Height => 1; public int Width => 1;
}
`,
  'OddEvenGame.cs': `namespace MiniGames.Math.OddEven;

public class OddEvenGame : Core.GridGame<Cell>
{
    public override string Name => "奇偶判断";
    public override int Rows => 1; public override int Cols => 2;
    public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }
    public override bool TryMove(object move) => false;
    public override bool IsSolved() => true;
    public override int[,] BuildBoard() => new int[1, 2];
}
public class Cell : Core.IPiece { public string Name { get; set; } = ""; public object Type => "cell"; public int Row { get; set; } public int Col { get; set; } public int Height => 1; public int Width => 1; }
`,
  'PrimeCheckerGame.cs': `namespace MiniGames.Math.PrimeChecker;

public class PrimeCheckerGame : Core.GridGame<Cell>
{
    public override string Name => "质数判定";
    public override int Rows => 1; public override int Cols => 2;
    public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }
    public override bool TryMove(object move) => false;
    public override bool IsSolved() => true;
    public override int[,] BuildBoard() => new int[1, 2];
}
public class Cell : Core.IPiece { public string Name { get; set; } = ""; public object Type => "cell"; public int Row { get; set; } public int Col { get; set; } public int Height => 1; public int Width => 1; }
`,
  'DivisorFinderGame.cs': `namespace MiniGames.Math.DivisorFinder;

public class DivisorFinderGame : Core.GridGame<Cell>
{
    public override string Name => "因数查找";
    public override int Rows => 1; public override int Cols => 10;
    public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }
    public override bool TryMove(object move) => false;
    public override bool IsSolved() => true;
    public override int[,] BuildBoard() => new int[1, Cols];
}
public class Cell : Core.IPiece { public string Name { get; set; } = ""; public object Type => "cell"; public int Row { get; set; } public int Col { get; set; } public int Height => 1; public int Width => 1; }
`,
  'GcdLcmGame.cs': `namespace MiniGames.Math.GcdLcm;

public class GcdLcmGame : Core.GridGame<Cell>
{
    public override string Name => "最大公因数/最小公倍数";
    public override int Rows => 1; public override int Cols => 3;
    public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }
    public override bool TryMove(object move) => false;
    public override bool IsSolved() => true;
    public override int[,] BuildBoard() => new int[1, Cols];
}
public class Cell : Core.IPiece { public string Name { get; set; } = ""; public object Type => "cell"; public int Row { get; set; } public int Col { get; set; } public int Height => 1; public int Width => 1; }
`,
  'RandomSelectorGame.cs': `namespace MiniGames.Math.RandomSelector;

public class RandomSelectorGame : Core.GridGame<Cell>
{
    public override string Name => "随机选择器";
    public override int Rows => 10; public override int Cols => 1;
    public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }
    public override bool TryMove(object move) => false;
    public override bool IsSolved() => true;
    public override int[,] BuildBoard() => new int[Rows, 1];
}
public class Cell : Core.IPiece { public string Name { get; set; } = ""; public object Type => "cell"; public int Row { get; set; } public int Col { get; set; } public int Height => 1; public int Width => 1; }
`,
  'PermutationCombinationGame.cs': `namespace MiniGames.Math.PermutationCombination;

public class PermutationCombinationGame : Core.GridGame<Cell>
{
    public override string Name => "排列组合";
    public override int Rows => 1; public override int Cols => 3;
    public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }
    public override bool TryMove(object move) => false;
    public override bool IsSolved() => true;
    public override int[,] BuildBoard() => new int[1, Cols];
}
public class Cell : Core.IPiece { public string Name { get; set; } = ""; public object Type => "cell"; public int Row { get; set; } public int Col { get; set; } public int Height => 1; public int Width => 1; }
`,
};

// ============ 写入文件 ============
const skipProjects = [
  'MiniGames.Puzzle.Sokoban', 'MiniGames.Puzzle.Sudoku', 'MiniGames.Puzzle.Nonogram',
  'MiniGames.Puzzle.SlitherLink', 'MiniGames.Puzzle.24point', 'MiniGames.Board.Othello',
  'MiniGames.Math.TwentyFour', 'MiniGames.Core', 'MiniGames.Console',
  'MiniGames.Puzzle.Core'
];

// 目标目录映射
const targetMap = {
  'MiniGames.Puzzle.Sokoban': { csproj: 'MiniGames.Puzzle.Sokoban/MiniGames.Puzzle.Sokoban.csproj', cs: 'MiniGames.Puzzle.Sokoban/SokobanGame.cs', ns: 'MiniGames.Puzzle.Sokoban', className: 'SokobanGame' },
  'MiniGames.Puzzle.Sudoku': { csproj: 'MiniGames.Puzzle.Sudoku/MiniGames.Puzzle.Sudoku.csproj', cs: 'MiniGames.Puzzle.Sudoku/SudokuGame.cs', ns: 'MiniGames.Puzzle.Sudoku', className: 'SudokuGame' },
  'MiniGames.Puzzle.Nonogram': { csproj: 'MiniGames.Puzzle.Nonogram/MiniGames.Puzzle.Nonogram.csproj', cs: 'MiniGames.Puzzle.Nonogram/NonogramGame.cs', ns: 'MiniGames.Puzzle.Nonogram', className: 'NonogramGame' },
  'MiniGames.Puzzle.SlitherLink': { csproj: 'MiniGames.Puzzle.SlitherLink/MiniGames.Puzzle.SlitherLink.csproj', cs: 'MiniGames.Puzzle.SlitherLink/SlitherLinkGame.cs', ns: 'MiniGames.Puzzle.SlitherLink', className: 'SlitherLinkGame' },
  'MiniGames.Puzzle.Akari': { csproj: 'MiniGames.Puzzle.Akari/MiniGames.Puzzle.Akari.csproj', cs: 'MiniGames.Puzzle.Akari/AkariGame.cs', ns: 'MiniGames.Puzzle.Akari', className: 'AkariGame' },
  'MiniGames.Puzzle.Tents': { csproj: 'MiniGames.Puzzle.Tents/MiniGames.Puzzle.Tents.csproj', cs: 'MiniGames.Puzzle.Tents/TentsGame.cs', ns: 'MiniGames.Puzzle.Tents', className: 'TentsGame' },
  'MiniGames.Puzzle.Nurikabe': { csproj: 'MiniGames.Puzzle.Nurikabe/MiniGames.Puzzle.Nurikabe.csproj', cs: 'MiniGames.Puzzle.Nurikabe/NurikabeGame.cs', ns: 'MiniGames.Puzzle.Nurikabe', className: 'NurikabeGame' },
  'MiniGames.Puzzle.Battleship': { csproj: 'MiniGames.Puzzle.Battleship/MiniGames.Puzzle.Battleship.csproj', cs: 'MiniGames.Puzzle.Battleship/BattleshipGame.cs', ns: 'MiniGames.Puzzle.Battleship', className: 'BattleshipGame' },
  'MiniGames.Puzzle.OneStrokeSolver': { csproj: 'MiniGames.Puzzle.OneStrokeSolver/MiniGames.Puzzle.OneStrokeSolver.csproj', cs: 'MiniGames.Puzzle.OneStrokeSolver/OneStrokeSolverGame.cs', ns: 'MiniGames.Puzzle.OneStrokeSolver', className: 'OneStrokeSolverGame' },
  'MiniGames.Puzzle.Othello': { csproj: 'MiniGames.Puzzle.Othello/MiniGames.Puzzle.Othello.csproj', cs: 'MiniGames.Puzzle.Othello/OthelloGame.cs', ns: 'MiniGames.Puzzle.Othello', className: 'OthelloGame' },
  'MiniGames.Puzzle.24point': { csproj: 'MiniGames.Puzzle.24point/MiniGames.Puzzle.24point.csproj', cs: 'MiniGames.Puzzle.24point/TwentyFourGame.cs', ns: 'MiniGames.Puzzle.24point', className: 'TwentyFourGame' },
  'MiniGames.Puzzle.FrogEscape': { csproj: 'MiniGames.Puzzle.FrogEscape/MiniGames.Puzzle.FrogEscape.csproj', cs: 'MiniGames.Puzzle.FrogEscape/FrogEscapeGame.cs', ns: 'MiniGames.Puzzle.FrogEscape', className: 'FrogEscapeGame' },
  'MiniGames.Math.NumberOne': { csproj: 'MiniGames.Math.NumberOne/MiniGames.Math.NumberOne.csproj', cs: 'MiniGames.Math.NumberOne/NumberOneGame.cs', ns: 'MiniGames.Math.NumberOne', className: 'NumberOneGame' },
  'MiniGames.Math.OddEven': { csproj: 'MiniGames.Math.OddEven/MiniGames.Math.OddEven.csproj', cs: 'MiniGames.Math.OddEven/OddEvenGame.cs', ns: 'MiniGames.Math.OddEven', className: 'OddEvenGame' },
  'MiniGames.Math.PrimeChecker': { csproj: 'MiniGames.Math.PrimeChecker/MiniGames.Math.PrimeChecker.csproj', cs: 'MiniGames.Math.PrimeChecker/PrimeCheckerGame.cs', ns: 'MiniGames.Math.PrimeChecker', className: 'PrimeCheckerGame' },
  'MiniGames.Math.DivisorFinder': { csproj: 'MiniGames.Math.DivisorFinder/MiniGames.Math.DivisorFinder.csproj', cs: 'MiniGames.Math.DivisorFinder/DivisorFinderGame.cs', ns: 'MiniGames.Math.DivisorFinder', className: 'DivisorFinderGame' },
  'MiniGames.Math.GcdLcm': { csproj: 'MiniGames.Math.GcdLcm/MiniGames.Math.GcdLcm.csproj', cs: 'MiniGames.Math.GcdLcm/GcdLcmGame.cs', ns: 'MiniGames.Math.GcdLcm', className: 'GcdLcmGame' },
  'MiniGames.Math.RandomSelector': { csproj: 'MiniGames.Math.RandomSelector/MiniGames.Math.RandomSelector.csproj', cs: 'MiniGames.Math.RandomSelector/RandomSelectorGame.cs', ns: 'MiniGames.Math.RandomSelector', className: 'RandomSelectorGame' },
  'MiniGames.Math.PermutationCombination': { csproj: 'MiniGames.Math.PermutationCombination/MiniGames.Math.PermutationCombination.csproj', cs: 'MiniGames.Math.PermutationCombination/PermutationCombinationGame.cs', ns: 'MiniGames.Math.PermutationCombination', className: 'PermutationCombinationGame' },
};

const allFiles = [];

for (const [proj, info] of Object.entries(targetMap)) {
  mkDir(path.join(root, path.dirname(info.csproj)));
  if (!fs.existsSync(path.join(root, info.csproj))) {
    fs.writeFileSync(path.join(root, info.csproj), csproj(proj, info.cs), 'utf8');
    allFiles.push(info.csproj);
  }
}

// 写游戏类代码
const puzzleGameFiles = {
  'MiniGames.Puzzle.Akari': puzzleTemplates['AkariGame.cs'],
  'MiniGames.Puzzle.Tents': puzzleTemplates['TentsGame.cs'],
  'MiniGames.Puzzle.Nurikabe': puzzleTemplates['NurikabeGame.cs'],
  'MiniGames.Puzzle.Battleship': puzzleTemplates['BattleshipGame.cs'],
  'MiniGames.Puzzle.OneStrokeSolver': puzzleTemplates['OneStrokeSolverGame.cs'],
  'MiniGames.Puzzle.Othello': puzzleTemplates['OthelloGame.cs'],
  'MiniGames.Puzzle.FrogEscape': puzzleTemplates['FrogEscapeGame.cs'],
  'MiniGames.Puzzle.24point': puzzleTemplates['TwentyFourGame.cs'],
};

for (const [proj, content] of Object.entries(puzzleGameFiles)) {
  const info = targetMap[proj];
  fs.writeFileSync(path.join(root, info.cs), content, 'utf8');
  allFiles.push(info.cs);
}

for (const [className, content] of Object.entries(mathTemplates)) {
  const proj = Object.keys(targetMap).find(k => targetMap[k].className === className);
  if (proj) {
    fs.writeFileSync(path.join(root, targetMap[proj].cs), content, 'utf8');
    allFiles.push(targetMap[proj].cs);
  }
}

console.log('Done: ' + allFiles.length + ' files created');
console.log(allFiles.join('\n'));