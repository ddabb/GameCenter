namespace GameCenter.Game.Solvers;

using GameCenter.Game.Core;

/// <summary>
/// BFS 求华容道最优解
/// </summary>
public class BFSFinder
{
    public List<string> Solve(GameCenter.Game.KlotskiGameEngine engine)
    {
        var visited = new HashSet<string>();
        var queue = new Queue<(GameCenter.Game.KlotskiGameEngine state, List<string> moves)>();
        
        var initialKey = engine.GetStateKey();
        visited.Add(initialKey);
        queue.Enqueue((CloneEngine(engine), new List<string>()));
        
        while (queue.Count > 0)
        {
            var (current, moves) = queue.Dequeue();
            
            if (current.IsSolved())
                return moves;
            
            foreach (var piece in current.Pieces)
            {
                foreach (var dir in new[] { Direction.Up, Direction.Down, Direction.Left, Direction.Right })
                {
                    var cloned = CloneEngine(current);
                    var targetPiece = cloned.Pieces.First(p => p.Name == piece.Name);
                    
                    if (cloned.TryMove(targetPiece, dir))
                    {
                        string key = cloned.GetStateKey();
                        if (!visited.Contains(key))
                        {
                            visited.Add(key);
                            var newMoves = new List<string>(moves) { $"{piece.Name}→{dir}" };
                            queue.Enqueue((cloned, newMoves));
                        }
                    }
                }
            }
        }
        
        return new List<string> { "无解" };
    }
    
    private static GameCenter.Game.KlotskiGameEngine CloneEngine(GameCenter.Game.KlotskiGameEngine e)
    {
        var clone = new GameCenter.Game.KlotskiGameEngine();
        
        // 深拷贝棋子列表，保留原始名称和类型
        var pieces = new List<Piece>();
        Piece? caoCao = null;
        
        foreach (var p in e.Pieces)
        {
            var newPiece = new Piece(p.Name, p.Type, p.Row, p.Col);
            pieces.Add(newPiece);
            if (p.Type == PieceType.CaoCao) caoCao = newPiece;
        }
        
        clone.Pieces = pieces;
        clone.CaoCao = caoCao;
        return clone;
    }
}