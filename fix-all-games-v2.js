// 修复 Pieces 属性 + 24point 命名空间
const fs = require('fs');
const path = require('path');
const root = 'F:/SelfJob/GameCenter';

function addPieces(content, pieceType, pieceList) {
  // Add private field and override Pieces property
  const piecesLine = `    public override IReadOnlyList<${pieceType}> Pieces => ${pieceList};`;
  
  // Insert after "private readonly List<${pieceType}> _pieces = new();"
  if (content.includes(`private readonly List<${pieceType}> _pieces`)) {
    content = content.replace(
      `private readonly List<${pieceType}> _pieces = new();`,
      `private readonly List<${pieceType}> _pieces = new();\n${piecesLine}`
    );
  } else if (content.includes('private readonly List<Light> _placedLights')) {
    // Special case for Akari
    content = content.replace(
      'private readonly List<Light> _placedLights = new();',
      `private readonly List<Light> _placedLights = new();\n${piecesLine.replace('<Light>', '<Light>')}`
    );
  } else {
    // No List field, add after LoadLevel
    content = content.replace(
      'public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }',
      `public override void LoadLevel(int level) { State = Core.GameState.NotStarted; }\n${piecesLine}`
    );
  }
  return content;
}

const files = [
  // Math games
  { file: 'MiniGames.Math.NumberOne/NumberOneGame.cs', piece: 'Cell', list: '_pieces' },
  { file: 'MiniGames.Math.OddEven/OddEvenGame.cs', piece: 'Cell', list: '_pieces' },
  { file: 'MiniGames.Math.PrimeChecker/PrimeCheckerGame.cs', piece: 'Cell', list: '_pieces' },
  { file: 'MiniGames.Math.DivisorFinder/DivisorFinderGame.cs', piece: 'Cell', list: '_pieces' },
  { file: 'MiniGames.Math.GcdLcm/GcdLcmGame.cs', piece: 'Cell', list: '_pieces' },
  { file: 'MiniGames.Math.RandomSelector/RandomSelectorGame.cs', piece: 'Cell', list: '_pieces' },
  { file: 'MiniGames.Math.PermutationCombination/PermutationCombinationGame.cs', piece: 'Cell', list: '_pieces' },
  // Puzzle games
  { file: 'MiniGames.Puzzle.Battleship/BattleshipGame.cs', piece: 'Ship', list: '_pieces' },
  { file: 'MiniGames.Puzzle.Nurikabe/NurikabeGame.cs', piece: 'Cell', list: '_pieces' },
  { file: 'MiniGames.Puzzle.Othello/OthelloGame.cs', piece: 'Disc', list: '_pieces' },
  { file: 'MiniGames.Puzzle.Akari/AkariGame.cs', piece: 'Light', list: '_placedLights' },
  { file: 'MiniGames.Puzzle.Tents/TentsGame.cs', piece: 'Tent', list: '_tents' },
  { file: 'MiniGames.Puzzle.FrogEscape/FrogEscapeGame.cs', piece: 'Frog', list: '_pieces' },
  { file: 'MiniGames.Puzzle.OneStrokeSolver/OneStrokeSolverGame.cs', piece: 'Node', list: '_pieces' },
  { file: 'MiniGames.Puzzle.24point/TwentyFourGame.cs', piece: 'Card', list: '_pieces' },
];

for (const { file, piece, list } of files) {
  const fullPath = path.join(root, file);
  let content = fs.readFileSync(fullPath, 'utf8');
  content = addPieces(content, piece, list);
  
  // Fix 24point namespace (number-only identifier is invalid)
  if (file.includes('24point')) {
    content = content.replace(
      'namespace MiniGames.Puzzle.24point;',
      'namespace MiniGames.Puzzle.Puzzle24;'
    );
  }
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Fixed: ${file}`);
}

console.log('All done!');
