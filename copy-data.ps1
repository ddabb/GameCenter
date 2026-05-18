$games = @('akari','battleship','nonogram','nurikabe','slither-link','sokoban','tents','number-one')
$src = 'F:\SelfJob\FreeToolsPuzzle\data'
$dst = 'F:\SelfJob\Puzzle\SolvePuzzle\data'

foreach ($g in $games) {
    $s = "$src\$g"
    $d = "$dst\$g"
    if (Test-Path $s) {
        New-Item -Path $d -ItemType Directory -Force | Out-Null
        Copy-Item -Path "$s\*" -Destination $d -Recurse -Force
        $size = (Get-ChildItem $d -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "$g : OK ($(($size).ToString('0.00')) MB)"
    } else {
        Write-Host "$g : source not found"
    }
}

Write-Host "Done!"