$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $projectRoot
if (!(Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required.' }
$pnpmArgs = @()
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $runner = 'pnpm'
} elseif (Get-Command corepack -ErrorAction SilentlyContinue) {
    $runner = 'corepack'
    $pnpmArgs = @('pnpm')
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
    $runner = 'npx'
    $pnpmArgs = @('--yes', 'pnpm@10')
} else { throw 'pnpm, Corepack or npx is required to rebuild.' }

& $runner @pnpmArgs install --frozen-lockfile --prefer-offline
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
& $runner @pnpmArgs run lint
if ($LASTEXITCODE -ne 0) { throw 'Code checks failed.' }
& $runner @pnpmArgs run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed. Generated files were retained for diagnosis.' }
& node --test tests/server.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'Offline server checks failed.' }
& (Join-Path $PSScriptRoot 'clean.ps1') -RemoveDependencies
Write-Host 'Offline build is ready. Development dependencies and caches have been removed.'
