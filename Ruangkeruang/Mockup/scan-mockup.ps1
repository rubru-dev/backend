param(
  [int]$Port = 4173,
  [string]$Output = "slop-report.json"
)

$ErrorActionPreference = "Stop"
$server = $null

try {
  $server = Start-Process -FilePath "npx.cmd" -ArgumentList "--yes http-server -p $Port -c-1" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
  Start-Sleep -Seconds 3

  $urls = @(
    "http://127.0.0.1:$Port/homepage/code.html",
    "http://127.0.0.1:$Port/interior/code.html",
    "http://127.0.0.1:$Port/eksterior/code.html",
    "http://127.0.0.1:$Port/portofolio/code.html",
    "http://127.0.0.1:$Port/portofolio-detail/code.html",
    "http://127.0.0.1:$Port/cara-pemesanan/code.html",
    "http://127.0.0.1:$Port/kontak/code.html"
  )

  & npx.cmd --yes slop-detect @urls --axes all --json | Out-File -LiteralPath (Join-Path $PSScriptRoot $Output) -Encoding utf8
  Write-Output "Report saved to $Output"
}
finally {
  if ($server) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
}
