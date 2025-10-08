# Exports icon.svg to 16x16, 48x48, 128x128 PNGs.
# Requires ImageMagick (magick) or Inkscape on PATH.
param()
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $here
if (Get-Command magick -ErrorAction SilentlyContinue) {
    magick icon.svg -resize 16x16 icon16.png
    magick icon.svg -resize 48x48 icon48.png
    magick icon.svg -resize 128x128 icon128.png
    Write-Host "Exported using ImageMagick"
} elseif (Get-Command inkscape -ErrorAction SilentlyContinue) {
    inkscape icon.svg --export-type=png --export-filename=icon128.png --export-width=128 --export-height=128
    inkscape icon.svg --export-type=png --export-filename=icon48.png --export-width=48 --export-height=48
    inkscape icon.svg --export-type=png --export-filename=icon16.png --export-width=16 --export-height=16
    Write-Host "Exported using Inkscape"
} else {
    Write-Host "Neither ImageMagick (magick) nor Inkscape found on PATH. Please install one to generate PNG icons." -ForegroundColor Yellow
}
Pop-Location
