param([switch]$RemoveDependencies)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (!(Test-Path -LiteralPath (Join-Path $projectRoot 'server.mjs')) -or
    !(Test-Path -LiteralPath (Join-Path $projectRoot 'out/signs.html'))) {
    throw 'A working offline build must exist before cleanup.'
}
$names = @('.next', '.next-webpack', 'tsconfig.tsbuildinfo')
if ($RemoveDependencies) { $names += 'node_modules' }
foreach ($name in $names) {
    $target = [IO.Path]::GetFullPath((Join-Path $projectRoot $name))
    if ([IO.Path]::GetDirectoryName($target) -ne $projectRoot) {
        throw "Refusing to clean a path outside the project: $target"
    }
    if (Test-Path -LiteralPath $target) {
        Write-Host "Removing generated files: $name"
        Remove-Item -LiteralPath $target -Recurse -Force
    }
}
