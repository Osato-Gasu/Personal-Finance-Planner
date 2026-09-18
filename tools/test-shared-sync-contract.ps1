[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$hookSource = Join-Path $root 'tools/update-shared-reference.ps1'
$smokeSource = Join-Path $root 'tools/test-shared2-bootstrap-smoke.ps1'
if ($PSVersionTable.PSVersion.Major -ge 6) { $powershell = Get-Command pwsh -ErrorAction SilentlyContinue }
else { $powershell = Get-Command powershell -ErrorAction SilentlyContinue }
if ($null -eq $powershell) { $powershell = Get-Command pwsh -ErrorAction SilentlyContinue }
if ($null -eq $powershell) { throw 'No PowerShell host is available for SharedSync contract fixtures.' }
$tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([char]92,[char]47) + [IO.Path]::DirectorySeparatorChar
$tempRoots = New-Object 'Collections.Generic.List[string]'
$checks = 0

function Assert-Contract([bool]$Condition, [string]$Name) {
    if (-not $Condition) { throw ('SharedSync contract test failed: ' + $Name) }
    $script:checks++
}

function Write-Utf8([string]$Path, [string]$Text) {
    $parent = Split-Path -Parent $Path
    if ($parent) { [IO.Directory]::CreateDirectory($parent) | Out-Null }
    [IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}

function New-Fixture {
    $fixture = Join-Path ([IO.Path]::GetTempPath()) ('pfp-shared-sync-' + [guid]::NewGuid().ToString('N'))
    [IO.Directory]::CreateDirectory($fixture) | Out-Null
    $script:tempRoots.Add($fixture)
    [IO.Directory]::CreateDirectory((Join-Path $fixture 'tools')) | Out-Null
    foreach ($relative in @('AGENTS.md','docs/ai/PROJECT.md','docs/ai/PROJECT_ADAPTER.psd1','docs/ai/TASKS.html')) {
        $destination = Join-Path $fixture $relative
        [IO.Directory]::CreateDirectory((Split-Path -Parent $destination)) | Out-Null
        Copy-Item -LiteralPath (Join-Path $root $relative) -Destination $destination -Force
    }
    Copy-Item -LiteralPath $hookSource -Destination (Join-Path $fixture 'tools/update-shared-reference.ps1') -Force
    Copy-Item -LiteralPath $smokeSource -Destination (Join-Path $fixture 'tools/test-shared2-bootstrap-smoke.ps1') -Force
    Copy-Item -LiteralPath (Join-Path $root 'tools/update-task-html.ps1') -Destination (Join-Path $fixture 'tools/update-task-html.ps1') -Force
    if (Test-Path -LiteralPath (Join-Path $root 'docs/ai/tasks') -PathType Container) {
        Copy-Item -LiteralPath (Join-Path $root 'docs/ai/tasks') -Destination (Join-Path $fixture 'docs/ai/tasks') -Recurse -Force
    }
    if (Test-Path -LiteralPath (Join-Path $root 'docs/ai/LEGACY_TASK_INVENTORY.json') -PathType Leaf) {
        Copy-Item -LiteralPath (Join-Path $root 'docs/ai/LEGACY_TASK_INVENTORY.json') -Destination (Join-Path $fixture 'docs/ai/LEGACY_TASK_INVENTORY.json') -Force
    }
    Write-Utf8 (Join-Path $fixture 'keep.txt') 'user-owned sentinel`n'
    Write-Utf8 (Join-Path $fixture 'docs/ai/SHARED_RULES.lock.yml') @"
schema_version: 2
source_repository: Osato-Gasu/shared
source_version: 2.0.5
source_commit: 0000000000000000000000000000000000000000
"@
    return $fixture
}

function Invoke-FixtureScript([string]$Fixture, [string]$RelativeScript, [hashtable]$Identity) {
    $names = @('SHARED_SYNC_SOURCE_REPOSITORY','SHARED_SYNC_SOURCE_VERSION','SHARED_SYNC_SOURCE_COMMIT')
    $old = @{}
    foreach ($name in $names) {
        $old[$name] = if (Test-Path -LiteralPath ('Env:' + $name)) { (Get-Item -LiteralPath ('Env:' + $name)).Value } else { $null }
    }
    try {
        foreach ($name in $names) { Remove-Item -LiteralPath ('Env:' + $name) -ErrorAction SilentlyContinue }
        if ($null -ne $Identity) {
            if ($null -ne $Identity.Repository) { Set-Item -LiteralPath Env:SHARED_SYNC_SOURCE_REPOSITORY -Value ([string]$Identity.Repository) }
            if ($null -ne $Identity.Version) { Set-Item -LiteralPath Env:SHARED_SYNC_SOURCE_VERSION -Value ([string]$Identity.Version) }
            if ($null -ne $Identity.Commit) { Set-Item -LiteralPath Env:SHARED_SYNC_SOURCE_COMMIT -Value ([string]$Identity.Commit) }
        }
        $scriptPath = Join-Path $Fixture $RelativeScript
        Push-Location $Fixture
        try {
            $previousErrorAction = $ErrorActionPreference
            try {
                $ErrorActionPreference = 'Continue'
                $output = @(& $powershell.Source -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $scriptPath 2>&1)
                $code = $LASTEXITCODE
            } finally { $ErrorActionPreference = $previousErrorAction }
        } finally { Pop-Location }
        return [pscustomobject]@{ Code = $code; Output = (($output | ForEach-Object { [string]$_ }) -join "`n") }
    } finally {
        foreach ($name in $names) {
            Remove-Item -LiteralPath ('Env:' + $name) -ErrorAction SilentlyContinue
            if ($null -ne $old[$name]) { Set-Item -LiteralPath ('Env:' + $name) -Value ([string]$old[$name]) }
        }
    }
}

function Get-Bytes([string]$Path) { return [IO.File]::ReadAllBytes($Path) }
function Same-Bytes([byte[]]$Left, [byte[]]$Right) {
    if ($Left.Length -ne $Right.Length) { return $false }
    for ($i = 0; $i -lt $Left.Length; $i++) { if ($Left[$i] -ne $Right[$i]) { return $false } }
    return $true
}

try {
    # A released future Shared identity is supplied only by the three env values.
    $fixture = New-Fixture
    $identity = @{
        Repository = 'Osato-Gasu/shared'
        Version = '2.0.7'
        Commit = ('a' * 40)
    }
    $result = Invoke-FixtureScript $fixture 'tools/update-shared-reference.ps1' $identity
    Assert-Contract ($result.Code -eq 0) 'valid future released identity applies'
    $lockPath = Join-Path $fixture 'docs/ai/SHARED_RULES.lock.yml'
    $lock = [IO.File]::ReadAllText($lockPath)
    Assert-Contract ($lock -ceq "schema_version: 2`nsource_repository: Osato-Gasu/shared`nsource_version: 2.0.7`nsource_commit: $($identity.Commit)`n") 'applied lock is exact'
    Assert-Contract (([IO.File]::ReadAllText((Join-Path $fixture 'keep.txt'))) -ceq 'user-owned sentinel`n') 'apply hook preserves user file'
    Assert-Contract (@(Get-ChildItem -LiteralPath $fixture -Recurse -Force -File | Where-Object { $_.Name -like '*.tmp' }).Count -eq 0) 'apply hook leaves no temporary file'
    $result = Invoke-FixtureScript $fixture 'tools/test-shared2-bootstrap-smoke.ps1' $identity
    Assert-Contract ($result.Code -eq 0) 'smoke accepts exact env target'
    $result = Invoke-FixtureScript $fixture 'tools/test-shared2-bootstrap-smoke.ps1' $null
    Assert-Contract ($result.Code -eq 0) 'smoke defaults to current lock without env'
    $htmlPath = Join-Path $fixture 'docs/ai/TASKS.html'
    $currentHtml = [IO.File]::ReadAllText($htmlPath)
    Write-Utf8 $htmlPath '<html><body>stale fixture</body></html>`n'
    $result = Invoke-FixtureScript $fixture 'tools/test-shared2-bootstrap-smoke.ps1' $identity
    Assert-Contract ($result.Code -ne 0) 'smoke rejects stale TASK HTML'
    Write-Utf8 $htmlPath $currentHtml

    # Every rejected input must fail before changing the lock.
    $negativeCases = @(
        @{ Name = 'wrong repository'; Identity = @{ Repository='Osato-Gasu/not-shared'; Version='2.0.8'; Commit=('b' * 40) } }
        @{ Name = 'unsupported major'; Identity = @{ Repository='Osato-Gasu/shared'; Version='1.9.9'; Commit=('b' * 40) } }
        @{ Name = 'malformed version'; Identity = @{ Repository='Osato-Gasu/shared'; Version=('2.0.8' + "`n"); Commit=('b' * 40) } }
        @{ Name = 'malformed SHA'; Identity = @{ Repository='Osato-Gasu/shared'; Version='2.0.8'; Commit=('b' * 39) } }
        @{ Name = 'null SHA'; Identity = @{ Repository='Osato-Gasu/shared'; Version='2.0.8'; Commit=('0' * 40) } }
        @{ Name = 'trailing control in SHA'; Identity = @{ Repository='Osato-Gasu/shared'; Version='2.0.8'; Commit=(('b' * 40) + "`n") } }
        @{ Name = 'partial env'; Identity = @{ Repository='Osato-Gasu/shared'; Version=$null; Commit=$null } }
    )
    foreach ($case in $negativeCases) {
        $before = Get-Bytes $lockPath
        $result = Invoke-FixtureScript $fixture 'tools/update-shared-reference.ps1' $case.Identity
        Assert-Contract ($result.Code -ne 0) ($case.Name + ' is rejected')
        Assert-Contract (Same-Bytes $before (Get-Bytes $lockPath)) ($case.Name + ' is rejected before write')
    }

    # Smoke refuses a well-formed but different target and accepts canonicalized SHA case.
    $mismatch = @{ Repository='Osato-Gasu/shared'; Version='2.0.8'; Commit=('c' * 40) }
    $result = Invoke-FixtureScript $fixture 'tools/test-shared2-bootstrap-smoke.ps1' $mismatch
    Assert-Contract ($result.Code -ne 0) 'smoke rejects target mismatch'
    $upper = @{ Repository='Osato-Gasu/shared'; Version='2.0.7'; Commit=(('a' * 40).ToUpperInvariant()) }
    $result = Invoke-FixtureScript $fixture 'tools/test-shared2-bootstrap-smoke.ps1' $upper
    Assert-Contract ($result.Code -eq 0) 'smoke canonicalizes upper-case full SHA'

    Write-Output ("SharedSync contract tests passed: $checks checks.")
} finally {
    foreach ($path in $tempRoots) {
        $resolved = [IO.Path]::GetFullPath($path)
        $leaf = Split-Path -Leaf $resolved
        if (-not $resolved.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase) -or
            $leaf -notmatch '^pfp-shared-sync-[0-9a-f]{32}$') {
            throw ('Refusing to clean an unexpected SharedSync fixture path: ' + $resolved)
        }
        if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction SilentlyContinue }
    }
}
