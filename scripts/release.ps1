param(
  [string]$Output = 'resume-autofill-universal.zip'
)

$root = Join-Path $PSScriptRoot '..'
$scriptPath = Join-Path $root 'resume-autofill-universal.user.js'
$readmePath = Join-Path $root 'README.md'
$testingPath = Join-Path $root 'TESTING.md'
$gitignorePath = Join-Path $root '.gitignore'
$outPath = Join-Path $root $Output

node --check $scriptPath
if ($LASTEXITCODE -ne 0) {
  throw 'Syntax check failed.'
}

Compress-Archive -Path $scriptPath, $readmePath, $testingPath, $gitignorePath -DestinationPath $outPath -Force
Write-Output "RELEASE_READY $outPath"
