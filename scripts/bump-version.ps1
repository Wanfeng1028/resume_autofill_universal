param(
  [Parameter(Mandatory = $true)]
  [string]$Version
)

$path = Join-Path $PSScriptRoot '..\resume-autofill-universal.user.js'
$content = Get-Content $path -Raw
$content = [regex]::Replace($content, '(?m)^// @version\s+.+$', "// @version      $Version")
$content = [regex]::Replace($content, "const VERSION = '[^']+';", "const VERSION = '$Version';")
Set-Content -Path $path -Value $content -Encoding UTF8
Write-Output "VERSION_UPDATED $Version"
