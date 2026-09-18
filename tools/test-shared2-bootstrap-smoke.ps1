[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Stop-Smoke([string]$Message) {
    throw ('Shared 2 bootstrap smoke failed: ' + $Message)
}

function Assert-Smoke([bool]$Condition, [string]$Message) {
    if (-not $Condition) { Stop-Smoke $Message }
}

function Read-Lock([string]$Path) {
    Assert-Smoke (Test-Path -LiteralPath $Path -PathType Leaf) 'Shared lock is missing'
    $bytes = [IO.File]::ReadAllBytes($Path)
    Assert-Smoke ($bytes.Length -gt 0) 'Shared lock is empty'
    Assert-Smoke (-not ($bytes.Length -ge 3 -and $bytes[0] -eq 0xef -and $bytes[1] -eq 0xbb -and $bytes[2] -eq 0xbf)) 'Shared lock must be UTF-8 without BOM'
    try {
        $strictUtf8 = New-Object System.Text.UTF8Encoding($false, $true)
        $text = $strictUtf8.GetString($bytes)
    } catch { Stop-Smoke 'Shared lock is not valid UTF-8' }
    $fields = [ordered]@{}
    foreach ($line in @($text -split "`n")) {
        $line = $line.TrimEnd("`r")
        if ($line -eq '') { continue }
        $match = [regex]::Match($line, '^(?<key>[a-z][a-z0-9_]*)\s*:\s*(?<value>[^\r\n]+)$')
        if (-not $match.Success) { Stop-Smoke 'Shared lock contains an ambiguous line' }
        $key = $match.Groups['key'].Value
        if ($fields.Contains($key)) { Stop-Smoke ('Shared lock repeats key: ' + $key) }
        $fields[$key] = $match.Groups['value'].Value.Trim()
    }
    $expectedKeys = @('schema_version','source_repository','source_version','source_commit')
    Assert-Smoke ((@($fields.Keys | ForEach-Object { [string]$_ } | Sort-Object) -join '|') -ceq ((@($expectedKeys | Sort-Object)) -join '|')) 'Shared lock schema-2 fields are not exact'
    Assert-Smoke ([string]$fields.schema_version -ceq '2') 'Shared lock schema_version is not 2'
    Assert-Smoke ([string]$fields.source_repository -ceq 'Osato-Gasu/shared') 'Shared lock source repository is invalid'
    $versionMatch = [regex]::Match([string]$fields.source_version, '\A(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\z')
    Assert-Smoke $versionMatch.Success 'Shared lock source version is not released numeric semver'
    try { $major = [int64]$versionMatch.Groups[1].Value } catch { Stop-Smoke 'Shared lock source version is out of range' }
    Assert-Smoke ($major -ge 2) 'Shared lock source version is outside Shared 2.x-or-later policy'
    Assert-Smoke ([regex]::IsMatch([string]$fields.source_commit, '\A[0-9a-fA-F]{40}\z')) 'Shared lock source commit is not a full SHA-1'
    Assert-Smoke (-not [regex]::IsMatch([string]$fields.source_commit, '\A0{40}\z')) 'Shared lock source commit is the null SHA'
    Assert-Smoke ([string]$fields.source_commit -ceq ([string]$fields.source_commit).ToLowerInvariant()) 'Shared lock source commit is not canonical lowercase'
    return [pscustomobject]@{
        Schema = [string]$fields.schema_version
        Repository = [string]$fields.source_repository
        Version = [string]$fields.source_version
        Commit = ([string]$fields.source_commit).ToLowerInvariant()
    }
}

function Get-EnvironmentIdentity {
    $values = @{
        Repository = [Environment]::GetEnvironmentVariable('SHARED_SYNC_SOURCE_REPOSITORY')
        Version = [Environment]::GetEnvironmentVariable('SHARED_SYNC_SOURCE_VERSION')
        Commit = [Environment]::GetEnvironmentVariable('SHARED_SYNC_SOURCE_COMMIT')
    }
    $present = 0
    foreach ($value in $values.Values) { if ($null -ne $value) { $present++ } }
    if ($present -eq 0) { return $null }
    Assert-Smoke ($present -eq 3) 'Shared identity environment must contain all three values or none'
    Assert-Smoke ([string]$values.Repository -ceq 'Osato-Gasu/shared') 'Shared identity environment repository is invalid'
    $versionMatch = [regex]::Match([string]$values.Version, '\A(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\z')
    Assert-Smoke $versionMatch.Success 'Shared identity environment version is not released numeric semver'
    try { $major = [int64]$versionMatch.Groups[1].Value } catch { Stop-Smoke 'Shared identity environment version is out of range' }
    Assert-Smoke ($major -ge 2) 'Shared identity environment version is outside Shared 2.x-or-later policy'
    Assert-Smoke ([regex]::IsMatch([string]$values.Commit, '\A[0-9a-fA-F]{40}\z')) 'Shared identity environment commit is not a full SHA-1'
    Assert-Smoke (-not [regex]::IsMatch([string]$values.Commit, '\A0{40}\z')) 'Shared identity environment commit is the null SHA'
    return [pscustomobject]@{
        Repository = [string]$values.Repository
        Version = [string]$values.Version
        Commit = ([string]$values.Commit).ToLowerInvariant()
    }
}

function Assert-RelativeProjectPath([string]$Path, [string]$Name) {
    Assert-Smoke (-not [string]::IsNullOrWhiteSpace($Path)) ($Name + ' is empty')
    Assert-Smoke (-not [IO.Path]::IsPathRooted($Path)) ($Name + ' must be relative')
    Assert-Smoke (-not $Path.Contains('..')) ($Name + ' must not escape the Project root')
    Assert-Smoke (-not $Path.Contains(':')) ($Name + ' contains a drive designator')
    return $Path.Replace('/', [IO.Path]::DirectorySeparatorChar)
}

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$lockPath = Join-Path $root 'docs/ai/SHARED_RULES.lock.yml'
$lock = Read-Lock $lockPath
$environmentIdentity = Get-EnvironmentIdentity
if ($null -ne $environmentIdentity) {
    Assert-Smoke ($environmentIdentity.Repository -ceq $lock.Repository) 'smoke target repository does not match the lock'
    Assert-Smoke ($environmentIdentity.Version -ceq $lock.Version) 'smoke target version does not match the lock'
    Assert-Smoke ($environmentIdentity.Commit -ceq $lock.Commit) 'smoke target commit does not match the lock'
}

$agentsPath = Join-Path $root 'AGENTS.md'
$projectPath = Join-Path $root 'docs/ai/PROJECT.md'
$adapterPath = Join-Path $root 'docs/ai/PROJECT_ADAPTER.psd1'
Assert-Smoke (Test-Path -LiteralPath $agentsPath -PathType Leaf) 'Project AGENTS.md is missing'
Assert-Smoke (Test-Path -LiteralPath $projectPath -PathType Leaf) 'Project.md is missing'
$agents = [IO.File]::ReadAllText($agentsPath)
$project = [IO.File]::ReadAllText($projectPath)
Assert-Smoke ($agents.Contains('Personal Finance Planner bootstrap') -and $agents.Contains('Shared')) 'Project bootstrap is not the Shared 2 bootstrap'
Assert-Smoke ($project.Contains('monetary calculations') -and $project.Contains('effective rule periods') -and $project.Contains('double counting') -and $project.Contains('data preservation')) 'financial safety owner is incomplete'

try { $adapter = Import-PowerShellDataFile -LiteralPath $adapterPath } catch { Stop-Smoke ('Project adapter cannot be parsed: ' + $_.Exception.Message) }
$adapterKeys = @($adapter.Keys | ForEach-Object { [string]$_ } | Sort-Object)
Assert-Smoke ((@($adapterKeys) -join '|') -ceq 'CI|Commands|Paths|SchemaVersion|SharedSync') 'Project adapter root fields are not schema 2'
Assert-Smoke ([int]$adapter.SchemaVersion -eq 2) 'Project adapter schema is not 2'
Assert-Smoke ([string]$adapter.Paths.TaskHtml -ceq 'docs/ai/TASKS.html') 'Project adapter TaskHtml path is invalid'
$taskHtmlPath = Join-Path $root (Assert-RelativeProjectPath ([string]$adapter.Paths.TaskHtml) 'Paths.TaskHtml')
Assert-Smoke (Test-Path -LiteralPath $taskHtmlPath -PathType Leaf) 'Project TASK HTML is missing'
$taskHtml = [IO.File]::ReadAllText($taskHtmlPath)
Assert-Smoke ($taskHtml.Contains('TASK-001') -and $taskHtml.Contains('TASK-020')) 'Project TASK HTML does not cover the required TASK range'
$generatorPath = Join-Path $root 'tools/update-task-html.ps1'
Assert-Smoke (Test-Path -LiteralPath $generatorPath -PathType Leaf) 'TASK HTML generator is missing'
$generatorOutput = @(& $generatorPath -ProjectRoot $root -Check 2>&1)
if ($LASTEXITCODE -ne 0) { Stop-Smoke ('TASK HTML freshness check failed: ' + (($generatorOutput | ForEach-Object { [string]$_ }) -join "`n")) }
Assert-Smoke ($generatorOutput -join "`n" -match 'TASK HTML is current') 'TASK HTML freshness check did not confirm current output'
Assert-Smoke ([string]$adapter.Commands.TaskHtmlUpdate -match 'tools/update-task-html\.ps1') 'Task HTML update command is missing'
Assert-Smoke ([string]$adapter.Commands.TaskHtmlCheck -match 'tools/update-task-html\.ps1' -and [string]$adapter.Commands.TaskHtmlCheck -match '(^|\s)-Check(\s|$)') 'Task HTML check command is missing'

$sync = $adapter.SharedSync
$syncKeys = @($sync.Keys | ForEach-Object { [string]$_ } | Sort-Object)
Assert-Smoke ((@($syncKeys) -join '|') -ceq 'AllowedPaths|ApplyScript|AutoIntegrate|Enabled|LockPath|SharedSyncCiMode|SmokeScripts') 'SharedSync fields are not exact'
Assert-Smoke ($sync.Enabled -is [bool] -and [bool]$sync.Enabled) 'SharedSync is not enabled'
Assert-Smoke ($sync.AutoIntegrate -is [bool] -and [bool]$sync.AutoIntegrate) 'SharedSync automatic integration is not enabled'
Assert-Smoke ([string]$sync.LockPath -ceq 'docs/ai/SHARED_RULES.lock.yml') 'SharedSync lock path is invalid'
Assert-Smoke ([string]$sync.ApplyScript -ceq 'tools/update-shared-reference.ps1') 'SharedSync apply hook is invalid'
Assert-Smoke (@($sync.SmokeScripts).Count -eq 1 -and [string]$sync.SmokeScripts[0] -ceq 'tools/test-shared2-bootstrap-smoke.ps1') 'SharedSync smoke hook is invalid'
Assert-Smoke (@($sync.AllowedPaths).Count -eq 1 -and [string]$sync.AllowedPaths[0] -ceq 'docs/ai/SHARED_RULES.lock.yml') 'SharedSync allowlist is not lock-only'
Assert-Smoke ([string]$sync.SharedSyncCiMode -ceq 'none') 'SharedSync CI mode is not none'

$ci = $adapter.CI
Assert-Smoke ([string]$ci.ReleasedMainGate -ceq 'identity_only') 'Released main gate is not identity_only'
Assert-Smoke (@($ci.NonePathGlobs).Count -eq 1 -and [string]$ci.NonePathGlobs[0] -ceq 'docs/ai/SHARED_RULES.lock.yml') 'CI none path policy is not lock-only'
Assert-Smoke (@($ci.ExtendedPathGlobs) -contains '.github/workflows/**') 'CI governance workflow path is not extended'
Assert-Smoke (@($ci.ExtendedPathGlobs) -contains 'tools/**') 'CI Project tool path is not extended'

Write-Output 'Shared 2 bootstrap smoke passed.'
