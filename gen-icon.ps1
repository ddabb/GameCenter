Add-Type -AssemblyName System.Drawing

$size = 600

$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

$graphics.Clear([System.Drawing.Color]::FromArgb(30, 35, 50))

$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 45, 65))
$graphics.FillEllipse($bgBrush, 25, 25, 550, 550)

$cellSize = 70
$gap = 8
$cols = 6
$rows = 6
$gridW = $cols * $cellSize + ($cols - 1) * $gap
$gridH = $rows * $cellSize + ($rows - 1) * $gap
$startX = [int](($size - $gridW) / 2)
$startY = [int](($size - $gridH) / 2)

$blue = [System.Drawing.Color]::FromArgb(66, 165, 245)
$cyan = [System.Drawing.Color]::FromArgb(0, 188, 212)
$purple = [System.Drawing.Color]::FromArgb(171, 71, 188)
$orange = [System.Drawing.Color]::FromArgb(255, 152, 0)
$green = [System.Drawing.Color]::FromArgb(102, 187, 106)
$pink = [System.Drawing.Color]::FromArgb(244, 143, 177)

$palette = @($blue, $cyan, $purple, $orange, $green, $pink)

$pattern = @(
    @(0,1,0,0,1,0),
    @(1,0,0,1,0,1),
    @(0,0,1,0,0,0),
    @(0,1,0,0,1,0),
    @(1,0,0,1,0,1),
    @(0,0,1,0,0,0)
)

for ($r = 0; $r -lt $rows; $r++) {
    for ($c = 0; $c -lt $cols; $c++) {
        $x = $startX + $c * ($cellSize + $gap)
        $y = $startY + $r * ($cellSize + $gap)
        $color = $palette[$c % 6]
        $filled = $pattern[$r][$c] -eq 1

        $rect = New-Object System.Drawing.Rectangle($x, $y, $cellSize, $cellSize)
        $brush = New-Object System.Drawing.SolidBrush($color)

        if ($filled) {
            $graphics.FillRectangle($brush, $rect)
        } else {
            $pen = New-Object System.Drawing.Pen($color, 3)
            $graphics.DrawRectangle($pen, $rect)
            $pen.Dispose()
        }
        $brush.Dispose()
    }
}

$graphics.Dispose()

$outPath = "F:\SelfJob\Puzzle\SolvePuzzle\icon.png"
$bitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

Write-Host "OK: $outPath"