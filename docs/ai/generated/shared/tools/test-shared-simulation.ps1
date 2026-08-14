# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.24
# source commit: 34d9727fbc3ed8fe7dfa39c91ca6683b11dc04fb
# 直接編集禁止

[CmdletBinding()]
param([switch]$SkipFreshCloneGate)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'import-adapter.ps1')
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$results = [Collections.Generic.List[string]]::new()
$utf8NoBom = [Text.UTF8Encoding]::new($false)
$utf8Bom = [Text.UTF8Encoding]::new($true)
$strictUtf8NoBom = [Text.UTF8Encoding]::new($false, $true)
function Resolve-SharedPowerShellExe {
    param(
        [string]$EditionOverride,
        [string]$ProcessPathOverride,
        [string]$HostHomeOverride,
        [switch]$NoPathLookup
    )
    $edition = if ([string]::IsNullOrWhiteSpace($EditionOverride)) {
        if ([string]::IsNullOrWhiteSpace($PSVersionTable.PSEdition)) { 'Desktop' } else { $PSVersionTable.PSEdition }
    } else {
        $EditionOverride
    }
    if ($edition -ne 'Desktop' -and $edition -ne 'Core') { throw "Cannot resolve PowerShell host: unsupported PSEdition=$edition" }

    $attempted = [Collections.Generic.List[string]]::new()

    $processCandidate = if ([string]::IsNullOrWhiteSpace($ProcessPathOverride)) {
        try {
            [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
        } catch {
            $null
        }
    } else {
        $ProcessPathOverride
    }
    if (-not [string]::IsNullOrWhiteSpace($processCandidate)) {
        $attempted.Add($processCandidate)
        $processName = [IO.Path]::GetFileName($processCandidate).ToLowerInvariant()
        $allowedProcessName = if ($edition -eq 'Core') { @('pwsh.exe', 'pwsh') } else { @('powershell.exe') }
        if (($allowedProcessName -contains $processName) -and [IO.Path]::IsPathRooted($processCandidate) -and (Test-Path -LiteralPath $processCandidate -PathType Leaf)) {
            return [IO.Path]::GetFullPath($processCandidate)
        }
    }

    $hostNames = if ($edition -eq 'Core') { @('pwsh.exe', 'pwsh') } else { @('powershell.exe') }
    $hostHome = if ([string]::IsNullOrWhiteSpace($HostHomeOverride)) { $PSHOME } else { $HostHomeOverride }
    foreach ($name in $hostNames) {
        $psHomeCandidate = Join-Path $hostHome $name
        $attempted.Add($psHomeCandidate)
        if (Test-Path -LiteralPath $psHomeCandidate -PathType Leaf) {
            return [IO.Path]::GetFullPath($psHomeCandidate)
        }
    }
    if (-not $NoPathLookup) {
        foreach ($name in $hostNames) {
            $pathResolved = (Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source)
            if (-not [string]::IsNullOrWhiteSpace($pathResolved)) {
                $attempted.Add($pathResolved)
                if (Test-Path -LiteralPath $pathResolved -PathType Leaf) { return [IO.Path]::GetFullPath($pathResolved) }
            }
        }
    }
    throw "Cannot resolve PowerShell host for PSEdition=$edition. Tried: $($attempted -join ', ')"
}

$powershellExe = Resolve-SharedPowerShellExe
function Assert([bool]$Condition, [string]$Name) {
    if (-not $Condition) { throw "Shared simulation failed: $Name" }
    $script:results.Add("PASS $Name")
}
function Invoke-Git([string]$WorkingRoot,[string[]]$Arguments,[string]$Name) {
    $output = @(& git -C $WorkingRoot @Arguments 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Shared simulation git failure: $Name`n$($output -join "`n")" }
    return ,([string[]]$output)
}
function New-TestRoot([string]$Name) {
    $path = Join-Path ([IO.Path]::GetTempPath()) ("task148-shared-$Name-" + [guid]::NewGuid().ToString('N'))
    [IO.Directory]::CreateDirectory($path) | Out-Null
    return $path
}
function Remove-TestRoot([string]$Path) {
    $resolved = [IO.Path]::GetFullPath($Path)
    $tempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $resolved.StartsWith($tempPrefix,[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($resolved) -notlike 'task148-shared-*') { throw "Unsafe simulation cleanup path: $resolved" }
    if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}
function Invoke-ScriptResult([string]$ScriptPath, [string[]]$Arguments) {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = @(& $powershellExe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    return [pscustomobject]@{ ExitCode=$exitCode; Output=($output -join "`n") }
}
function Capture-AdapterTextImport([string]$Text) {
    $tempRoot = New-TestRoot 'task148-shared-import-adapter-text'
    $eventId = "capture-adapter-text-$([guid]::NewGuid().ToString('N'))"
    $global:capturePath = $null
    $global:captureBytes = $null
    $state = [ordered]@{
        Parsed=$null
        Failed=$false
        Error=$null
        TemporaryPath=$null
        TemporaryBytes=$null
    }
    $originalTemp=[Environment]::GetEnvironmentVariable('TEMP','Process')
    $originalTmp=[Environment]::GetEnvironmentVariable('TMP','Process')
    $originalTmpDir=[Environment]::GetEnvironmentVariable('TMPDIR','Process')
    $watcher=$null
    try {
        [Environment]::SetEnvironmentVariable('TEMP',$tempRoot,'Process')
        [Environment]::SetEnvironmentVariable('TMP',$tempRoot,'Process')
        [Environment]::SetEnvironmentVariable('TMPDIR',$tempRoot,'Process')
        $watcher = New-Object IO.FileSystemWatcher $tempRoot,'shared-adapter-*.psd1'
        $watcher.EnableRaisingEvents = $true
        $subscription = Register-ObjectEvent -InputObject $watcher -EventName Created -SourceIdentifier $eventId -Action {
            $path=$Event.SourceEventArgs.FullPath
            try {
                for($i=0;$i -lt 50;$i++){
                    try {
                        $global:capturePath = $path
                        $global:captureBytes = [IO.File]::ReadAllBytes($path)
                        break
                    } catch {
                        Start-Sleep -Milliseconds 1
                    }
                }
            } catch {}
        } | Out-Null
        try { $state.Parsed = Import-AdapterText -Text $Text } catch { $state.Failed=$true; $state.Error = $_.Exception.Message }
        if($global:capturePath){
            $state.TemporaryPath = $global:capturePath
            $state.TemporaryBytes = $global:captureBytes
        } elseif(-not $state.Failed){
            $state.Error = 'temporary file event capture failed'
        }
        return [pscustomobject]$state
    } finally {
        if($subscription){ Unregister-Event -SourceIdentifier $eventId -ErrorAction SilentlyContinue; Remove-Event -SourceIdentifier $eventId -ErrorAction SilentlyContinue }
        if($watcher){ $watcher.Dispose() }
        [Environment]::SetEnvironmentVariable('TEMP',$originalTemp,'Process')
        [Environment]::SetEnvironmentVariable('TMP',$originalTmp,'Process')
        [Environment]::SetEnvironmentVariable('TMPDIR',$originalTmpDir,'Process')
        Remove-TestRoot $tempRoot
    }
}
function Initialize-ProjectSink([string]$ProjectRoot) {
    [IO.Directory]::CreateDirectory((Join-Path $ProjectRoot 'docs/ai/generated/shared')) | Out-Null
    [IO.File]::WriteAllText((Join-Path $ProjectRoot 'docs/ai/generated/shared/sentinel.txt'), "unchanged generated sentinel`n", $utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $ProjectRoot 'docs/ai/SHARED_RULES.lock.yml'), "unchanged lock sentinel`n", $utf8NoBom)
    $null = Invoke-Git $ProjectRoot @('init','-q') 'negative project init'
    $null = Invoke-Git $ProjectRoot @('config','core.autocrlf','false') 'negative project autocrlf'
    $null = Invoke-Git $ProjectRoot @('config','user.name','TASK-148 simulation') 'negative project user'
    $null = Invoke-Git $ProjectRoot @('config','user.email','task148@example.invalid') 'negative project email'
    $null = Invoke-Git $ProjectRoot @('add','-A') 'negative project add'
    $null = Invoke-Git $ProjectRoot @('commit','-q','-m','negative project sentinel') 'negative project commit'
}
function Reset-SharedFixture([string]$SourceRoot, [string]$Baseline, [string[]]$AssumedPaths) {
    foreach ($relative in @($AssumedPaths)) {
        if (-not [string]::IsNullOrWhiteSpace($relative)) { $null = Invoke-Git $SourceRoot @('update-index','--no-assume-unchanged','--',$relative) "clear assume-unchanged $relative" }
    }
    $null = Invoke-Git $SourceRoot @('clean','-fdq') 'negative source clean'
    $null = Invoke-Git $SourceRoot @('reset','--hard','-q',$Baseline) 'negative source reset'
}
function Update-ManifestSha([string]$SourceRoot, [string]$Relative) {
    $manifestPath = Join-Path $SourceRoot 'manifest.yml'
    $manifestText = [IO.File]::ReadAllText($manifestPath)
    $sha = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $SourceRoot $Relative)).Hash
    $escaped = [regex]::Escape($Relative.Replace('\','/'))
    $pattern = "(?ms)(^  - path:\s*$escaped\s*\r?\n    target:\s*\S+\s*\r?\n    sha256:\s*)[A-F0-9]{64}"
    $matches = [regex]::Matches($manifestText, $pattern)
    if ($matches.Count -ne 1) { throw "Manifest fixture entry is not unique: $Relative" }
    $updated = [regex]::Replace($manifestText, $pattern, { param($match) $match.Groups[1].Value + $sha })
    [IO.File]::WriteAllText($manifestPath, $updated, $utf8NoBom)
}
function Set-TextByteVariant([string]$Path, [string]$Variant) {
    $bytes = [IO.File]::ReadAllBytes($Path)
    $text = $strictUtf8NoBom.GetString($bytes)
    switch ($Variant) {
        'bom' { $changed = [byte[]](@(0xEF,0xBB,0xBF) + @($bytes)) }
        'crlf' { $changed = $utf8NoBom.GetBytes($text.Replace("`n", "`r`n")) }
        'no-final-lf' {
            if ($bytes.Length -eq 0 -or $bytes[$bytes.Length - 1] -ne 10) { throw "Fixture source lacks terminal LF: $Path" }
            $changed = New-Object byte[] ($bytes.Length - 1)
            [Array]::Copy($bytes, 0, $changed, 0, $changed.Length)
        }
        'multiple-final-lf' {
            $changed = New-Object byte[] ($bytes.Length + 1)
            [Array]::Copy($bytes, 0, $changed, 0, $bytes.Length)
            $changed[$changed.Length - 1] = 10
        }
        'nul-control' {
            if ($bytes.Length -eq 0 -or $bytes[$bytes.Length - 1] -ne 10) { throw "Fixture source lacks terminal LF: $Path" }
            $changed = New-Object byte[] ($bytes.Length + 1)
            [Array]::Copy($bytes, 0, $changed, 0, $bytes.Length - 1)
            $changed[$changed.Length - 2] = 0
            $changed[$changed.Length - 1] = 10
        }
        'c1-nel-control' {
            if ($bytes.Length -eq 0 -or $bytes[$bytes.Length - 1] -ne 10) { throw "Fixture source lacks terminal LF: $Path" }
            $changed = New-Object byte[] ($bytes.Length + 2)
            [Array]::Copy($bytes, 0, $changed, 0, $bytes.Length - 1)
            $changed[$changed.Length - 3] = 0xC2
            $changed[$changed.Length - 2] = 0x85
            $changed[$changed.Length - 1] = 10
        }
        default { throw "Unknown text byte variant: $Variant" }
    }
    [IO.File]::WriteAllBytes($Path, [byte[]]$changed)
}
function Commit-RawFixture([string]$SourceRoot, [string]$Relative, [bool]$ManifestAlsoChanged, [string]$Message) {
    if ($ManifestAlsoChanged) { $null = Invoke-Git $SourceRoot @('add','--','manifest.yml') "stage manifest for $Message" }
    $blob = (Invoke-Git $SourceRoot @('hash-object','-w','--no-filters','--',$Relative) "raw hash $Message")[-1].Trim()
    $null = Invoke-Git $SourceRoot @('update-index','--add','--cacheinfo','100644',$blob,$Relative) "raw index $Message"
    $null = Invoke-Git $SourceRoot @('commit','-q','-m',$Message) "raw commit $Message"
    $null = Invoke-Git $SourceRoot @('update-index','--assume-unchanged','--',$Relative) "assume raw $Message"
    $workingBlob = (Invoke-Git $SourceRoot @('hash-object','--no-filters','--',$Relative) "working raw $Message")[-1].Trim()
    $headBlob = (Invoke-Git $SourceRoot @('rev-parse',"HEAD:$($Relative.Replace('\','/'))") "HEAD raw $Message")[-1].Trim()
    if ($workingBlob -cne $headBlob) { throw "Raw fixture does not match HEAD: $Message" }
}
function Assert-SourceFailure([string]$SourceRoot, [string]$ProjectRoot, [string]$Name, [string]$ExpectedPattern) {
    $validator = Invoke-ScriptResult (Join-Path $SourceRoot 'tools/validate-shared.ps1') @()
    $sync = Invoke-ScriptResult (Join-Path $SourceRoot 'tools/sync-project.ps1') @('-ProjectRoot',$ProjectRoot,'-SharedRoot',$SourceRoot)
    $projectStatus = @(& git -C $ProjectRoot status --porcelain=v1 --untracked-files=all 2>$null)
    $validatorMatches = $validator.ExitCode -ne 0 -and $validator.Output -match $ExpectedPattern
    $syncMatches = $sync.ExitCode -ne 0 -and $sync.Output -match $ExpectedPattern
    if (-not $validatorMatches -or -not $syncMatches -or $projectStatus.Count -ne 0) {
        throw "Shared simulation failed: $Name`nvalidator($($validator.ExitCode)): $($validator.Output)`nsync($($sync.ExitCode)): $($sync.Output)`nproject status: $($projectStatus -join '; ')"
    }
    $script:results.Add("PASS $Name")
}
function Set-FixtureAdapterTaskHistory([string]$ProjectRoot,[string]$Policy,[string]$StatesText) {
    $path=Join-Path $ProjectRoot 'docs/ai/PROJECT_ADAPTER.psd1'
    $text=[IO.File]::ReadAllText($path)
    $replacement="TaskHistory = @{`n        CompletedTaskFilePolicy = '$Policy'`n        RetainedTaskStates = $StatesText`n    }"
    $updated=[regex]::Replace($text,'(?ms)TaskHistory\s*=\s*@\{.*?^\s*\}',$replacement,1)
    if($updated-ceq$text){throw 'fixture TaskHistory replacement failed'}
    [IO.File]::WriteAllText($path,$updated,$utf8Bom)
}
function Write-RetainedTask([string]$ProjectRoot,[string]$FileId,[string]$TaskId,[string]$Status,[string]$Phase,[string]$Extra='') {
    $path=Join-Path $ProjectRoot "docs/ai/tasks/$FileId.md";[IO.Directory]::CreateDirectory((Split-Path -Parent $path))|Out-Null
    [IO.File]::WriteAllText($path,"---`ntask_id: $TaskId`nstatus: $Status`ncurrent_phase: $Phase`n$Extra---`n`n# retained $FileId`n",$utf8NoBom)
}
function Initialize-TaskHistoryProject([string]$ProjectRoot,[bool]$RetainPolicy=$true) {
    foreach($relative in @('docs/ai/tasks','docs/ai/handoffs','docs/ai/reports','tools','board')){[IO.Directory]::CreateDirectory((Join-Path $ProjectRoot $relative))|Out-Null}
    [IO.File]::WriteAllText((Join-Path $ProjectRoot 'AGENTS.md'),"# fixture entrypoint`n",$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $ProjectRoot 'docs/ai/PROJECT_RULES.md'),"# fixture rules`n",$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $ProjectRoot 'docs/ai/CURRENT_STATE.md'),"---`nupdated_at: 2026-08-09`nactive_tasks: []`nnext_action: Define the next fixture task`n---`n",$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $ProjectRoot 'docs/ai/BACKLOG.md'),"# BACKLOG`n`n<!-- PROGRESS:START -->`n| ID | status | title |`n| --- | --- | --- |`n| ITEM-001 | ready | Fixture item |`n<!-- PROGRESS:END -->`n",$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $ProjectRoot 'docs/ai/COMPLETED_TASKS.md'),[IO.File]::ReadAllText((Join-Path $root 'templates/COMPLETED_TASKS.md')),$utf8NoBom)
    $sessionText=[IO.File]::ReadAllText((Join-Path $root 'templates/SESSION_START.md'))+"`nrepository path:`nentrypoint graph`n";[IO.File]::WriteAllText((Join-Path $ProjectRoot 'docs/ai/SESSION_START.md'),$sessionText,$utf8NoBom)
    Copy-Item -LiteralPath (Join-Path $root 'templates/PROJECT_REQUIREMENTS_HANDOFF.md') -Destination (Join-Path $ProjectRoot 'docs/ai/handoffs/PROJECT_REQUIREMENTS.md')
    $adapterText=([IO.File]::ReadAllText((Join-Path $root 'templates/PROJECT_ADAPTER.psd1'))).Replace('<project name>','task history fixture').Replace('<owner/repository>','owner/fixture').Replace("ZeroActive = @{ Model='none'; Effort='none' }","ZeroActive = @{ Model='chatgpt-model'; Effort='high' }").Replace('PhaseLabels = @{',"PhaseLabels = @{`n        complete='Complete'")
    [IO.File]::WriteAllText((Join-Path $ProjectRoot 'docs/ai/PROJECT_ADAPTER.psd1'),$adapterText,$utf8Bom)
    if($RetainPolicy){Set-FixtureAdapterTaskHistory $ProjectRoot 'retain_validated' "@(`n            @{ Status='completed'; Phase='complete' }`n        )"}
    & (Join-Path $root 'tools/sync-project.ps1') -ProjectRoot $ProjectRoot -SharedRoot $root;if(-not$?){throw 'fixture source-present sync failed'}
    foreach($pair in @(@('sync-project.ps1','sync-shared-governance.ps1'),@('validate-project.ps1','validate-ai-governance.ps1'))){Copy-Item -LiteralPath (Join-Path $ProjectRoot "docs/ai/generated/shared/tools/$($pair[0])") -Destination (Join-Path $ProjectRoot "tools/$($pair[1])")}
    $nextWrapper="param([switch]`$Check)`n& (Join-Path `$PSScriptRoot '../docs/ai/generated/shared/tools/generate-next-action.ps1') -ProjectRoot (Join-Path `$PSScriptRoot '..') -Check:`$Check`n";$progressWrapper="param([switch]`$Check)`n& (Join-Path `$PSScriptRoot '../docs/ai/generated/shared/tools/generate-progress.ps1') -ProjectRoot (Join-Path `$PSScriptRoot '..') -Check:`$Check`n";[IO.File]::WriteAllText((Join-Path $ProjectRoot 'tools/generate-next-action.ps1'),$nextWrapper,$utf8NoBom);[IO.File]::WriteAllText((Join-Path $ProjectRoot 'tools/generate-progress.ps1'),$progressWrapper,$utf8NoBom)
    & (Join-Path $ProjectRoot 'docs/ai/generated/shared/tools/generate-next-action.ps1') -ProjectRoot $ProjectRoot|Out-Null
    & (Join-Path $ProjectRoot 'docs/ai/generated/shared/tools/generate-progress.ps1') -ProjectRoot $ProjectRoot|Out-Null
    $null=Invoke-Git $ProjectRoot @('init','-q') 'task history fixture init';$null=Invoke-Git $ProjectRoot @('config','core.autocrlf','false') 'task history fixture autocrlf';$null=Invoke-Git $ProjectRoot @('config','user.name','TASK-149 simulation') 'task history fixture user';$null=Invoke-Git $ProjectRoot @('config','user.email','task149@example.invalid') 'task history fixture email';$null=Invoke-Git $ProjectRoot @('checkout','-q','-b','codex/task-004') 'task history fixture branch';$null=Invoke-Git $ProjectRoot @('remote','add','origin','https://github.com/owner/fixture.git') 'task history fixture remote';$null=Invoke-Git $ProjectRoot @('add','-A') 'task history fixture add';$null=Invoke-Git $ProjectRoot @('commit','-q','-m','task history fixture baseline') 'task history fixture commit'
}
function Invoke-ProjectValidation([string]$ProjectRoot) { Invoke-ScriptResult (Join-Path $ProjectRoot 'docs/ai/generated/shared/tools/validate-project.ps1') @('-ProjectRoot',$ProjectRoot,'-SkipOverlay') }
function Get-ProjectByteSnapshot([string]$ProjectRoot) {
    $files=[ordered]@{};Get-ChildItem -LiteralPath $ProjectRoot -Recurse -File -Force|Where-Object{$_.FullName-notlike"$ProjectRoot\.git\*"}|Sort-Object FullName|ForEach-Object{$relative=$_.FullName.Substring($ProjectRoot.Length+1).Replace('\','/');$files[$relative]=[Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName))}
    $directories=@(Get-ChildItem -LiteralPath $ProjectRoot -Recurse -Directory -Force|Where-Object{$_.FullName-notlike"$ProjectRoot\.git*"}|ForEach-Object{$_.FullName.Substring($ProjectRoot.Length+1).Replace('\','/')}|Sort-Object)
    [pscustomobject]@{Files=$files;Directories=$directories}
}
function Test-ProjectByteSnapshot($Before,$After) { (ConvertTo-Json $Before -Depth 5 -Compress)-ceq(ConvertTo-Json $After -Depth 5 -Compress) }
function Set-CompletedTasksText([string]$ProjectRoot,[string]$Body){
    [IO.File]::WriteAllText((Join-Path $ProjectRoot 'docs/ai/COMPLETED_TASKS.md'),$Body,$utf8NoBom)
}

$hostResolutionRoot = New-TestRoot 'powershell-host-resolution'
try {
    Assert (([IO.Path]::IsPathRooted($powershellExe) -and (Test-Path -LiteralPath $powershellExe -PathType Leaf)) -and $powershellExe -eq ([IO.Path]::GetFullPath($powershellExe))) 'resolved child host is absolute existing file'

    $hostProbePath = Join-Path $hostResolutionRoot 'host-probe.ps1'
    $hostProbeScript = @'
$processPath = [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
Write-Output ('HOST=' + $processPath)
Write-Output ('EDITION=' + $PSVersionTable.PSEdition)
Write-Output ('MAJOR=' + $PSVersionTable.PSVersion.Major)
Write-Output 'CHILD_OK'
'@
    [IO.File]::WriteAllText($hostProbePath, $hostProbeScript, $utf8NoBom)
    $hostProbe = Invoke-ScriptResult $hostProbePath @()
    $hostLines = $hostProbe.Output -split "`r?`n" | Where-Object { $_ -ne '' }
    $hostLine = @( $hostLines | Where-Object { $_ -like 'HOST=*' } )[0]
    $hostPath = if($null -ne $hostLine){ $hostLine.Substring(5) } else { $null }
    $editionLine = @( $hostLines | Where-Object { $_ -like 'EDITION=*' } )[0]
    $majorLine = @( $hostLines | Where-Object { $_ -like 'MAJOR=*' } )[0]
    Assert ($hostProbe.ExitCode-eq0-and$hostProbe.Output-match'CHILD_OK' -and $hostPath-ceq([IO.Path]::GetFullPath($powershellExe))) 'resolved child probe executes through resolved host and reports host path'
    Assert ($editionLine -ceq ('EDITION=' + $PSVersionTable.PSEdition)) 'child probe keeps same PSEdition as current process'
    Assert ($majorLine -ceq ('MAJOR=' + [string]$PSVersionTable.PSVersion.Major)) 'child probe keeps same PowerShell major version'

    if ($PSVersionTable.PSEdition -ceq 'Core') {
        Assert ($hostLine -notmatch '(?i)\\powershell\.exe$') 'Core process does not select powershell.exe'
        Assert ($hostLine -match '(?i)\\pwsh(\.exe)?$') 'Core process selects pwsh host'
    } else {
        Assert ($hostLine -match '(?i)\\powershell\.exe$') 'Desktop process selects powershell.exe'
        Assert ($hostLine -notmatch '(?i)\\pwsh(\.exe)?$') 'Desktop process does not select pwsh host'
    }

    $failureProbePath = Join-Path $hostResolutionRoot 'host-failure-probe.ps1'
    [IO.File]::WriteAllText($failureProbePath, "Write-Output 'simulated child failure'`nthrow 'simulated child failure'`n", $utf8NoBom)
    $failureProbe = Invoke-ScriptResult $failureProbePath @()
    Assert ($failureProbe.ExitCode-ne0-and$failureProbe.Output-match 'simulated child failure') 'failed child probe preserves output and nonzero exit'

    $hostFailure = $null
    try {
        $missingHostRoot = Join-Path $hostResolutionRoot 'missing-host'
        [IO.Directory]::CreateDirectory($missingHostRoot) | Out-Null
        Resolve-SharedPowerShellExe -EditionOverride 'Core' -ProcessPathOverride 'C:\task153-does-not-exist\pwsh.exe' -HostHomeOverride $missingHostRoot -NoPathLookup
    } catch {
        $hostFailure = $_.Exception.Message
    }
    Assert (-not [string]::IsNullOrWhiteSpace($hostFailure) -and $hostFailure -match 'PSEdition=Core' -and $hostFailure -match 'C:\\task153-does-not-exist\\pwsh.exe' -and $hostFailure -match [IO.Path]::GetFileName($missingHostRoot) ) 'unresolved host emits deterministic targeted error'

    $invalidEditionFailure = $null
    try {
        Resolve-SharedPowerShellExe -EditionOverride 'Server'
    } catch {
        $invalidEditionFailure = $_.Exception.Message
    }
    Assert (-not [string]::IsNullOrWhiteSpace($invalidEditionFailure) -and $invalidEditionFailure -match 'unsupported PSEdition=Server') 'invalid edition is rejected deterministically'

    $processFallbackHome = New-TestRoot 'powershell-host-core-fallback'
    $processFallbackExpected = Join-Path $processFallbackHome 'pwsh.exe'
    [IO.File]::WriteAllText($processFallbackExpected, 'pwsh host fallback test', $utf8NoBom)
    $processFallback = Resolve-SharedPowerShellExe -EditionOverride 'Core' -ProcessPathOverride 'C:\task153-does-not-exist\pwsh.exe' -HostHomeOverride $processFallbackHome -NoPathLookup
    Assert ($processFallback -ceq [IO.Path]::GetFullPath($processFallbackExpected)) 'process path failure falls back to edition-matched host'
    Remove-TestRoot $processFallbackHome

    $crossEditionHome = New-TestRoot 'powershell-host-cross-edition'
    $crossEditionCandidate = Join-Path $crossEditionHome 'powershell.exe'
    [IO.File]::WriteAllText($crossEditionCandidate, 'desktop-only host', $utf8NoBom)
    $crossEditionFailure = $null
    try {
        Resolve-SharedPowerShellExe -EditionOverride 'Core' -ProcessPathOverride 'C:\task153-does-not-exist\powershell.exe' -HostHomeOverride $crossEditionHome -NoPathLookup
    } catch {
        $crossEditionFailure = $_.Exception.Message
    }
    Assert (-not [string]::IsNullOrWhiteSpace($crossEditionFailure) -and $crossEditionFailure -match 'Cannot resolve PowerShell host for PSEdition=Core' -and $crossEditionFailure -match 'powershell.exe') 'core edition does not fallback to desktop-only host'
    Remove-TestRoot $crossEditionHome

    $crossBackHome = New-TestRoot 'powershell-host-desktop-cross'
    $crossBackCandidate = Join-Path $crossBackHome 'pwsh.exe'
    [IO.File]::WriteAllText($crossBackCandidate, 'core-only host', $utf8NoBom)
    $crossBackFailure = $null
    try {
        Resolve-SharedPowerShellExe -EditionOverride 'Desktop' -ProcessPathOverride 'C:\task153-does-not-exist\pwsh.exe' -HostHomeOverride $crossBackHome -NoPathLookup
    } catch {
        $crossBackFailure = $_.Exception.Message
    }
    Assert (-not [string]::IsNullOrWhiteSpace($crossBackFailure) -and $crossBackFailure -match 'Cannot resolve PowerShell host for PSEdition=Desktop' -and $crossBackFailure -match 'pwsh.exe') 'desktop edition does not fallback to core-only host'
    Remove-TestRoot $crossBackHome

    $pathPriorityHome = New-TestRoot 'powershell-host-path-priority'
    $pathPriorityHomeCandidate = Join-Path $pathPriorityHome 'pwsh'
    [IO.File]::WriteAllText($pathPriorityHomeCandidate, 'host home candidate', $utf8NoBom)
    $fakePathRoot = New-TestRoot 'powershell-host-path-lookup'
    $pathPriorityLookup = Join-Path $fakePathRoot 'pwsh.exe'
    [IO.File]::WriteAllText($pathPriorityLookup, 'path candidate', $utf8NoBom)
    $originalPath = $env:PATH
    try {
        $env:PATH = "$fakePathRoot;$originalPath"
        $pathPriority = Resolve-SharedPowerShellExe -EditionOverride 'Core' -ProcessPathOverride 'C:\task153-does-not-exist\pwsh.exe' -HostHomeOverride $pathPriorityHome
        Assert ($pathPriority -ceq [IO.Path]::GetFullPath($pathPriorityHomeCandidate)) 'PSHOME host candidate has precedence over PATH lookup'
    } finally {
        $env:PATH = $originalPath
    }
    Remove-TestRoot $pathPriorityHome
    Remove-TestRoot $fakePathRoot
} finally {
    Remove-TestRoot $hostResolutionRoot
}

$completedTasksRoot = New-TestRoot 'task156-completed-tasks'
try {
    $completedHeaderTask = 'TASK-ID'
    $completedHeaderFeature = ([char]0x6A5F) + ([char]0x80FD)
    $completedHeaderTime = (([char]0x5B8C) + ([char]0x4E86) + ([char]0x65E5) + ([char]0x6642))
    $noCompletedTaskMessage = (([char]0x5B8C) + ([char]0x4E86) + 'TASK' + ([char]0x306F) + ([char]0x3042) + ([char]0x308A) + ([char]0x307E) + ([char]0x305B) + ([char]0x3093))
    Initialize-TaskHistoryProject $completedTasksRoot | Out-Null
    $baseCompleted = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n<!-- COMPLETED_TASKS:END -->`n"
    $singleCompleted = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026-08-12 10:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $multiCompleted = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026-08-12 10:00:00 JST |`n| TASK-156 | Progress ledger | 2026-08-12 10:01:00 JST |`n| TASK-200 | Regression lock | 2026-08-12 10:02:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $invalidMarker = "# COMPLETED TASKS`n`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026-08-12 10:00:00 JST |`n"
    $invalidHeader = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| TASKID | Name | Time |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026-08-12 10:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $invalidColumns = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture |`n<!-- COMPLETED_TASKS:END -->`n"
    $invalidTaskId = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| task-155 | Routing fixture | 2026-08-12 10:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $invalidTaskIdQ = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| Q-001 | Routing fixture | 2026-08-12 10:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $invalidTaskIdAfc = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| AFC-004 | Routing fixture | 2026-08-12 10:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $invalidTaskIdAbc = "# COMPLETED TASKS`n`n<!-- COMPLETED TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| ABC-1 | Routing fixture | 2026-08-12 10:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $emptyFeature = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 |  | 2026-08-12 10:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $invalidTimestamp = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026/08/12 10:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $invalidTimestampMonth = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026-13-01 10:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $invalidTimestampDay = "# COMPLETED TASKS`n`n<!-- COMPLETED TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026-02-30 10:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $invalidTimestampHour = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026-08-12 25:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $duplicateTask = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026-08-12 10:00:00 JST |`n| TASK-155 | Duplicate fixture | 2026-08-12 10:01:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $badEscape = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-157 | <img src='x' onerror='alert(1)'> | 2026-08-12 11:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $doubleStart = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n<!-- COMPLETED_TASKS:START -->`n| TASK-155 | Routing fixture | 2026-08-12 10:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"
    $doubleEnd = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026-08-12 10:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n<!-- COMPLETED_TASKS:END -->`n"
    $reversedMarkers = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:END -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026-08-12 10:00:00 JST |`n<!-- COMPLETED_TASKS:START -->`n"
    $reversedMarkersWithTail = "# COMPLETED TASKS`n`n<!-- COMPLETED_TASKS:END -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026-08-12 10:00:00 JST |`n<!-- COMPLETED_TASKS:START -->`n<!-- COMPLETED_TASKS:END -->`n"
    $outsideSection = "# COMPLETED TASKS`n`n| OUTSIDE | NO | TABLE |`n<!-- COMPLETED_TASKS:START -->`n| $completedHeaderTask | $completedHeaderFeature | $completedHeaderTime |`n| --- | --- | --- |`n| TASK-155 | Routing fixture | 2026-08-12 10:00:00 JST |`n<!-- COMPLETED_TASKS:END -->`n"

    Set-CompletedTasksText $completedTasksRoot $baseCompleted
    & (Join-Path $completedTasksRoot 'docs/ai/generated/shared/tools/generate-progress.ps1') -ProjectRoot $completedTasksRoot|Out-Null
    $boardText= [IO.File]::ReadAllText((Join-Path $completedTasksRoot 'board/PROGRESS.html'))
    Assert ($boardText -match [regex]::Escape($noCompletedTaskMessage)) 'empty completed-task ledger renders no-completed-task message'

    Set-CompletedTasksText $completedTasksRoot $singleCompleted
    & (Join-Path $completedTasksRoot 'docs/ai/generated/shared/tools/generate-progress.ps1') -ProjectRoot $completedTasksRoot|Out-Null
    $boardText= [IO.File]::ReadAllText((Join-Path $completedTasksRoot 'board/PROGRESS.html'))
    Assert (($boardText -match 'TASK-155') -and($boardText -match 'Routing fixture') -and($boardText -match '2026-08-12 10:00:00 JST')) 'single completed-task ledger entry renders exactly'

    Set-CompletedTasksText $completedTasksRoot $multiCompleted
    & (Join-Path $completedTasksRoot 'docs/ai/generated/shared/tools/generate-progress.ps1') -ProjectRoot $completedTasksRoot|Out-Null
    $boardText= [IO.File]::ReadAllText((Join-Path $completedTasksRoot 'board/PROGRESS.html'))
    Assert (($boardText -match 'TASK-155') -and($boardText -match 'TASK-156') -and($boardText -match 'TASK-200')) 'multiple completed-task ledger entries render deterministic rows'

    $staleProgress = Invoke-ScriptResult (Join-Path $completedTasksRoot 'docs/ai/generated/shared/tools/generate-progress.ps1') @('-ProjectRoot',$completedTasksRoot,'-Check')
    Assert ($staleProgress.ExitCode-eq0) 'generate-progress check succeeds after fresh generation'

    $invalidMarkerRun = Invoke-ScriptResult (Join-Path $completedTasksRoot 'docs/ai/generated/shared/tools/generate-progress.ps1') @('-ProjectRoot',$completedTasksRoot)
    if($invalidMarkerRun.ExitCode-ne0){throw "unexpected baseline progress generation failure before mutations: $($invalidMarkerRun.Output)"}
    Set-CompletedTasksText $completedTasksRoot $invalidMarker
    $before = Get-ProjectByteSnapshot $completedTasksRoot
    $invalidMarkerCheck = Invoke-ScriptResult (Join-Path $completedTasksRoot 'docs/ai/generated/shared/tools/generate-progress.ps1') @('-ProjectRoot',$completedTasksRoot,'-Check')
    $after = Get-ProjectByteSnapshot $completedTasksRoot
    Assert ($invalidMarkerCheck.ExitCode-ne0 -and(Test-ProjectByteSnapshot $before $after)) 'missing COMPLETED_TASKS markers is rejected without mutation'

    foreach($case in @(
        @{Name='invalid header';Text=$invalidHeader},
        @{Name='invalid row column';Text=$invalidColumns},
        @{Name='invalid task id';Text=$invalidTaskId},
        @{Name='invalid task id Q-001';Text=$invalidTaskIdQ},
        @{Name='invalid task id AFC-004';Text=$invalidTaskIdAfc},
        @{Name='invalid task id ABC-1';Text=$invalidTaskIdAbc},
        @{Name='empty feature';Text=$emptyFeature},
        @{Name='invalid timestamp';Text=$invalidTimestamp},
        @{Name='invalid timestamp month';Text=$invalidTimestampMonth},
        @{Name='invalid timestamp day';Text=$invalidTimestampDay},
        @{Name='invalid timestamp hour';Text=$invalidTimestampHour},
        @{Name='duplicate task';Text=$duplicateTask},
        @{Name='double START marker';Text=$doubleStart},
        @{Name='double END marker';Text=$doubleEnd},
        @{Name='END before START marker';Text=$reversedMarkers},
        @{Name='END before START and trailing END markers';Text=$reversedMarkersWithTail},
        @{Name='outside ledger section';Text=$outsideSection}
    )){
        Set-CompletedTasksText $completedTasksRoot $case.Text
        $before = Get-ProjectByteSnapshot $completedTasksRoot
        $result = Invoke-ScriptResult (Join-Path $completedTasksRoot 'docs/ai/generated/shared/tools/generate-progress.ps1') @('-ProjectRoot',$completedTasksRoot,'-Check')
        $after = Get-ProjectByteSnapshot $completedTasksRoot
        Assert ($result.ExitCode -ne 0 -and(Test-ProjectByteSnapshot $before $after)) "completed-tasks validation rejects $($case.Name) without mutation"
    }

    Set-CompletedTasksText $completedTasksRoot $baseCompleted
    & (Join-Path $completedTasksRoot 'docs/ai/generated/shared/tools/generate-progress.ps1') -ProjectRoot $completedTasksRoot|Out-Null
    Set-CompletedTasksText $completedTasksRoot $badEscape
    & (Join-Path $completedTasksRoot 'docs/ai/generated/shared/tools/generate-progress.ps1') -ProjectRoot $completedTasksRoot|Out-Null
    $boardText = [IO.File]::ReadAllText((Join-Path $completedTasksRoot 'board/PROGRESS.html'))
    Assert (
        $boardText -notmatch "<img\s+src='x'\s+onerror='alert\(1\)'>" -and
        $boardText -match '&lt;img\s+src=(?:&apos;|&#39;)x(?:&apos;|&#39;)\s+onerror=(?:&apos;|&#39;)alert\(1\)(?:&apos;|&#39;)&gt;'
    ) 'completed-task HTML-sensitive content is escaped in generated progress'

    $validationWithoutCompleted = Invoke-ProjectValidation $completedTasksRoot
    Assert ($validationWithoutCompleted.ExitCode-eq0) 'project validation passes with default completed task ledger'

    Remove-Item -LiteralPath (Join-Path $completedTasksRoot 'docs/ai/COMPLETED_TASKS.md') -Force
    $missingCompleted = Invoke-ProjectValidation $completedTasksRoot
    Assert ($missingCompleted.ExitCode-ne0 -and $missingCompleted.Output-match 'missing required file: docs/ai/COMPLETED_TASKS.md') 'project validation rejects missing completed-task ledger'
} finally {
    if(Test-Path -LiteralPath $completedTasksRoot){Remove-TestRoot $completedTasksRoot}
}

& (Join-Path $root 'tools/validate-shared.ps1')
Assert $? 'shared validator'

$manifest = [IO.File]::ReadAllText((Join-Path $root 'manifest.yml'))
$attributes = [IO.File]::ReadAllText((Join-Path $root '.gitattributes'))
$readme = [IO.File]::ReadAllText((Join-Path $root 'README.md'))
$sync = [IO.File]::ReadAllText((Join-Path $root 'tools/sync-project.ps1'))
$relayPointer = [IO.File]::ReadAllText((Join-Path $root 'templates/USER_RELAY_REQUIRED.yml'))
$nextTemplate = [IO.File]::ReadAllText((Join-Path $root 'templates/NEXT_ACTION.yml'))
$relayBundle = [IO.File]::ReadAllText((Join-Path $root 'templates/RELAY_BUNDLE.json')) | ConvertFrom-Json
$adapterTemplate=Join-Path $root 'templates/PROJECT_ADAPTER.psd1'
$adapterText=[IO.File]::ReadAllText($adapterTemplate,[Text.UTF8Encoding]::new($false,$true))
$adapter=Import-AdapterFile -Path $adapterTemplate -ExpectedBom absent
$reviewContract=[IO.File]::ReadAllText((Join-Path $root 'core/REVIEW_CONTRACT.md'))
$chatContract=[IO.File]::ReadAllText((Join-Path $root 'core/CHAT_OUTPUT.md'))
$chatTextFenceStart = '```text'
$chatTextFenceEnd = '```'
$chatContractBlock = $null
$chatTextFenceStartIndex = $chatContract.IndexOf($chatTextFenceStart)
if ($chatTextFenceStartIndex -ge 0) {
    $chatTextBodyStart = $chatTextFenceStartIndex + $chatTextFenceStart.Length
    $chatTextFenceEndIndex = $chatContract.IndexOf($chatTextFenceEnd, $chatTextBodyStart)
    if ($chatTextFenceEndIndex -ge 0) {
        $rawChatContractBlock = $chatContract.Substring($chatTextBodyStart, $chatTextFenceEndIndex - $chatTextBodyStart)
        $chatContractBlock = $rawChatContractBlock -replace '^\r?\n|\r?\n$', ''
    }
}
function As-Jp {
    param([int[]]$CodePoints)
    -join ($CodePoints | ForEach-Object { [char]$_ })
}
$jpNowLocation = "## {0}" -f (As-Jp 0x73FE,0x5728,0x5730,0x70B9)
$jpTaskIdLine = "- TASK-ID{0}" -f (As-Jp 0xFF1A)
$jpFunctionLine = "- {0}" -f (As-Jp 0x6A5F,0x80FD,0xFF1A)
$jpPhaseLine = "- {0}" -f (As-Jp 0x30D5,0x30A7,0x30FC,0x30BA,0xFF1A)
$jpStatusLine = "- {0}" -f (As-Jp 0x5224,0x5B9A,0xFF0F,0x72B6,0x614B,0xFF1A)
$jpTargetLine = "## {0}" -f (As-Jp 0x4F9D,0x983C,0x5148,0x60C5,0x5831)
$jpPromptCore = As-Jp 0x30B3,0x30D4,0x30DA,0x7528,0x30D7,0x30ED,0x30F3,0x30D7,0x30C8
$jpPromptSection = "## $jpPromptCore"
$jpCandidateIdentity = "candidate identity{0}" -f (As-Jp 0x8868)
$jpHashList = "hash {0}" -f (As-Jp 0x4E00,0x89A7)
$jpChangedPathList = "changed path {0}" -f (As-Jp 0x4E00,0x89A7)
$jpFindingLong = "finding {0}" -f (As-Jp 0x306E,0x9577,0x6587,0x518D,0x63B2)
$jpReviewBasis = "review {0}" -f (As-Jp 0x6839,0x62E0,0x306E,0x7AE0,0x7ACB,0x3066)
$jpExplicitDetailRequest = "user{0}" -f (As-Jp 0x304C,0x3053,0x306E,0x5FDC,0x7B54,0x3067,0x660E,0x793A,0x7684,0x306B,0x8A73,0x7D30,0x8AAC,0x660E,0x3092,0x8981,0x6C42,0x3057,0x305F,0x5834,0x5408)
$jpPortableArtifact = "portable relay artifact{0}" -f (As-Jp 0x3092,0x4F5C,0x6210,0x4E0D,0x80FD)
$jpPromptMustInclude = "candidate identity{0}commit / tree / hash{1}" -f (As-Jp 0xFF08), (As-Jp 0xFF09)
$jpClockStart = As-Jp 0x5B9F,0x884C,0x958B,0x59CB,0x6642,0x523B
$jpClockEnd = As-Jp 0x5B9F,0x884C,0x7D42,0x4E86,0x6642,0x523B
$jpClockNoChange = As-Jp 0x51E6,0x7406,0x4E2D,0x306B,0x5909,0x66F4
$jpClockSave = As-Jp 0x4FDD,0x5B58
$jpReportHandoffClock = 'report'
$jpReportHandoff = 'handoff'
$jpThreeSectionName = "3 section"
$jpNoOnlyDestination = As-Jp 0x4F9D,0x983C,0x5148,0x60C5,0x5831,0x3060,0x3051,0x3092,0x8FD4,0x3057,0x3066,0x304F,0x3060,0x3055,0x3044
$jpNoWorkSingleSection = As-Jp 0x4F9D,0x983C,0x5148,0x60C5,0x5831,0x3060,0x3051
$jpBlocker = "blocker" + (As-Jp 0x7406,0x7531)
$jpResumeCondition = As-Jp 0x518D,0x958B,0x6761,0x4EF6
$jpCommonClockKeyword = ('silent' + (As-Jp 0x53D6,0x5F97))
$jpNormalChat = (As-Jp 0x901A,0x5E38) + 'chat'
$jpNoneValue = As-Jp 0x306A,0x3057
$jpNoneNoWorkDependency = "- {0}{1}{2}" -f (As-Jp 0x4F9D,0x983C,0x5148), (As-Jp 0xFF1A), $jpNoneValue
$jpNoneNoWorkScope = "- {0}{1}{2}" -f (As-Jp 0x5B9F,0x65BD,0x5185,0x5BB9), (As-Jp 0xFF1A), $jpNoneValue
$jpNoneNoWorkSession = "- {0}{1}{2}" -f (As-Jp 0x6E21,0x3059,0x30BB,0x30C3,0x30B7,0x30E7,0x30F3), (As-Jp 0xFF1A), $jpNoneValue
$jpNoneNoWorkPrompt = "- {0}{1}{2}" -f (As-Jp 0x30B3,0x30D4,0x30DA,0x7528,0x30D7,0x30ED,0x30F3,0x30D7,0x30C8), (As-Jp 0xFF1A), $jpNoneValue
$jpPortableFallbackRequired = "bundle{0}" -f (As-Jp 0x306E,0x5B8C,0x5168,0x5185,0x5BB9)
Assert ($reviewContract-match'(?s)Bounded review policy.*actual candidate diff.*no more than two findings.*subagent may not be created merely to enlarge review scope') 'bounded review scope, lifecycle, and delegation contract'
Assert ($reviewContract-match'(?s)Only a new user-safety.*BLOCKER.*MAJOR.*MINOR.*QUESTION') 'observed regression severity and BACKLOG contract'
Assert ($adapter.ModelRouting.UltraRequiresUserApproval -eq $false) 'template model routing disables explicit Ultra user approval'
Assert ((@($adapter.ModelRouting.CoreRoutes)-join'|')-ceq'Spark-high|Spark-xhigh|Terra-high|Terra-xhigh|Sol-medium|Sol-high|Sol-xhigh|Sol-Ultra'-and(@($adapter.ModelRouting.ReviewRoutes)-join'|')-ceq'Luna-high|Luna-xhigh|Terra-high|Terra-xhigh|Sol-medium|Sol-high|Sol-xhigh|Sol-Ultra'-and@($adapter.ModelRouting.DeprecatedRoutes).Count-eq0-and$adapter.ModelRouting.DocumentDefault-ceq'Luna-high'-and$adapter.ModelRouting.CodeDefault-ceq'Spark-high'-and$adapter.ModelRouting.NewWorkSelection-ceq'lowest_adequate'-and$adapter.ModelRouting.LunaToSolCostRatio-ceq'1/25'-and$adapter.ModelRouting.TerraToSolCostRatio-ceq'1/2.5') 'canonical model routing allocation and policy set'

function Get-FixtureYamlValue([string]$Text,[string]$Key,[string]$Source){
    $match = [regex]::Match($Text,"(?m)^$([regex]::Escape($Key)):\s*(.*?)\s*$")
    if(-not $match.Success){ throw "Missing '$Key' in $Source" }
    return $match.Groups[1].Value.Trim()
}
function Set-FixtureYamlValue([string]$Text,[string]$Key,[string]$Value){
    $pattern = "(?m)^$([regex]::Escape($Key)):\s*.*$"
    return [regex]::Replace($Text,$pattern,("$($Key): $Value"),1)
}
function Set-RouteFixture([string]$Project,[string]$Actor,[string]$Role,[string]$Model,[string]$Effort,[bool]$GenerateNext,[string]$SeedNextText){
    $taskId='TASK-155'
    $taskPath=Join-Path $Project "docs/ai/tasks/$taskId.md"
    $handoffPath=Join-Path $Project "docs/ai/handoffs/$taskId/IMPLEMENTATION_HANDOFF.md"
    [IO.Directory]::CreateDirectory((Split-Path -Parent $handoffPath))|Out-Null
    [IO.Directory]::CreateDirectory((Join-Path $Project "docs/ai/reports/$taskId"))|Out-Null
    [IO.File]::WriteAllText((Join-Path $Project 'docs/ai/CURRENT_STATE.md'),"---`nupdated_at: 2026-08-09`nactive_tasks:`n  - $taskId`nnext_action: routing fixture`n---`n",$utf8NoBom)
    [IO.File]::WriteAllText($taskPath,(
        "---`n"+
        "task_id: $taskId`n"+
        "title: TASK-155 routing fixture`n"+
        "status: ready`n"+
        "current_phase: implementation`n"+
        "current_role_id: IMPLEMENTER`n"+
        "next_actor: $Actor`n"+
        "next_role: $Role`n"+
        "assigned_model: $Model`n"+
        "assigned_effort: $Effort`n"+
        "session_mode: existing`n"+
        "handoff_file: docs/ai/handoffs/$taskId/IMPLEMENTATION_HANDOFF.md`n"+
        "preferred_executor: Claude`n"+
        "allowed_executors: Claude, ChatGPT`n"+
        "executor_policy: preferred_fallback`n"+
        "return_to: user`n"+
        "---`n"),$utf8NoBom
    )
    $nextPath=Join-Path $Project 'docs/ai/NEXT_ACTION.yml'
    if($GenerateNext){
        $nextRun = Invoke-ScriptResult (Join-Path $Project 'docs/ai/generated/shared/tools/generate-next-action.ps1') @('-ProjectRoot',$Project)
        if($nextRun.ExitCode -ne 0){ throw "generate-next-action failed in route fixture: $($nextRun.Output)"}
        $nextText=[IO.File]::ReadAllText($nextPath)
    }else{
        if([string]::IsNullOrWhiteSpace($SeedNextText)){ throw 'Seed NEXT_ACTION is required when GenerateNext=false' }
        $nextText = Set-FixtureYamlValue $SeedNextText 'task_id' $taskId
        $nextText = Set-FixtureYamlValue $nextText 'next_actor' $Actor
        $nextText = Set-FixtureYamlValue $nextText 'next_role' $Role
        $nextText = Set-FixtureYamlValue $nextText 'model' $Model
        $nextText = Set-FixtureYamlValue $nextText 'effort' $Effort
        [IO.File]::WriteAllText($nextPath,$nextText,$utf8NoBom)
    }
    $progressRun = Invoke-ScriptResult (Join-Path $Project 'docs/ai/generated/shared/tools/generate-progress.ps1') @('-ProjectRoot',$Project)
    if($progressRun.ExitCode -ne 0){ throw "generate-progress failed in route fixture: $($progressRun.Output)" }
    $nextReviewed = Get-FixtureYamlValue $nextText 'reviewed_candidate' 'NEXT_ACTION'
    $nextRules = Get-FixtureYamlValue $nextText 'rules_commit' 'NEXT_ACTION'
    [IO.File]::WriteAllText($handoffPath,(
        "- task_id: $taskId`n"+
        "- phase: implementation`n"+
        "- actor: $Actor`n"+
        "- role: $Role`n"+
        "- model: $Model`n"+
        "- effort: $Effort`n"+
        "- candidate_commit: $nextReviewed`n"+
        "- shared_candidate: $nextRules`n"
    ),$utf8NoBom)
}

$routingSeed = New-TestRoot 'task155-model-routing'
try {
    Initialize-TaskHistoryProject $routingSeed | Out-Null
    $routingSeedAdapter = Join-Path $routingSeed 'docs/ai/PROJECT_ADAPTER.psd1'
    $routingAdapterBaseline = [IO.File]::ReadAllText($routingSeedAdapter)

    Set-RouteFixture $routingSeed 'Codex' 'IMPLEMENTER' '5.6 Sol' 'medium' $true $null
    $routingNextSeed = [IO.File]::ReadAllText((Join-Path $routingSeed 'docs/ai/NEXT_ACTION.yml'))
    $routingPass=Invoke-ProjectValidation $routingSeed
    Assert ($routingPass.ExitCode -eq 0) 'project routing accepts declared core route pair (Codex / 5.6 Sol medium)'

    Set-RouteFixture $routingSeed 'ChatGPT' 'ORCHESTRATOR_AND_REVIEWER' '5.6 Terra' 'high' $true $null
    $routingPass2=Invoke-ProjectValidation $routingSeed
    Assert ($routingPass2.ExitCode -eq 0) 'project routing accepts declared review route pair (ChatGPT / 5.6 Terra high)'

    Set-RouteFixture $routingSeed 'Codex' 'IMPLEMENTER' '5.3 Codex Spark' 'medium' $true $null
    $routingCoreReject=Invoke-ProjectValidation $routingSeed
    Assert ($routingCoreReject.ExitCode -ne 0 -and $routingCoreReject.Output -match 'assignment is not allowed by project adapter') 'undeclared core pair is rejected'

    Set-RouteFixture $routingSeed 'ChatGPT' 'ORCHESTRATOR_AND_REVIEWER' '5.6 Luna' 'medium' $true $null
    $routingReviewReject=Invoke-ProjectValidation $routingSeed
    Assert ($routingReviewReject.ExitCode -ne 0 -and $routingReviewReject.Output -match 'assignment is not allowed by project adapter') 'undeclared review effort is rejected (no cross-product)'

    [IO.File]::WriteAllText($routingSeedAdapter, [regex]::Replace($routingAdapterBaseline,'DeprecatedRoutes\s*=\s*@\(\s*\)','DeprecatedRoutes = @(''Luna-high'')',1),$utf8Bom)
    Set-RouteFixture $routingSeed 'ChatGPT' 'ORCHESTRATOR_AND_REVIEWER' '5.6 Luna' 'high' $true $null
    $routingDeprecatedReject=Invoke-ProjectValidation $routingSeed
    Assert ($routingDeprecatedReject.ExitCode -ne 0 -and $routingDeprecatedReject.Output -match 'assignment is not allowed by project adapter') 'deprecated route declaration is rejected'
    [IO.File]::WriteAllText($routingSeedAdapter,$routingAdapterBaseline,$utf8Bom)
    Set-RouteFixture $routingSeed 'USER' 'USER' '5.6 Sol' 'medium' $false $routingNextSeed
    $routingRoleReject=Invoke-ProjectValidation $routingSeed
    Assert ($routingRoleReject.ExitCode -ne 0 -and $routingRoleReject.Output -match 'is not allowed|assignment is not allowed by project adapter') 'actor-role mismatch is rejected by project validation'
} finally {
    Remove-TestRoot $routingSeed
}

$routingSeed = New-TestRoot 'task155-model-routing'
try {
    $seedAdapter = Join-Path $routingSeed 'docs/ai/PROJECT_ADAPTER.psd1'
    Initialize-TaskHistoryProject $routingSeed | Out-Null
    $adapterTemplate = Get-Content -Path $seedAdapter -Raw
    $trueAdapterText = $adapterTemplate.Replace("UltraRequiresUserApproval = `$false","UltraRequiresUserApproval = `$true")
    $falseAdapterText = $adapterTemplate.Replace("UltraRequiresUserApproval = `$true","UltraRequiresUserApproval = `$false")
    [IO.File]::WriteAllText($seedAdapter,$trueAdapterText,$utf8Bom)
    $ultraRequired = Invoke-ProjectValidation $routingSeed
    Assert ($ultraRequired.ExitCode -ne 0 -and $ultraRequired.Output -match 'UltraRequiresUserApproval must be false') 'template UltraRequiresUserApproval=true is rejected by validate-project'
    [IO.File]::WriteAllText($seedAdapter,$falseAdapterText,$utf8Bom)
    $ultraAllowed = Invoke-ProjectValidation $routingSeed
    Assert ($ultraAllowed.ExitCode -eq 0) 'template UltraRequiresUserApproval=false remains valid in project validation'
} finally {
    Remove-TestRoot $routingSeed
}
Assert ($adapter.DefaultLabelLocale-ceq'ja-JP'-and$adapter.RoleLabels.ContainsKey('ORCHESTRATOR_AND_REVIEWER') -and $adapter.RoleLabels.ContainsKey('IMPLEMENTER') -and $adapter.RoleLabels.ContainsKey('INDEPENDENT_REVIEWER') -and $adapter.DisplayLabels.Effort.ContainsKey('medium') -and $adapter.DisplayLabels.Effort.ContainsKey('high') -and $adapter.DisplayLabels.Effort.ContainsKey('xhigh') -and $adapter.DisplayLabels.Effort.ContainsKey('Ultra')) 'generic Japanese locale and human labels'
function Source-AdapterLabel([string]$Section,[string]$Key) {
    $sectionMatch=[regex]::Match($adapterText,"(?s)$Section\s*=\s*@\{(?<body>.*?)\}")
    if(-not$sectionMatch.Success){throw "Adapter source section is missing: $Section"}
    $match=[regex]::Match($sectionMatch.Groups['body'].Value,"(?:^|[;{\s])$([regex]::Escape($Key))='(?<value>[^']+)'")
    if(-not$match.Success){throw "Adapter source label is missing: $Key"}
    $match.Groups['value'].Value
}
$labelPairs=@(
    @('PhaseLabels','requirements',$adapter.PhaseLabels.requirements),@('PhaseLabels','design',$adapter.PhaseLabels.design),@('PhaseLabels','design_review',$adapter.PhaseLabels.design_review),@('PhaseLabels','implementation',$adapter.PhaseLabels.implementation),@('PhaseLabels','implementation_review',$adapter.PhaseLabels.implementation_review),@('PhaseLabels','browser_evidence',$adapter.PhaseLabels.browser_evidence),@('PhaseLabels','release',$adapter.PhaseLabels.release),@('PhaseLabels','completion_sync',$adapter.PhaseLabels.completion_sync),@('PhaseLabels','user_decision',$adapter.PhaseLabels.user_decision),@('PhaseLabels','blocked',$adapter.PhaseLabels.blocked),@('PhaseLabels','completed',$adapter.PhaseLabels.completed),@('RoleLabels','ORCHESTRATOR_AND_REVIEWER',$adapter.RoleLabels.ORCHESTRATOR_AND_REVIEWER),@('RoleLabels','IMPLEMENTER',$adapter.RoleLabels.IMPLEMENTER),@('RoleLabels','INDEPENDENT_REVIEWER',$adapter.RoleLabels.INDEPENDENT_REVIEWER),@('RoleLabels','USER',$adapter.RoleLabels.USER),@('RoleLabels','NONE',$adapter.RoleLabels.NONE),@('Effort','medium',$adapter.DisplayLabels.Effort.medium),@('Effort','high',$adapter.DisplayLabels.Effort.high),@('Effort','xhigh',$adapter.DisplayLabels.Effort.xhigh),@('Effort','Ultra',$adapter.DisplayLabels.Effort.Ultra)
)
Assert (@($labelPairs|Where-Object{$sourceValue=Source-AdapterLabel -Section ([string]$_.Item(0)) -Key ([string]$_.Item(1));[string]$_.Item(2)-cne$sourceValue}).Count-eq0) 'Japanese adapter labels are exact'
$invalidAdapter=Join-Path ([IO.Path]::GetTempPath()) ('task148-invalid-adapter-'+[guid]::NewGuid().ToString('N')+'.psd1')
$temporaryBefore=@(Get-ChildItem -LiteralPath ([IO.Path]::GetTempPath()) -Filter 'shared-adapter-*.psd1' -ErrorAction SilentlyContinue|ForEach-Object{$_.FullName})
try {
    [IO.File]::WriteAllBytes($invalidAdapter,[byte[]](0x40,0x7B,0xFF,0x7D,0x0A))
    $rejected=$false;try{Import-AdapterFile -Path $invalidAdapter -ExpectedBom absent|Out-Null}catch{$rejected=$true}
    Assert $rejected 'invalid UTF-8 adapter is rejected'
} finally {
    if(Test-Path -LiteralPath $invalidAdapter){Remove-Item -LiteralPath $invalidAdapter -Force}
}
$temporaryAfter=@(Get-ChildItem -LiteralPath ([IO.Path]::GetTempPath()) -Filter 'shared-adapter-*.psd1' -ErrorAction SilentlyContinue|ForEach-Object{$_.FullName})
Assert (@(Compare-Object $temporaryBefore $temporaryAfter).Count-eq0) 'adapter temporary file is removed after parse failure'
$baseAdapterText="@{ Relay = @{ Repository='owner/fixture' } }`n"

$zeroBomCapture=Capture-AdapterTextImport $baseAdapterText
Assert (-not$zeroBomCapture.Failed) 'Import-AdapterText accepts BOM-free adapter text'
Assert ($zeroBomCapture.TemporaryBytes.Count-ge4-and$zeroBomCapture.TemporaryBytes[0]-eq 0xEF-and$zeroBomCapture.TemporaryBytes[1]-eq 0xBB-and$zeroBomCapture.TemporaryBytes[2]-eq 0xBF-and$zeroBomCapture.TemporaryBytes[3]-ne 0xEF) 'temporary adapter snapshot is UTF-8 with BOM after import'

$oneBomCapture=Capture-AdapterTextImport ([string][char]0xFEFF + $baseAdapterText)
Assert (-not$oneBomCapture.Failed) 'Import-AdapterText accepts a single leading U+FEFF'
Assert ($oneBomCapture.TemporaryBytes.Count-ge4-and$oneBomCapture.TemporaryBytes[0]-eq 0xEF-and$oneBomCapture.TemporaryBytes[1]-eq 0xBB-and$oneBomCapture.TemporaryBytes[2]-eq 0xBF-and$oneBomCapture.TemporaryBytes[3]-ne 0xEF) 'single leading U+FEFF is removed before serialization while keeping UTF-8 BOM output'

$doubleBomCapture=Capture-AdapterTextImport ([string][char]0xFEFF+[string][char]0xFEFF+$baseAdapterText)
Assert ($doubleBomCapture.Failed -and $doubleBomCapture.Error-match 'multiple leading UTF-8 BOM markers') 'Import-AdapterText rejects multiple leading U+FEFF'

$nonLeadingCapture=Capture-AdapterTextImport "@{ Label = 'before$([string][char]0xFEFF)after' }`n"
Assert (-not$nonLeadingCapture.Failed) 'Import-AdapterText preserves non-leading U+FEFF values'
Assert ($nonLeadingCapture.Parsed.Label -ceq ('before'+[string][char]0xFEFF+'after')) 'non-leading U+FEFF is preserved after parsing'

$generatedAdapterRoot=New-TestRoot 'task148-shared-task151-generated-adapter'
try {
    $generatedAdapter=Join-Path $generatedAdapterRoot 'docs/ai/PROJECT_ADAPTER.psd1'
    $generatedAdapterNoBom=Join-Path $generatedAdapterRoot 'docs/ai/PROJECT_ADAPTER_NOBOM.psd1'
    [IO.Directory]::CreateDirectory((Split-Path -Parent $generatedAdapter))|Out-Null
    $generatedText=[IO.File]::ReadAllText((Join-Path $root 'templates/PROJECT_ADAPTER.psd1'))
    [IO.File]::WriteAllText($generatedAdapterNoBom,$generatedText,$utf8NoBom)
    $generatedAdapterNoBomPresent=$false
    try { $null = Import-AdapterFile -Path $generatedAdapterNoBom -ExpectedBom present } catch { $generatedAdapterNoBomPresent=$true }
    Assert $generatedAdapterNoBomPresent 'Import-AdapterFile rejects BOM-free generated adapter when ExpectedBom is present'

    $nonLeadingBomFile=Join-Path $generatedAdapterRoot 'docs/ai/PROJECT_ADAPTER_NON_LEADING_FEFF.psd1'
    [IO.File]::WriteAllText($nonLeadingBomFile, "@{'" + [string][char]0xFEFF + "' = 'keeps' }`n", $utf8NoBom)
    $nonLeadingSource=@{ }
    try { $nonLeadingSource = Import-AdapterFile -Path $nonLeadingBomFile -ExpectedBom absent } catch { throw "Import-AdapterFile fails on quoted non-leading U+FEFF in no-BOM source: $($_.Exception.Message)" }
    Assert ($nonLeadingSource.Keys -contains [string][char]0xFEFF) 'Import-AdapterFile accepts BOM-free source with non-leading U+FEFF in quoted string'
    Assert ($nonLeadingSource[[string][char]0xFEFF] -ceq 'keeps') 'Import-AdapterFile preserves U+FEFF from BOM-free source quoted string'

    [IO.File]::WriteAllText($generatedAdapter,$generatedText,$utf8Bom)
    $generatedAdapterSuccess=$false
    try { $null = Import-AdapterFile -Path $generatedAdapter -ExpectedBom present } catch { $generatedAdapterSuccess=$true }
    Assert (-not $generatedAdapterSuccess) 'Import-AdapterFile accepts generated adapter with single leading BOM'
    $generatedAdapterMismatch=$false
    try { $null = Import-AdapterFile -Path $generatedAdapter -ExpectedBom absent } catch { $generatedAdapterMismatch = $true }
    Assert $generatedAdapterMismatch 'Import-AdapterFile rejects generated adapter when ExpectedBom is absent'
    Set-TextByteVariant $generatedAdapter 'bom'
    $generatedAdapterDoubleBom=$false
    try { $null = Import-AdapterFile -Path $generatedAdapter -ExpectedBom present } catch { $generatedAdapterDoubleBom=$true }
    Assert $generatedAdapterDoubleBom 'Import-AdapterFile rejects generated adapter with two leading byte-BOM markers'
} finally {
    Remove-TestRoot $generatedAdapterRoot
}
$chatContractBody = if ($chatContractBlock -ne $null) { $chatContractBlock } else { '' }
Assert ($chatContract -match "(?m)^$([regex]::Escape($jpNowLocation))" -and $chatContract -match "(?m)^$([regex]::Escape($jpTaskIdLine))" -and $chatContract -match "(?m)^$([regex]::Escape($jpFunctionLine))" -and $chatContract -match "(?m)^$([regex]::Escape($jpPhaseLine))" -and $chatContract -match "(?m)^$([regex]::Escape($jpStatusLine))" -and $chatContract -match "(?m)^$([regex]::Escape($jpTargetLine))" -and $chatContract -match "(?m)^$([regex]::Escape($jpPromptSection))" -and $chatContractBody -notmatch $jpClockStart -and $chatContractBody -notmatch $jpClockEnd) 'ACTIONABLE-MIN-CHAT section fields and no timestamps'
$chatContractSectionHeaders = @()
if ($chatContractBlock -ne $null) {
    $chatContractSectionHeaders = [regex]::Matches($chatContractBlock, '(?m)^## .*') | ForEach-Object { $_.Value.Trim() }
}
$chatContractSectionHeaderCheck = (
    $chatContractSectionHeaders.Count -eq 3 -and
    $chatContractSectionHeaders[0].Contains($jpNowLocation) -and
    $chatContractSectionHeaders[1].Contains($jpTargetLine) -and
    $chatContractSectionHeaders[2].Contains($jpPromptSection)
)
Assert $chatContractSectionHeaderCheck 'ACTIONABLE-MIN-CHAT block has exact 3 sections'
Assert ($chatContract -match [regex]::Escape($jpCandidateIdentity) -and $chatContract -match [regex]::Escape($jpHashList) -and $chatContract -match [regex]::Escape($jpChangedPathList) -and $chatContract -match [regex]::Escape($jpFindingLong) -and $chatContract -match [regex]::Escape($jpReviewBasis)) 'Normal chat prohibited output list is explicit'
Assert ($chatContract -match [regex]::Escape($jpExplicitDetailRequest) -and $chatContract -match [regex]::Escape($jpPortableArtifact) -and $chatContract -match [regex]::Escape($jpPromptMustInclude) -and $chatContract -match 'bundle name' -and $chatContract -match 'bundle SHA-256' -and $chatContract -match 'bytes' -and $chatContract -match 'format' -and $chatContract -match [regex]::Escape($jpPortableFallbackRequired)) 'Normal chat detail override and fallback exception documented'
Assert ($chatContract -match [regex]::Escape($jpNoneNoWorkDependency) -and $chatContract -match [regex]::Escape($jpNoneNoWorkScope) -and $chatContract -match [regex]::Escape($jpNoneNoWorkSession) -and $chatContract -match [regex]::Escape($jpNoneNoWorkPrompt)) 'No-next-action fallback values are preserved'
$start = [IO.File]::ReadAllText((Join-Path $root 'core/START.md'))
$sessionStart = [IO.File]::ReadAllText((Join-Path $root 'templates/SESSION_START.md'))
Assert (($start -match "(?ms)^$([regex]::Escape($jpNowLocation))" -and $start -match [regex]::Escape($jpStatusLine) -and $start -match "(?m)^$([regex]::Escape($jpTargetLine))" -and $start -match "(?m)^$([regex]::Escape($jpPromptSection))") -and ($sessionStart -match $jpThreeSectionName)) 'START and session templates keep the 3-section normal chat contract'
$startLines = [regex]::Split($start, '\r?\n')
$sessionLines = [regex]::Split($sessionStart, '\r?\n')
$startTemplateMatch = [regex]::Match($start, '(?ms)^6\..*?```text(?<template>.*?)```(?=\r?\n\s*7\.|\r?\n\s*$)')
$sessionTemplateMatch = [regex]::Match($sessionStart, '(?ms)^##\s*3 section template(?<template>[\s\S]*?)(?=^4\.|\Z)')
$startLine5 = $startLines | Where-Object { $_ -match '^5\.' } | Select-Object -First 1
$startLine6 = $startLines | Where-Object { $_ -match '^6\.' } | Select-Object -First 1
$startLine7 = $startLines | Where-Object { $_ -match '^7\.' } | Select-Object -First 1
$sessionLine1 = $sessionLines | Where-Object { $_ -match '^1\.' } | Select-Object -First 1
$sessionLine2 = $sessionLines | Where-Object { $_ -match '^2\.' } | Select-Object -First 1
$sessionLine3 = $sessionLines | Where-Object { $_ -match '^3\.' } | Select-Object -First 1
$sessionLine5 = $sessionLines | Where-Object { $_ -match '^5\.' } | Select-Object -First 1
$sessionLine6 = $sessionLines | Where-Object { $_ -match '^6\.' } | Select-Object -First 1
$startTemplate = $startTemplateMatch.Groups['template'].Value
$sessionTemplate = $sessionTemplateMatch.Groups['template'].Value
$startTemplateHasClock = $startTemplate.Contains($jpClockStart) -or $startTemplate.Contains($jpClockEnd)
$sessionTemplateHasClock = $sessionTemplate.Contains($jpClockStart) -or $sessionTemplate.Contains($jpClockEnd)
$startClockContract = (
    $startLine5 -and $startLine5.Contains($jpClockStart) -and $startLine5.Contains($jpCommonClockKeyword) -and
    $startLine6 -and $startLine6.Contains($jpThreeSectionName) -and
    $startLine7 -and $startLine7.Contains($jpClockEnd) -and $startLine7.Contains($jpClockSave) -and $startLine7.Contains($jpReportHandoffClock) -and $startLine7.Contains($jpReportHandoff) -and
    -not $startTemplateHasClock -and
    $start.IndexOf("5.") -lt $start.IndexOf("6.") -and $start.IndexOf("6.") -lt $start.IndexOf("7.") -and
    $start.Contains($jpClockNoChange) -and
    $start.Contains($jpClockStart) -and $start.Contains($jpClockEnd) -and
    [regex]::Matches($start, [regex]::Escape($jpClockStart)).Count -ge 1 -and
    [regex]::Matches($start, [regex]::Escape($jpClockEnd)).Count -ge 1
)
$sessionClockContract = (
    $sessionLine1 -and $sessionLine2 -and $sessionLine3 -and $sessionLine6 -and
    $sessionLine2.Contains($jpClockStart) -and $sessionLine2.Contains($jpCommonClockKeyword) -and
    $sessionLine3.Contains($jpThreeSectionName) -and $sessionLine6.Contains($jpClockEnd) -and $sessionLine6.Contains($jpClockSave) -and
    -not $sessionTemplateHasClock -and
    -not ($sessionStart -match "$jpNormalChat.*$([regex]::Escape($jpClockStart))") -and
    -not ($sessionStart -match "$jpNormalChat.*$([regex]::Escape($jpClockEnd))") -and
    $sessionStart -notmatch $jpNoOnlyDestination -and
    $sessionLine5 -and $sessionLine5.Contains($jpThreeSectionName)
)
Assert ($sessionTemplate -match $jpBlocker -and $sessionTemplate -match $jpResumeCondition) 'SESSION_START prompt includes blocker reason and resume condition'
Assert ($sessionStart -notmatch $jpNoOnlyDestination -and $sessionStart -notmatch $jpNoWorkSingleSection) 'SESSION_START does not contain single-section return instruction'
Assert ($sessionStart -match '未着手|BLOCKED|mismatch') 'SESSION_START includes blocked/unstarted/mismatch work-block conditions'
Assert $startClockContract 'template start clock contract'
Assert $sessionClockContract 'template session clock contract'
Assert ($startClockContract -and $sessionClockContract) 'template contracts keep START/SESSION_START clocks external and silent'
$relayTool = [IO.File]::ReadAllText((Join-Path $root 'tools/relay-bundle.ps1'))
$routeTool = [IO.File]::ReadAllText((Join-Path $root 'tools/route-go.ps1'))
$adapterHelper = [IO.File]::ReadAllText((Join-Path $root 'tools/import-adapter.ps1'))
$lifecycle = [IO.File]::ReadAllText((Join-Path $root 'core/TASK_LIFECYCLE.md'))
$origin = (git -C $root remote get-url origin).Trim()

Assert ($origin -ceq 'https://github.com/Osato-Gasu/shared.git') 'origin identity'
Assert ($manifest -match '(?m)^source_repository:\s*Osato-Gasu/shared\s*$') 'manifest source repository'
Assert ($manifest -match '(?m)^payload_type:\s*text\s*$' -and $sync -match 'Working bytes do not match source commit blob' -and $sync -match 'Shared source must be clean' -and $sync -match 'ConvertFrom-CanonicalTextBytes') 'text-only payload and single-commit provenance policy'
$legacyPattern = '\$powershellExe\s*=\s*Join-Path\s+\$PSHOME\s+[''"]powershell\.exe[''"]'
Assert ($relayTool -match 'Resolve-SharedPowerShellExe' -and $relayTool -notmatch $legacyPattern) 'relay bundle resolves child PowerShell host through helper'
Assert ($attributes -match '(?m)^\* text=auto eol=lf$' -and $attributes -match '(?m)^\*\.png -text$' -and $manifest -notmatch '(?m)^\s+(?:path|target):\s*\.gitattributes\s*$') 'repository LF policy is versioned and excluded from snapshot manifest'
Assert ($readme -match 'Osato-Gasu/shared' -and $readme -match 'force push' -and $readme -match 'active TASK') 'canonical and update policy'
Assert ($sync.Contains("Read-Key `$manifestText 'source_repository'") -and $sync.Contains('source_repository=$sourceRepository')) 'lock source repository'
Assert ($sync.Contains('.gitattributes is a shared repository policy file and must not be distributed in the project snapshot.')) 'sync rejects shared policy file distribution'
Assert ($readme -match '(?s)1\..*branch.*2\..*validator.*3\..*main.*4\..*version.*commit.*5\..*project.*branch.*6\..*snapshot.*lock.*7\..*overlay.*8\..*review.*release') 'eight-step update procedure'
Assert ($relayPointer -match '(?m)^relay_bundle_name:' -and $relayPointer -match '(?m)^relay_bundle_sha256:' -and $relayPointer -match '(?m)^relay_bundle_bytes:' -and $relayPointer -match '(?m)^relay_bundle_format:' -and $relayPointer -match '(?m)^relay_recipient: Codex$' -and $relayPointer -match '(?m)^relay_recipient_role: IMPLEMENTER$' -and $relayPointer -match '(?m)^result_return_to:' -and $relayPointer -notmatch 'finding_summary') 'minimal relay identity pointer'
Assert ([int]$relayBundle.schema_version-eq2-and@($relayBundle.findings).Count-gt0-and@($relayBundle.acceptance_criteria).Count-gt0-and@($relayBundle.tests).Count-gt0-and@($relayBundle.forbidden_changes).Count-gt0) 'portable relay bundle schema 2'
Assert ($relayBundle.relay_recipient-ceq'Codex'-and$relayBundle.relay_recipient_role-ceq'IMPLEMENTER'-and$relayBundle.result_return_to-ceq'ChatGPT'-and$relayBundle.repository-and$relayBundle.branch-and$relayBundle.shared_candidate) 'relay routing identity separation'
Assert ($relayBundle.routing_mode-ceq'connector_read_only'-and$relayBundle.route_result.repository-and$relayBundle.route_result.requested_ref-and$relayBundle.route_result.resolved_commit-and$relayBundle.route_result.next_action_blob-and$relayBundle.route_result.handoff_blob-and$relayBundle.route_result.adapter_blob) 'portable immutable route identity'
Assert ($relayTool-match"refs/\(heads\|tags\)"-and$relayTool-match'requested_ref must be a full branch or tag ref'-and$relayTool-match'route_result branch ref mismatch') 'portable branch or tag route identity'
Assert ($null-eq$relayBundle.requirements-and$null-eq$relayBundle.independent_review-and$null-eq$relayBundle.independent_review_result-and$null-eq$relayBundle.finding_dispositions) 'generic relay template null non-applicable objects'
Assert ($relayTool-match"INDEPENDENT_REVIEW_REQUESTED requires request object and forbids result/requirements objects"-and$relayTool-match"INDEPENDENT_REVIEW_COMPLETED requires result object and forbids request/requirements objects"-and$relayTool-match'decision without completed independent review forbids independent_review_result') 'decision review object presence matrix'
Assert ($relayTool-match"'kind','reviewed_candidate','request_id','preferred_executor'.*'review_status','model','effort','started_at'"-and$relayTool-match'request_review_status'-and$relayTool-match'Convert-ResultToRequest') 'independent review request and result schema'
Assert ($relayPointer-match'INDEPENDENT_REVIEW_REQUESTED'-and$relayPointer-match'INDEPENDENT_REVIEW_COMPLETED') 'relay pointer seven decisions'
Assert ($nextTemplate-match'(?m)^rules_version: <shared-version>$') 'NEXT_ACTION template version placeholder'
foreach($decision in @('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION','REQUIREMENTS_DEFINED','INDEPENDENT_REVIEW_REQUESTED','INDEPENDENT_REVIEW_COMPLETED')){Assert ($relayTool-match("'"+[regex]::Escape($decision)+"'")) "relay transition $decision"}
Assert ($routeTool-match'nextActor-ceq\$SessionActor'-and$routeTool-match'nextRole-ceq\$SessionRole'-and$routeTool-match"SessionMode-cne'separate_session'"-and$routeTool-match'relay_recipient_role'-and$routeTool-match'ImportRelay') 'GO router exact binding and verified relay override'
Assert ($routeTool-match'Invoke-AutomaticChatGPTDocsBridge'-and$routeTool-match'bridge_task_id'-and$routeTool-match'bridge_allowed_paths'-and$routeTool-match'bridge_report_file'-and$routeTool-notmatch'TASK-148/FINAL_RELEASE_GATE_HANDOFF') 'GO-only bridge uses structured active-task allowlist'
Assert ($routeTool-match"connector_read_only"-and$routeTool-match"remote_read_only"-and$routeTool-match"not_observable"-and$routeTool-match"state_write_allowed"-and$routeTool-match"relay_import_allowed") 'connector read-only capability truthfulness'
Assert ($routeTool-match'requested_ref'-and$routeTool-match'resolved_commit'-and$routeTool-match'next_action_blob'-and$routeTool-match'handoff_blob'-and$routeTool-match'adapter_blob'-and$routeTool-match'candidate_commit'-and$routeTool-match"import-adapter.ps1"-and$relayTool-match"import-adapter.ps1"-and$adapterHelper-match'UTF8Encoding\]::new\(\$false,\$true\)'-and$adapterHelper-match'UTF8Encoding\]::new\(\$true\)'-and$adapterHelper-match'Import-PowerShellDataFile -LiteralPath \$temporary -ErrorAction Stop'-and$adapterHelper-match'finally'-and$routeTool.Contains("Stop-ReadOnly 'HANDOFF_IDENTITY_INVALID' `$_.Exception.Message `$taskId `$phase `$handoff")) 'connector immutable snapshot, UTF-8 adapter, exact handoff identity, and auditable mismatch'
Assert ($start.Contains('connector_read_only')-and$start.Contains('local_script_executed: false')-and$start.Contains('not_observable')-and$start.Contains('portable bundle')-and$start.Contains('exact commit')) 'connector route declarative contract'
Assert ($relayTool-match'INDEPENDENT_REVIEW_REQUESTED'-and$relayTool-match'INDEPENDENT_REVIEWER'-and$relayTool-match'provider_substitution'-and$relayTool-match'strict independent review forbids') 'independent review transition policy'
Assert ($relayTool-match'INDEPENDENT_REVIEW_COMPLETED'-and$relayTool-match'INDEPENDENT_REVIEW_RESULT_HANDOFF.md'-and$relayTool-match"Status='review_completed'"-and$relayTool-match"Actor='ChatGPT'") 'independent review completion returns to ChatGPT'
Assert ($relayTool-match'Read-StoredReviewRequest'-and$relayTool-match'Assert-ReviewRequestEqual'-and$relayTool-match'canonical request bundle'-and$relayTool-match'strict independent review result forbids') 'independent review result request identity and policy preflight'
Assert ($relayTool-match'review_started_at'-and$relayTool-match'review_completed_at'-and$relayTool-match'review_findings_count'-and$relayTool-match'review_finding_ids') 'independent review result audit materializer'
Assert ($relayTool-match'Get-ReviewRequestId'-and$relayTool-match'review_request_id'-and$relayTool-match'finding ids must be unique'-and$relayTool-match'NO_BLOCKING_FINDINGS cannot contain'-and$relayTool-match'decision after completed independent review requires') 'review request identity and persistent semantic audit'
Assert ($relayTool-match'canonical result audit mismatch'-and$relayTool-match'canonical finding detail mismatch'-and$relayTool-match'current canonical bundle is not an independent review result') 'persistent canonical result preflight'
Assert ($relayTool-match'finding_dispositions'-and$relayTool-match'accepted BLOCKER'-and$relayTool-match'Required changes'-and$relayTool-match'Independent review disposition audit'-and$relayTool-match'IsNullOrWhiteSpace.*candidateField'-and$relayTool-match"candidateField-notin@\('candidate_commit','reviewed_candidate'\)") 'finding disposition adjudication, accepted-only handoff, and neutral candidate identity'
Assert ($relayTool-match'StringComparer.*Ordinal'-and$relayTool-match'Collections\.IEnumerable'-and$relayTool.Contains("GetType().FullName-ceq'System.Management.Automation.PSCustomObject'")-and$relayTool-match'Json-Value @\(\$resultCanonical\.findings\)') 'canonical JSON scalar values, object sorting, and array order preservation'
Assert ($relayTool-match'ConvertTo-CanonicalJsonText'-and$relayTool-match'WriteAllBytes\(\$out,\$normalizedBytes\)'-and$relayTool-match'canonical relay bundle byte readback mismatch'-and$relayTool-match'Normalize-OptionalCollection'-and$relayTool-match'finding dispositions: \$\(\$findingDispositions\.Count\)') 'durable canonical JSON and nullable disposition implementation'
Assert ($relayTool-match'relay import requires a clean worktree'-and$relayTool-match'relay bundle spec_revision mismatch'-and$relayTool-match'relay bundle branch mismatch'-and$relayTool-match'relay bundle shared candidate mismatch'-and$relayTool-match'base commit/tree mismatch'-and$relayTool-match'base commit must equal current HEAD') 'relay import preflight'
Assert ($relayTool-match'Assert-ExistingImplementationReviewPreflight'-and$relayTool-match'Read-ImplementationReviewConvergenceState'-and$relayTool-match'current relay import report is missing'-and$relayTool-match'preflight state combination is invalid'-and$relayTool-match'preflight terminated route is invalid') 'five-source convergence preflight occurs before relay writes'
Assert ($relayTool-match'Resolve-CandidateField'-and$relayTool-match'CandidateIdentity'-and$relayTool-match'Duplicate.*Key'-and$relayTool-match'candidate does not match canonical review candidate'-and$relayTool-match'rev-parse --verify --quiet'-and$relayTool-match'merge-base --is-ancestor') 'kind-specific exact candidate identity preflight'
Assert ($adapter.Relay.CandidateIdentity.IndependentReviewKinds.design-ceq'design_candidate'-and$adapter.Relay.CandidateIdentity.IndependentReviewKinds.implementation-ceq'implementation_candidate') 'design and implementation candidate mapping'
Assert ($adapter.Relay.CandidateIdentity.Decisions.APPROVED.design-ceq'design_candidate'-and$adapter.Relay.CandidateIdentity.Decisions.APPROVED.implementation-ceq'implementation_candidate'-and$adapter.Relay.CandidateIdentity.Decisions.CHANGES_REQUESTED.design-ceq'design_candidate') 'stage-aware decision candidate mapping'
Assert ($relayTool-match"stage-ceq'design'.*Phase='implementation'"-and$relayTool-match"stage-ceq'design'.*Phase='design'") 'stage-aware decision transitions'
Assert ($relayTool-match'changes_requested_cycles'-and$relayTool-match'implementation_review_attempt'-and$relayTool-match'implementation_review_profile'-and$relayTool-match'implementation_review_terminated'-and$relayTool-match'no fourth implementation review') 'three-attempt implementation review state materialization'
Assert ($lifecycle-match'first attempt is' -and $lifecycle-match'narrowed' -and $lifecycle-match'terminal' -and $lifecycle-match'NEEDS_USER_DECISION' -and $lifecycle-match'no fourth implementation review' -and $lifecycle-match'APPROVED' -and $lifecycle-match'user_confirmation_required') 'three-attempt lifecycle policy'
Assert ($relayTool-match'changesRequestedCycles-eq2'-and$relayTool-match"effectiveDecision='NEEDS_USER_DECISION'"-and$relayTool-match"implementationReviewTerminated='true'"-and$relayTool-match"implementationReviewProfile='terminal'"-and$relayTool-match"Actor='ChatGPT'") 'third implementation review terminates without approval'
Assert ($lifecycle-match'calculation_accuracy' -and $lifecycle-match'raw_byte_portability' -and $lifecycle-match'backward_compatibility' -and $lifecycle-match'BLOCKER' -and $lifecycle-match'MAJOR') 'terminal review preserves non-relaxable release gates'
Assert ($relayTool-match'TASK implementation review state is inconsistent'-and$relayTool-match'no fourth implementation review is permitted') 'inconsistent review state rejection and terminal stop'
Assert ($relayTool-match"decision-ceq'APPROVED'"-and$relayTool-match'changesRequestedCycles=0') 'approved review resets convergence state'
Assert ($relayTool-match'injected relay failure after writes'-and$relayTool-match'WriteAllBytes\(\$path,\$backup.Bytes\)'-and$relayTool-match'Get-OverlayFailures'-and$relayTool-match'newOverlayFailures'-and$relayTool-match'overlay introduced new') 'relay transaction and overlay set-difference rollback'
Assert ($relayTool-match'requirements.allowed_executors does not match executor_policy'-and@($adapter.Relay.Requirements.Executors)-notcontains'Codex') 'requirements reviewer executor policy'
Assert ($relayTool-match'RELAY_BUNDLE.json'-and$relayTool-match'semantic round-trip mismatch'-and$relayTool-match'Validated full bundle: \$canonicalRelative') 'relay canonical round trip and exact path'
Assert ($relayTool-match'ProductIdentityReferences'-and$relayTool-match'escapes project root'-and$relayTool-match'Require-SingleLine'-and$relayTool-match'TaskMetadata') 'relay input boundary and TASK materializer'
$requiredPhases=@('requirements','design','design_review','implementation','implementation_review','browser_evidence','release','completion_sync','user_decision','blocked','completed')
Assert (@($requiredPhases|Where-Object{-not$adapter.PhaseLabels.ContainsKey($_)}).Count -eq 0 -and -not$adapter.PhaseLabels.ContainsKey('done')) 'shared lifecycle adapter phases'
Assert ($lifecycle-match'relay_recipient'-and$lifecycle-match'result_return_to'-and$lifecycle-match'byte-exact rollback') 'relay lifecycle state table'
Assert ($start -match '(?s)```entrypoint-graph.*SESSION_START -> AGENTS.*AGENTS -> START.*START_CLOCK -> CURRENT_POSITION_OUTPUT.*```' -and $start -notmatch '(?m)^\s*1\.\s+`AGENTS\.md`') 'acyclic entrypoint declaration'

$bridgeRoot=New-TestRoot 'go-only-bridge'
try {
    $bridgeBare=Join-Path $bridgeRoot 'origin.git';$bridgeWriter=Join-Path $bridgeRoot 'writer';$bridgeRunner=Join-Path $bridgeRoot 'runner'
    $null=@(& git init --bare -q $bridgeBare 2>&1);if($LASTEXITCODE-ne0){throw 'GO-only bridge bare remote init failed'}
    [IO.Directory]::CreateDirectory($bridgeWriter)|Out-Null
    foreach($relative in @('docs/ai/handoffs/TASK-149','docs/ai/reports/TASK-149','tools')){[IO.Directory]::CreateDirectory((Join-Path $bridgeWriter $relative))|Out-Null}
    [IO.File]::WriteAllText((Join-Path $bridgeWriter '.gitattributes'),"* text=auto eol=lf`n",$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $bridgeWriter 'docs/ai/PROJECT_ADAPTER.psd1'),"@{ Relay = @{ Repository = 'owner/fixture' } }`n",$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $bridgeWriter 'docs/ai/NEXT_ACTION.yml'),"task_id: TASK-149`nphase: implementation`nnext_actor: Codex`nnext_role: IMPLEMENTER`nmodel: 5.6 Terra`neffort: high`nreviewed_candidate: pending`nrules_commit: pending`nexecution_mode: existing_session`nhandoff_file: docs/ai/handoffs/TASK-149/BRIDGE.md`n",$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $bridgeWriter 'docs/ai/CURRENT_STATE.md'),"active_tasks:`n  - TASK-149`n",$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $bridgeWriter 'docs/ai/handoffs/TASK-149/BRIDGE.md'),"- task_id: TASK-149`n- phase: implementation`n- actor: Codex`n- role: IMPLEMENTER`n- model: 5.6 Terra`n- effort: high`n- candidate_commit: pending`n- shared_candidate: pending`n- write_bridge_sync_authorized: true`n- bridge_task_id: TASK-149`n- bridge_handoff_file: docs/ai/handoffs/TASK-149/BRIDGE.md`n- bridge_report_file: docs/ai/reports/TASK-149/BRIDGE.md`n- previous_handoff_head: pending`n- bridge_allowed_paths:`n  - docs/ai/NEXT_ACTION.yml`n  - docs/ai/CURRENT_STATE.md`n  - docs/ai/handoffs/TASK-149/BRIDGE.md`n  - docs/ai/reports/TASK-149/BRIDGE.md`n",$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $bridgeWriter 'docs/ai/reports/TASK-149/BRIDGE.md'),"# bridge baseline`n",$utf8NoBom)
    Copy-Item -LiteralPath (Join-Path $root 'tools/route-go.ps1') -Destination (Join-Path $bridgeWriter 'tools/route-go.ps1')
    Copy-Item -LiteralPath (Join-Path $root 'tools/import-adapter.ps1') -Destination (Join-Path $bridgeWriter 'tools/import-adapter.ps1')
    $null=Invoke-Git $bridgeWriter @('init','-q') 'GO-only bridge writer init';$null=Invoke-Git $bridgeWriter @('config','user.name','TASK-149 bridge simulation') 'GO-only bridge writer user';$null=Invoke-Git $bridgeWriter @('config','user.email','task149@example.invalid') 'GO-only bridge writer email';$null=Invoke-Git $bridgeWriter @('config','core.autocrlf','false') 'GO-only bridge writer autocrlf';$null=Invoke-Git $bridgeWriter @('checkout','-q','-b','codex/task-149-bridge') 'GO-only bridge writer branch';$null=Invoke-Git $bridgeWriter @('add','-A') 'GO-only bridge baseline add';$null=Invoke-Git $bridgeWriter @('commit','-q','-m','TASK-149 bridge baseline') 'GO-only bridge baseline commit'
    $bridgeBase=(Invoke-Git $bridgeWriter @('rev-parse','HEAD') 'GO-only bridge baseline identity')[-1].Trim()
    foreach($relative in @('docs/ai/NEXT_ACTION.yml','docs/ai/handoffs/TASK-149/BRIDGE.md')){
        $path=Join-Path $bridgeWriter $relative;$text=[IO.File]::ReadAllText($path).Replace('pending',$bridgeBase);[IO.File]::WriteAllText($path,$text,$utf8NoBom)
    }
    $null=Invoke-Git $bridgeWriter @('add','-A') 'GO-only bridge identity add';$null=Invoke-Git $bridgeWriter @('commit','-q','-m','TASK-149 bridge identity') 'GO-only bridge identity commit';$null=Invoke-Git $bridgeWriter @('remote','add','origin',$bridgeBare) 'GO-only bridge writer remote';$null=Invoke-Git $bridgeWriter @('push','-q','-u','origin','codex/task-149-bridge') 'GO-only bridge baseline push'
    $null=@(& git clone --quiet --branch codex/task-149-bridge $bridgeBare $bridgeRunner 2>&1);if($LASTEXITCODE-ne0){throw 'GO-only bridge runner clone failed'};$null=Invoke-Git $bridgeRunner @('config','core.autocrlf','false') 'GO-only bridge runner autocrlf'
    $bridgeRunnerHead=(Invoke-Git $bridgeRunner @('rev-parse','HEAD') 'GO-only bridge runner baseline')[-1].Trim()
    [IO.File]::WriteAllText((Join-Path $bridgeWriter 'docs/ai/CURRENT_STATE.md'),"active_tasks:`n  - TASK-149`nnext_action: Codex resumes TASK-149 after approved bridge`n",$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $bridgeWriter 'docs/ai/reports/TASK-149/BRIDGE.md'),"# TASK-149 bridge approval`n`n- previous_handoff_head: $bridgeRunnerHead`n",$utf8NoBom)
    $bridgeHandoff=Join-Path $bridgeWriter 'docs/ai/handoffs/TASK-149/BRIDGE.md';$bridgeText=[IO.File]::ReadAllText($bridgeHandoff).Replace("previous_handoff_head: $bridgeBase","previous_handoff_head: $bridgeRunnerHead");[IO.File]::WriteAllText($bridgeHandoff,$bridgeText,$utf8NoBom)
    $null=Invoke-Git $bridgeWriter @('add','docs/ai/NEXT_ACTION.yml','docs/ai/CURRENT_STATE.md','docs/ai/handoffs/TASK-149/BRIDGE.md','docs/ai/reports/TASK-149/BRIDGE.md') 'GO-only bridge approval add';$null=Invoke-Git $bridgeWriter @('commit','-q','-m','TASK-149 approved docs bridge') 'GO-only bridge approval commit';$bridgeTip=(Invoke-Git $bridgeWriter @('rev-parse','HEAD') 'GO-only bridge approved tip')[-1].Trim();$null=Invoke-Git $bridgeWriter @('push','-q','origin','codex/task-149-bridge') 'GO-only bridge approval push'
    $bridgeRun=Invoke-ScriptResult (Join-Path $bridgeRunner 'tools/route-go.ps1') @('-ProjectRoot',$bridgeRunner,'-SessionActor','Codex','-SessionRole','IMPLEMENTER','-SessionMode','existing_session','-RoutingMode','local_script')
    if($bridgeRun.ExitCode-ne0){throw "GO-only bridge route failed: $($bridgeRun.Output)"}
    $bridgeJson=@($bridgeRun.Output-split'\r?\n'|Where-Object{$_-match'^\{'})|Select-Object -Last 1;if([string]::IsNullOrWhiteSpace([string]$bridgeJson)){throw "GO-only bridge route result is missing: $($bridgeRun.Output)"};$bridgeResult=$bridgeJson|ConvertFrom-Json;$bridgeHead=(Invoke-Git $bridgeRunner @('rev-parse','HEAD') 'GO-only bridge final identity')[-1].Trim();$bridgeDirty=@(& git -C $bridgeRunner status --porcelain)
    if(-not($bridgeRun.ExitCode-eq0-and$bridgeResult.outcome-ceq'ALLOW'-and$bridgeResult.repository_changed-and$bridgeResult.task_id-ceq'TASK-149'-and$bridgeHead-ceq$bridgeTip-and$bridgeDirty.Count-eq0)){throw "GO-only bridge fixture failed: exit=$($bridgeRun.ExitCode); output=$($bridgeRun.Output); head=$bridgeHead; tip=$bridgeTip; dirty=$($bridgeDirty-join'; ')"}
    Assert $true 'TASK-149 GO-only bridge fetches, verifies authority, fast-forwards, and reroutes'
} finally { Remove-TestRoot $bridgeRoot }

$task151BridgeRoot=New-TestRoot 'go-only-bridge-task151'
try {
    $task151Bare=Join-Path $task151BridgeRoot 'origin.git'
    $task151Writer=Join-Path $task151BridgeRoot 'writer'
    $task151Runner=Join-Path $task151BridgeRoot 'runner'
    $null=@(& git init --bare -q $task151Bare 2>&1);if($LASTEXITCODE-ne0){throw 'TASK-151 GO-only bridge bare remote init failed'}
    [IO.Directory]::CreateDirectory($task151Writer)|Out-Null
    foreach($relative in @('docs/ai/handoffs/TASK-151','docs/ai/reports/TASK-151','tools')){[IO.Directory]::CreateDirectory((Join-Path $task151Writer $relative))|Out-Null}
    [IO.File]::WriteAllText((Join-Path $task151Writer '.gitattributes'),"* text=auto eol=lf`n",$utf8NoBom)
    $task151Adapter=[IO.File]::ReadAllText((Join-Path $root 'templates/PROJECT_ADAPTER.psd1'))
    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/PROJECT_ADAPTER.psd1'),$task151Adapter,$utf8Bom)
    $task151NextBase="task_id: TASK-151`nphase: implementation`nnext_actor: Codex`nnext_role: IMPLEMENTER`nmodel: 5.3 Codex Spark`neffort: high`nreviewed_candidate: <PENDING>`nrules_commit: <PENDING>`nexecution_mode: existing_session`nhandoff_file: docs/ai/handoffs/TASK-151/BRIDGE.md`n"
    $task151CurrentBase='active_tasks:`n  - TASK-151`n'
    $task151HandoffBase="- task_id: TASK-151`n- phase: implementation`n- actor: Codex`n- role: IMPLEMENTER`n- model: 5.3 Codex Spark`n- effort: high`n- candidate_commit: <PENDING>`n- shared_candidate: <PENDING>`n- write_bridge_sync_authorized: true`n- bridge_task_id: TASK-151`n- bridge_handoff_file: docs/ai/handoffs/TASK-151/BRIDGE.md`n- bridge_report_file: docs/ai/reports/TASK-151/BRIDGE.md`n- previous_handoff_head: <PENDING>`n- bridge_allowed_paths:`n  - docs/ai/NEXT_ACTION.yml`n  - docs/ai/CURRENT_STATE.md`n  - docs/ai/handoffs/TASK-151/BRIDGE.md`n  - docs/ai/reports/TASK-151/BRIDGE.md`n"
    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/NEXT_ACTION.yml'),$task151NextBase,$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/CURRENT_STATE.md'),$task151CurrentBase,$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/handoffs/TASK-151/BRIDGE.md'),$task151HandoffBase,$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/reports/TASK-151/BRIDGE.md'),"# bridge baseline`n",$utf8NoBom)
    Copy-Item -LiteralPath (Join-Path $root 'tools/route-go.ps1') -Destination (Join-Path $task151Writer 'tools/route-go.ps1')
    Copy-Item -LiteralPath (Join-Path $root 'tools/import-adapter.ps1') -Destination (Join-Path $task151Writer 'tools/import-adapter.ps1')
    $null=Invoke-Git $task151Writer @('init','-q') 'TASK-151 bridge writer init'
    $null=Invoke-Git $task151Writer @('config','user.name','TASK-151 bridge simulation') 'TASK-151 bridge writer user'
    $null=Invoke-Git $task151Writer @('config','user.email','task151@example.invalid') 'TASK-151 bridge writer email'
    $null=Invoke-Git $task151Writer @('config','core.autocrlf','false') 'TASK-151 bridge writer autocrlf'
    $null=Invoke-Git $task151Writer @('checkout','-q','-b','codex/task-151-route-go-adapter-bom-boundary') 'TASK-151 bridge writer branch'
    $null=Invoke-Git $task151Writer @('add','-A') 'TASK-151 bridge writer baseline add'
    $null=Invoke-Git $task151Writer @('commit','-q','-m','TASK-151 bridge baseline') 'TASK-151 bridge baseline commit'
    $task151Base=(Invoke-Git $task151Writer @('rev-parse','HEAD') 'TASK-151 bridge baseline identity')[-1].Trim()

    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/NEXT_ACTION.yml'),($task151NextBase -replace '<PENDING>',$task151Base),$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/handoffs/TASK-151/BRIDGE.md'),($task151HandoffBase -replace '<PENDING>',$task151Base),$utf8NoBom)
    $null=Invoke-Git $task151Writer @('add','docs/ai/NEXT_ACTION.yml','docs/ai/handoffs/TASK-151/BRIDGE.md') 'TASK-151 bridge writer identity add'
    $null=Invoke-Git $task151Writer @('commit','-q','-m','TASK-151 bridge identity') 'TASK-151 bridge identity commit'
    $null=Invoke-Git $task151Writer @('remote','add','origin',$task151Bare) 'TASK-151 bridge writer remote'
    $null=Invoke-Git $task151Writer @('push','-q','-u','origin','codex/task-151-route-go-adapter-bom-boundary') 'TASK-151 bridge baseline push'

    $null=@(& git clone --quiet --branch codex/task-151-route-go-adapter-bom-boundary $task151Bare $task151Runner 2>&1);if($LASTEXITCODE-ne0){throw 'TASK-151 bridge runner clone failed'}
    $null=Invoke-Git $task151Runner @('config','core.autocrlf','false') 'TASK-151 bridge runner autocrlf'
    $null=Invoke-Git $task151Runner @('config','user.name','TASK-151 bridge simulation') 'TASK-151 bridge runner user'
    $null=Invoke-Git $task151Runner @('config','user.email','task151@example.invalid') 'TASK-151 bridge runner email'
    $task151RunnerHead=(Invoke-Git $task151Runner @('rev-parse','HEAD') 'TASK-151 bridge runner baseline')[-1].Trim()

    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/CURRENT_STATE.md'),"active_tasks:`n  - TASK-151`nnext_action: Codex resumes TASK-151 after approved bridge`n",$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/reports/TASK-151/BRIDGE.md'),"# TASK-151 bridge approval`n`n- previous_handoff_head: $task151RunnerHead`n",$utf8NoBom)
    $task151HandoffRunnerText=($task151HandoffBase -replace 'candidate_commit: <PENDING>',$("candidate_commit: $task151Base") -replace 'shared_candidate: <PENDING>',$("shared_candidate: $task151Base")).Replace("previous_handoff_head: <PENDING>","previous_handoff_head: $task151RunnerHead")
    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/handoffs/TASK-151/BRIDGE.md'),$task151HandoffRunnerText,$utf8NoBom)
    $task151NextRunnerText=[IO.File]::ReadAllText((Join-Path $task151Writer 'docs/ai/NEXT_ACTION.yml')).Replace('<PENDING>',$task151Base)
    if($task151NextRunnerText -match '<PENDING>'){throw 'TASK-151 bridge NEXT_ACTION replacement failed'}
    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/NEXT_ACTION.yml'),$task151NextRunnerText,$utf8NoBom)
    $null=Invoke-Git $task151Writer @('add','docs/ai/NEXT_ACTION.yml','docs/ai/CURRENT_STATE.md','docs/ai/handoffs/TASK-151/BRIDGE.md','docs/ai/reports/TASK-151/BRIDGE.md') 'TASK-151 bridge writer approved add'
    $null=Invoke-Git $task151Writer @('commit','-q','-m','TASK-151 approved docs bridge') 'TASK-151 bridge approved commit'
    $task151Tip=(Invoke-Git $task151Writer @('rev-parse','HEAD') 'TASK-151 bridge approved tip')[-1].Trim()
    $null=Invoke-Git $task151Writer @('push','-q','origin','codex/task-151-route-go-adapter-bom-boundary') 'TASK-151 bridge approved push'

    $task151Run=Invoke-ScriptResult (Join-Path $task151Runner 'tools/route-go.ps1') @('-ProjectRoot',$task151Runner,'-SessionActor','Codex','-SessionRole','IMPLEMENTER','-SessionMode','existing_session','-RoutingMode','local_script')
    if($task151Run.ExitCode-ne0){throw "TASK-151 bridge route failed: $($task151Run.Output)"}
    $task151Json=@($task151Run.Output-split'\r?\n'|Where-Object{$_-match'^\{'})|Select-Object -Last 1
    if([string]::IsNullOrWhiteSpace([string]$task151Json)){throw "TASK-151 bridge route result missing: $($task151Run.Output)"}
    $task151Result=$task151Json|ConvertFrom-Json
    $task151Head=(Invoke-Git $task151Runner @('rev-parse','HEAD') 'TASK-151 bridge final identity')[-1].Trim()
    $task151Dirty=@(& git -C $task151Runner status --porcelain)
    Assert ($task151Run.ExitCode-eq0-and$task151Result.outcome-ceq'ALLOW'-and$task151Result.repository_changed-and$task151Result.task_id-ceq'TASK-151'-and$task151Result.phase-ceq'implementation'-and$task151Result.handoff_file-ceq'docs/ai/handoffs/TASK-151/BRIDGE.md'-and$task151Result.actor-ceq'Codex'-and$task151Result.role-ceq'IMPLEMENTER'-and$task151Head-ceq$task151Tip-and$task151Result.task_id-ceq'TASK-151'-and$task151Dirty.Count-eq0) 'TASK-151 GO-only bridge reproduces BOM snapshot parse and fast-forward'

    $task151RunAgain=Invoke-ScriptResult (Join-Path $task151Runner 'tools/route-go.ps1') @('-ProjectRoot',$task151Runner,'-SessionActor','Codex','-SessionRole','IMPLEMENTER','-SessionMode','existing_session','-RoutingMode','local_script')
    if($task151RunAgain.ExitCode-ne0){throw "TASK-151 bridge reroute run failed: $($task151RunAgain.Output)"}
    $task151JsonAgain=@($task151RunAgain.Output-split'\r?\n'|Where-Object{$_-match'^\{'})|Select-Object -Last 1
    if([string]::IsNullOrWhiteSpace([string]$task151JsonAgain)){throw "TASK-151 bridge reroute result missing: $($task151RunAgain.Output)"}
    $task151ResultAgain=$task151JsonAgain|ConvertFrom-Json
    $task151HeadAgain=(Invoke-Git $task151Runner @('rev-parse','HEAD') 'TASK-151 bridge final identity')[-1].Trim()
    Assert ($task151RunAgain.ExitCode-eq0 -and $task151ResultAgain.outcome-ceq'ALLOW'-and$task151ResultAgain.task_id-ceq'TASK-151'-and$task151ResultAgain.phase-ceq'implementation'-and$task151ResultAgain.handoff_file-ceq'docs/ai/handoffs/TASK-151/BRIDGE.md'-and$task151ResultAgain.repository_changed -eq $false-and$task151HeadAgain-ceq$task151Tip) 'TASK-151 GO-only bridge reroutes with no new fast-forward on same commit'

    $task151IdentityMismatch=Invoke-ScriptResult (Join-Path $task151Runner 'tools/route-go.ps1') @('-ProjectRoot',$task151Runner,'-SessionActor','Codex','-SessionRole','IMPLEMENTER','-SessionMode','existing_session','-RoutingMode','local_script','-ExpectedNextActionBlob','ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    Assert ($task151IdentityMismatch.ExitCode-ne0-and$task151IdentityMismatch.Output-match 'connector snapshot identity mismatch: next_action_blob') 'TASK-151 bridge fails on expected blob identity mismatch'

    $task151ResolvedMismatch=Invoke-ScriptResult (Join-Path $task151Runner 'tools/route-go.ps1') @('-ProjectRoot',$task151Runner,'-SessionActor','Codex','-SessionRole','IMPLEMENTER','-SessionMode','existing_session','-RoutingMode','local_script','-ExpectedResolvedCommit','0000000000000000000000000000000000000000')
    Assert ($task151ResolvedMismatch.ExitCode-ne0-and$task151ResolvedMismatch.Output-match 'connector snapshot identity mismatch: resolved_commit') 'TASK-151 bridge fails on resolved commit identity mismatch'

    [IO.File]::WriteAllText((Join-Path $task151Runner 'docs/ai/CURRENT_STATE.md'),"active_tasks:`n  - TASK-151`nnext_action: dirty fixture`n",$utf8NoBom)
    $task151DirtyTree=Invoke-ScriptResult (Join-Path $task151Runner 'tools/route-go.ps1') @('-ProjectRoot',$task151Runner,'-SessionActor','Codex','-SessionRole','IMPLEMENTER','-SessionMode','existing_session','-RoutingMode','local_script','-ApplyChatGPTDocsBridge','-ExpectedRemoteTip',$task151Tip)
    Assert ($task151DirtyTree.ExitCode-ne0-and$task151DirtyTree.Output-match 'write bridge requires a clean worktree') 'TASK-151 bridge rejects dirty tree for explicit bridge'
    $null=Invoke-Git $task151Runner @('checkout','--','docs/ai/CURRENT_STATE.md') 'TASK-151 restore current state'

    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/CURRENT_STATE.md'),$task151CurrentBase,$utf8NoBom)
    [IO.File]::WriteAllText((Join-Path $task151Writer 'docs/ai/DIVERGED.md'),"diverged on writer`n",$utf8NoBom)
    $null=Invoke-Git $task151Writer @('add','docs/ai/DIVERGED.md') 'TASK-151 writer divergence path add'
    $null=Invoke-Git $task151Writer @('commit','-q','-m','TASK-151 divergence marker') 'TASK-151 writer divergence commit'
    $null=Invoke-Git $task151Writer @('push','-q','origin','codex/task-151-route-go-adapter-bom-boundary') 'TASK-151 divergence push'

    $null=Invoke-Git $task151Runner @('checkout','-q','-B','codex/task-151-route-go-adapter-bom-boundary',$task151Base) 'TASK-151 runner divergence setup'
    $null=Invoke-Git $task151Runner @('reset','--hard',$task151Base) 'TASK-151 runner divergence base'
    [IO.File]::WriteAllText((Join-Path $task151Runner 'docs/ai/CURRENT_STATE.md'),"active_tasks:`n  - TASK-151`nnext_action: divergent local history`n",$utf8NoBom)
    $null=Invoke-Git $task151Runner @('add','docs/ai/CURRENT_STATE.md') 'TASK-151 runner divergence working state'
    $null=Invoke-Git $task151Runner @('commit','-q','-m','TASK-151 local divergence fixture') 'TASK-151 runner divergence source commit'
    $task151Divergence=Invoke-ScriptResult (Join-Path $task151Runner 'tools/route-go.ps1') @('-ProjectRoot',$task151Runner,'-SessionActor','Codex','-SessionRole','IMPLEMENTER','-SessionMode','existing_session','-RoutingMode','local_script')
    Assert ($task151Divergence.ExitCode-ne0-and$task151Divergence.Output-match 'write bridge rejects a diverged or non-fast-forward history') 'TASK-151 bridge rejects diverged local history'
    $null=Invoke-Git $task151Runner @('checkout','-q','-B','codex/task-151-route-go-adapter-bom-boundary',$task151Tip) 'TASK-151 runner divergence cleanup'

    $unauthorizedBranch='codex/task-151-route-go-adapter-bom-boundary-unauthorized'
    $null=Invoke-Git $task151Writer @('reset','--hard',$task151Tip) 'TASK-151 writer reset for unauthorized path test'
    $null=Invoke-Git $task151Writer @('checkout','-q','-B',$unauthorizedBranch,$task151Tip) 'TASK-151 writer unauthorized branch checkout'
    $null=Invoke-Git $task151Writer @('push','-q','-u','origin',$unauthorizedBranch) 'TASK-151 writer unauthorized branch push'
    $null=Invoke-Git $task151Runner @('checkout','-q','-B',$unauthorizedBranch,$task151Tip) 'TASK-151 runner unauthorized branch checkout'
    [IO.File]::WriteAllText((Join-Path $task151Writer 'tools/route-go.ps1'),"function DivergedRouteGoPlaceholder {}`n",$utf8NoBom)
    $null=Invoke-Git $task151Writer @('add','tools/route-go.ps1') 'TASK-151 writer unauthorized path add'
    $null=Invoke-Git $task151Writer @('commit','-q','-m','TASK-151 bridge unauthorized path') 'TASK-151 writer unauthorized path commit'
    $null=Invoke-Git $task151Writer @('push','-q','origin',$unauthorizedBranch) 'TASK-151 writer unauthorized path push'
    $null=Invoke-Git $task151Runner @('reset','--hard',$task151Tip) 'TASK-151 runner reset for unauthorized test'
    $task151Unauthorized=Invoke-ScriptResult (Join-Path $task151Runner 'tools/route-go.ps1') @('-ProjectRoot',$task151Runner,'-SessionActor','Codex','-SessionRole','IMPLEMENTER','-SessionMode','existing_session','-RoutingMode','local_script')
    if($task151Unauthorized.ExitCode-eq0){
        $task151UnauthorizedOutput=($task151Unauthorized.Output -join "`n")
        throw "TASK-151 unauthorized path expected denial, got ALLOW`nOutput:`n$task151UnauthorizedOutput"
    }
    if($task151Unauthorized.Output -notmatch "write bridge rejects non-authorized remote path: tools/route-go.ps1"){
        $task151UnauthorizedOutput=($task151Unauthorized.Output -join "`n")
        throw "TASK-151 unauthorized path unexpected output:`n$task151UnauthorizedOutput"
    }
    Assert ($task151Unauthorized.ExitCode-ne0-and$task151Unauthorized.Output-match "write bridge rejects non-authorized remote path: tools/route-go.ps1") 'TASK-151 bridge rejects unauthorized path change'

    $task151Race=Invoke-ScriptResult (Join-Path $task151Runner 'tools/route-go.ps1') @('-ProjectRoot',$task151Runner,'-SessionActor','Codex','-SessionRole','IMPLEMENTER','-SessionMode','existing_session','-RoutingMode','local_script','-ApplyChatGPTDocsBridge','-ExpectedRemoteTip',$task151Tip)
    Assert ($task151Race.ExitCode-ne0-and$task151Race.Output-match 'write bridge remote tip does not match the approved identity') 'TASK-151 bridge detects remote race on approved remote tip mismatch'
} finally { Remove-TestRoot $task151BridgeRoot }

$tokens=$null;$parseErrors=$null;$relayAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $root 'tools/relay-bundle.ps1'),[ref]$tokens,[ref]$parseErrors)
$normalizerAst=$relayAst.Find({param($node)$node-is[Management.Automation.Language.FunctionDefinitionAst]-and$node.Name-ceq'Normalize-OptionalCollection'},$true)
Assert ($parseErrors.Count-eq0-and$null-ne$normalizerAst) 'optional collection normalizer is parseable'
. ([ScriptBlock]::Create($normalizerAst.Extent.Text))
$dispositionCases=@(
    [pscustomobject]@{Name='null';Value=$null;Expected=0},
    [pscustomobject]@{Name='empty';Value=[object[]]@();Expected=0},
    [pscustomobject]@{Name='one';Value=[object[]]@([pscustomobject]@{finding_id='FINDING-1'});Expected=1},
    [pscustomobject]@{Name='multiple';Value=[object[]]@([pscustomobject]@{finding_id='FINDING-1'},[pscustomobject]@{finding_id='FINDING-2'});Expected=2}
)
foreach($case in $dispositionCases){$normalizedCollection=Normalize-OptionalCollection $case.Value;Assert ($normalizedCollection.Count-eq$case.Expected) "optional disposition count $($case.Name)"}

$taskHistoryRoot=New-TestRoot 'retained-task-history'
try{
    $seed=Join-Path $taskHistoryRoot 'seed';Initialize-TaskHistoryProject $seed $true
    Write-RetainedTask $seed 'TASK-001' 'TASK-001' 'completed' 'complete'
    Write-RetainedTask $seed 'TASK-002' 'TASK-002' 'completed' 'complete'
    $zeroValidation=Invoke-ProjectValidation $seed;if($zeroValidation.ExitCode-ne0){throw "zero-active retained project validation failed:`n$($zeroValidation.Output)"};Assert $true 'retain_validated zero-active TASK history'
    $sourcePresent=@(& (Join-Path $root 'tools/sync-project.ps1') -ProjectRoot $seed -SharedRoot $root -Check 2>&1);$sourcePresentExit=$LASTEXITCODE;Assert ($sourcePresentExit-eq0) 'source-present retained project snapshot check'
    $sourceLess=@(& (Join-Path $seed 'docs/ai/generated/shared/tools/sync-project.ps1') -ProjectRoot $seed -SharedRoot (Join-Path $seed '__shared_source_absent__') -Check 2>&1);$sourceLessExit=$LASTEXITCODE;Assert ($sourceLessExit-eq0) 'source-less retained project snapshot check'

    $adapterPath=Join-Path $seed 'docs/ai/PROJECT_ADAPTER.psd1';$adapterValid=[IO.File]::ReadAllBytes($adapterPath);$taskOnePath=Join-Path $seed 'docs/ai/tasks/TASK-001.md';$taskOneValid=[IO.File]::ReadAllBytes($taskOnePath)
    $adapterText=[IO.File]::ReadAllText($adapterPath);$legacyText=[regex]::Replace($adapterText,'(?ms)^\s*TaskHistory\s*=\s*@\{.*?^\s*\}\r?\n','',1);[IO.File]::WriteAllText($adapterPath,$legacyText,$utf8Bom)
    $legacy=Invoke-ProjectValidation $seed;Assert ($legacy.ExitCode-ne0-and$legacy.Output-match'inactive TASK artifact remains') 'legacy inactive TASK rejection'
    [IO.File]::WriteAllBytes($adapterPath,$adapterValid);Set-FixtureAdapterTaskHistory $seed 'git_only' '@()';$gitOnly=Invoke-ProjectValidation $seed;Assert ($gitOnly.ExitCode-ne0-and$gitOnly.Output-match'inactive TASK artifact remains') 'explicit git_only inactive TASK rejection'
    [IO.File]::WriteAllBytes($adapterPath,$adapterValid)

    Write-RetainedTask $seed 'TASK-001' 'TASK-001' 'completed' 'wrong_phase';$stateMismatch=Invoke-ProjectValidation $seed;Assert ($stateMismatch.ExitCode-ne0-and$stateMismatch.Output-match'retained TASK state is not allowed') 'retained state mismatch rejection'
    Write-RetainedTask $seed 'TASK-001' 'TASK-999' 'completed' 'complete';$idMismatch=Invoke-ProjectValidation $seed;Assert ($idMismatch.ExitCode-ne0-and$idMismatch.Output-match'task_id does not match filename') 'retained task_id mismatch rejection'
    [IO.File]::WriteAllText($taskOnePath,"---`ntask_id: TASK-001`ntask_id: TASK-001`nstatus: completed`ncurrent_phase: complete`n---`n",$utf8NoBom);$duplicateFrontmatter=Invoke-ProjectValidation $seed;Assert ($duplicateFrontmatter.ExitCode-ne0-and$duplicateFrontmatter.Output-match"Duplicate 'task_id'") 'duplicate retained frontmatter rejection'
    [IO.File]::WriteAllText($taskOnePath,"task_id: TASK-001`nstatus: completed`ncurrent_phase: complete`n",$utf8NoBom);$malformedFrontmatter=Invoke-ProjectValidation $seed;Assert ($malformedFrontmatter.ExitCode-ne0-and$malformedFrontmatter.Output-match'malformed retained TASK frontmatter') 'malformed retained frontmatter rejection'
    [IO.File]::WriteAllText($taskOnePath,"---`ntask_id: TASK-001`nstatus: completed`n---`n",$utf8NoBom);$missingFrontmatter=Invoke-ProjectValidation $seed;Assert ($missingFrontmatter.ExitCode-ne0-and$missingFrontmatter.Output-match"Missing 'current_phase'") 'missing retained frontmatter field rejection'
    Write-RetainedTask $seed 'TASK-001' 'TASK-001' 'ready' 'implementation';$nonterminal=Invoke-ProjectValidation $seed;Assert ($nonterminal.ExitCode-ne0-and$nonterminal.Output-match'retained TASK state is not allowed') 'nonterminal retained state rejection'
    [IO.File]::WriteAllBytes($taskOnePath,$taskOneValid)
    Write-RetainedTask $seed 'TASK-ABC' 'TASK-ABC' 'completed' 'complete';$invalidFilename=Invoke-ProjectValidation $seed;Assert ($invalidFilename.ExitCode-ne0-and$invalidFilename.Output-match'retained TASK filename is invalid') 'retained TASK filename rejection';Remove-Item -LiteralPath (Join-Path $seed 'docs/ai/tasks/TASK-ABC.md') -Force

    foreach($invalid in @(
        [pscustomobject]@{Name='unknown policy';Policy='unknown';States='@()';Pattern='invalid CompletedTaskFilePolicy'},
        [pscustomobject]@{Name='policy case mismatch';Policy='RETAIN_VALIDATED';States="@(@{ Status='completed'; Phase='complete' })";Pattern='invalid CompletedTaskFilePolicy'},
        [pscustomobject]@{Name='policy mixed-case mismatch';Policy='Git_Only';States='@()';Pattern='invalid CompletedTaskFilePolicy'},
        [pscustomobject]@{Name='empty states';Policy='retain_validated';States='@()';Pattern='requires at least one'},
        [pscustomobject]@{Name='duplicate pair';Policy='retain_validated';States="@(@{ Status='completed'; Phase='complete' },@{ Status='completed'; Phase='complete' })";Pattern='duplicate RetainedTaskStates pair'},
        [pscustomobject]@{Name='unknown phase';Policy='retain_validated';States="@(@{ Status='completed'; Phase='missing_phase' })";Pattern='not declared in PhaseLabels'},
        [pscustomobject]@{Name='phase key case mismatch';Policy='retain_validated';States="@(@{ Status='completed'; Phase='Complete' })";Pattern='not declared in PhaseLabels'},
        [pscustomobject]@{Name='placeholder status';Policy='retain_validated';States="@(@{ Status='none'; Phase='complete' })";Pattern='non-empty exact scalar values'},
        [pscustomobject]@{Name='wildcard scalar';Policy='retain_validated';States="@(@{ Status='completed*'; Phase='complete' })";Pattern='non-empty exact scalar values'},
        [pscustomobject]@{Name='placeholder scalar';Policy='retain_validated';States="@(@{ Status='<completed>'; Phase='complete' })";Pattern='non-empty exact scalar values'},
        [pscustomobject]@{Name='extra state key';Policy='retain_validated';States="@(@{ Status='completed'; Phase='complete'; Match='broad' })";Pattern='exactly Status and Phase'}
    )){[IO.File]::WriteAllBytes($adapterPath,$adapterValid);Set-FixtureAdapterTaskHistory $seed $invalid.Policy $invalid.States;$invalidResult=Invoke-ProjectValidation $seed;Assert ($invalidResult.ExitCode-ne0-and$invalidResult.Output-match$invalid.Pattern) "invalid adapter policy: $($invalid.Name)"}
    [IO.File]::WriteAllBytes($adapterPath,$adapterValid);$tbdAdapter=[IO.File]::ReadAllText($adapterPath).Replace('PhaseLabels = @{',"PhaseLabels = @{`n        tbd='TBD'");[IO.File]::WriteAllText($adapterPath,$tbdAdapter,$utf8Bom);Set-FixtureAdapterTaskHistory $seed 'retain_validated' "@(@{ Status='completed'; Phase='tbd' })";$placeholderPhase=Invoke-ProjectValidation $seed;Assert ($placeholderPhase.ExitCode-ne0-and$placeholderPhase.Output-match'non-empty exact scalar values') 'invalid adapter policy: placeholder phase'
    [IO.File]::WriteAllBytes($adapterPath,$adapterValid)
    foreach($kind in @('handoffs','reports')){$inactiveDir=Join-Path $seed "docs/ai/$kind/TASK-001";[IO.Directory]::CreateDirectory($inactiveDir)|Out-Null;[IO.File]::WriteAllText((Join-Path $inactiveDir 'history.md'),"history`n",$utf8NoBom);$inactiveResult=Invoke-ProjectValidation $seed;Assert ($inactiveResult.ExitCode-ne0-and$inactiveResult.Output-match'inactive TASK artifact remains') "inactive $kind directory rejection";Remove-Item -LiteralPath $inactiveDir -Recurse -Force}

    $baseCandidate=(Invoke-Git $seed @('rev-parse','HEAD') 'retained fixture base candidate')[-1].Trim();$sharedCandidate=(Invoke-Git $root @('rev-parse','HEAD') 'retained fixture shared candidate')[-1].Trim()
    [IO.File]::WriteAllText((Join-Path $seed 'docs/ai/CURRENT_STATE.md'),"---`nupdated_at: 2026-08-09`nactive_tasks:`n  - TASK-004`nnext_action: Review TASK-004 fixture`nreview_stage: implementation`nchanges_requested_cycles: 0`nimplementation_review_attempt: 1`nimplementation_review_profile: standard`nimplementation_review_terminated: false`n---`n",$utf8NoBom)
    $activeTask="---`ntask_id: TASK-004`ntitle: Relay compatibility fixture`nstatus: review_requested`nspec_revision: 1`ncurrent_phase: implementation_review`ncurrent_role_id: ORCHESTRATOR_AND_REVIEWER`nnext_actor: ChatGPT`nnext_role: ORCHESTRATOR_AND_REVIEWER`nassigned_model: chatgpt-model`nassigned_effort: high`nsession_mode: existing`nhandoff_file: docs/ai/handoffs/TASK-004/IMPLEMENTATION_REVIEW_HANDOFF.md`npreferred_executor: Claude`nallowed_executors: Claude, ChatGPT`nexecutor_policy: preferred_fallback`nreturn_to: user`nreviewed_candidate: $baseCandidate`nreview_stage: implementation`nchanges_requested_cycles: 0`nimplementation_review_attempt: 1`nimplementation_review_profile: standard`nimplementation_review_terminated: false`nupdated_at: 2026-08-09`n---`n`n# TASK-004`n"
    [IO.File]::WriteAllText((Join-Path $seed 'docs/ai/tasks/TASK-004.md'),$activeTask,$utf8NoBom);[IO.Directory]::CreateDirectory((Join-Path $seed 'docs/ai/handoffs/TASK-004'))|Out-Null;[IO.Directory]::CreateDirectory((Join-Path $seed 'docs/ai/reports/TASK-004'))|Out-Null
    $currentHandoff="- task_id: TASK-004`n- phase: implementation_review`n- actor: ChatGPT`n- role: ORCHESTRATOR_AND_REVIEWER`n- model: chatgpt-model`n- effort: high`n- candidate_commit: $baseCandidate`n- implementation_candidate: $baseCandidate`n- shared_candidate: $sharedCandidate`n- review_stage: implementation`n- changes_requested_cycles: 0`n- implementation_review_attempt: 1`n- implementation_review_profile: standard`n- implementation_review_terminated: false`n"
    $currentReport="# RELAY IMPORT — TASK-004`n`n- review_stage: implementation`n- changes_requested_cycles: 0`n- implementation_review_attempt: 1`n- implementation_review_profile: standard`n- implementation_review_terminated: false`n"
    [IO.File]::WriteAllText((Join-Path $seed 'docs/ai/handoffs/TASK-004/IMPLEMENTATION_REVIEW_HANDOFF.md'),$currentHandoff,$utf8NoBom);[IO.File]::WriteAllText((Join-Path $seed 'docs/ai/reports/TASK-004/BASELINE.md'),"# baseline report`n",$utf8NoBom);[IO.File]::WriteAllText((Join-Path $seed 'docs/ai/reports/TASK-004/RELAY_IMPORT.md'),$currentReport,$utf8NoBom)
    & (Join-Path $seed 'tools/generate-next-action.ps1')|Out-Null;& (Join-Path $seed 'tools/generate-progress.ps1')|Out-Null
    $null=Invoke-Git $seed @('add','-A') 'retained active fixture add';$null=Invoke-Git $seed @('commit','-q','-m','retained active fixture') 'retained active fixture commit';$handoffHead=(Invoke-Git $seed @('rev-parse','HEAD') 'retained handoff HEAD')[-1].Trim()
    $activeValidation=Invoke-ProjectValidation $seed;if($activeValidation.ExitCode-ne0){throw "active retained project validation failed:`n$($activeValidation.Output)"};Assert $true 'retain_validated active TASK with completed history'

    $bundle=[IO.File]::ReadAllText((Join-Path $root 'templates/RELAY_BUNDLE.json'))|ConvertFrom-Json
    $bundle.PSObject.Properties.Remove('routing_mode');$bundle.PSObject.Properties.Remove('route_result');$bundle.task_id='TASK-004';$bundle.repository='owner/fixture';$bundle.branch='codex/task-004';$bundle.reviewed_candidate=$baseCandidate;$bundle.reviewed_handoff_head=$handoffHead;$bundle.shared_candidate=$sharedCandidate;$bundle.decision='CHANGES_REQUESTED';$bundle.review_stage='implementation';$bundle.next_phase='implementation';$bundle.next_actor='Codex';$bundle.next_role='IMPLEMENTER';$bundle.model='codex-model';$bundle.effort='high';$bundle.created_at='2026-08-09 00:00:00 JST'
    $bundlePath=Join-Path $taskHistoryRoot 'changes-requested.json';[IO.File]::WriteAllText($bundlePath,($bundle|ConvertTo-Json -Depth 20),$utf8NoBom);$bundleSha=(Get-FileHash -Algorithm SHA256 -LiteralPath $bundlePath).Hash;$bundleBytes=(Get-Item -LiteralPath $bundlePath).Length
    $preflightSources=@(
        [pscustomobject]@{Name='TASK';Relative='docs/ai/tasks/TASK-004.md'},
        [pscustomobject]@{Name='CURRENT_STATE';Relative='docs/ai/CURRENT_STATE.md'},
        [pscustomobject]@{Name='NEXT_ACTION';Relative='docs/ai/NEXT_ACTION.yml'},
        [pscustomobject]@{Name='handoff';Relative='docs/ai/handoffs/TASK-004/IMPLEMENTATION_REVIEW_HANDOFF.md'},
        [pscustomobject]@{Name='report';Relative='docs/ai/reports/TASK-004/RELAY_IMPORT.md'}
    )
    $preflightFields=@('review_stage','changes_requested_cycles','implementation_review_attempt','implementation_review_profile','implementation_review_terminated')
    $preflightMismatchValues=@{review_stage='design';changes_requested_cycles='1';implementation_review_attempt='2';implementation_review_profile='terminal';implementation_review_terminated='true'}
    function New-PreflightProject([string]$Name){
        $project=Join-Path $taskHistoryRoot "preflight-$Name";$null=@(& git clone --no-checkout --quiet $seed $project 2>&1);if($LASTEXITCODE-ne0){throw "preflight fixture clone failed: $Name"}
        $null=Invoke-Git $project @('config','core.autocrlf','false') "preflight autocrlf $Name";$null=Invoke-Git $project @('config','user.name','TASK-154 preflight simulation') "preflight user $Name";$null=Invoke-Git $project @('config','user.email','task154-preflight@example.invalid') "preflight email $Name";$null=Invoke-Git $project @('checkout','-q','codex/task-004') "preflight checkout $Name";$null=Invoke-Git $project @('remote','set-url','origin','https://github.com/owner/fixture.git') "preflight remote $Name"
        $project
    }
    function Set-PreflightField([string]$Project,[string]$Relative,[string]$Field,[string]$Mode,[string]$Value=''){
        $path=Join-Path $Project $Relative;$text=[IO.File]::ReadAllText($path);$pattern="(?m)^(\s*(?:-\s*)?$([regex]::Escape($Field)):\s*).*?$";$matches=[regex]::Matches($text,$pattern);if($matches.Count-ne1){throw "preflight mutation expected exactly one $Field in $Relative"};$match=$matches[0]
        if($Mode-ceq'missing'){$start=$match.Index;$length=$match.Length;if($start+$length-lt$text.Length-and$text[$start+$length]-eq"`r"){$length++};if($start+$length-lt$text.Length-and$text[$start+$length]-eq"`n"){$length++};$text=$text.Remove($start,$length)}
        elseif($Mode-ceq'mismatch'){$prefix=$match.Groups[1].Value;$text=$text.Remove($match.Index,$match.Length).Insert($match.Index,$prefix+$Value)}
        elseif($Mode-ceq'duplicate'){$text=$text.Remove($match.Index,$match.Length).Insert($match.Index,$match.Value+"`n"+$match.Value)}
        else{throw "unknown preflight mutation mode: $Mode"}
        [IO.File]::WriteAllText($path,$text,$utf8NoBom)
    }
    function Write-PreflightBundle([string]$Path,[string]$Head){$copy=(($bundle|ConvertTo-Json -Depth 30)|ConvertFrom-Json);$copy.reviewed_handoff_head=$Head;[IO.File]::WriteAllText($Path,($copy|ConvertTo-Json -Depth 30),$utf8NoBom)}
    function Assert-PreflightRejected([string]$Project,[string]$Path,[string]$Name){
        $before=Get-ProjectByteSnapshot $Project;$sha=(Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash;$bytes=(Get-Item -LiteralPath $Path).Length;$result=Invoke-ScriptResult (Join-Path $Project 'docs/ai/generated/shared/tools/relay-bundle.ps1') @('-Action','Import','-ProjectRoot',$Project,'-BundlePath',$Path,'-ExpectedSha256',$sha,'-ExpectedBytes',[string]$bytes);$after=Get-ProjectByteSnapshot $Project;$status=@(& git -C $Project status --porcelain=v1 --untracked-files=all)
        Assert ($result.ExitCode-ne0-and(Test-ProjectByteSnapshot $before $after)-and$status.Count-eq0) "$Name rejected pre-write with exact bytes, git status, and directories"
    }
    foreach($mode in @('missing','mismatch','duplicate')){
        foreach($source in $preflightSources){
            foreach($field in $preflightFields){
                $name="$mode-$($source.Name)-$field";$project=New-PreflightProject $name;Set-PreflightField $project $source.Relative $field $mode ([string]$preflightMismatchValues[$field]);$null=Invoke-Git $project @('add','-A') "preflight add $name";$null=Invoke-Git $project @('commit','-q','-m',$name) "preflight commit $name";$head=(Invoke-Git $project @('rev-parse','HEAD') "preflight head $name")[-1].Trim();$caseBundle=Join-Path $taskHistoryRoot "$name.json";Write-PreflightBundle $caseBundle $head;Assert-PreflightRejected $project $caseBundle "preflight $mode $($source.Name) $field"
            }
        }
    }
    $invalidCombination=New-PreflightProject 'invalid-combination';foreach($source in $preflightSources){Set-PreflightField $invalidCombination $source.Relative 'changes_requested_cycles' 'mismatch' '1'};$null=Invoke-Git $invalidCombination @('add','-A') 'invalid combination add';$null=Invoke-Git $invalidCombination @('commit','-q','-m','invalid convergence combination') 'invalid combination commit';$invalidHead=(Invoke-Git $invalidCombination @('rev-parse','HEAD') 'invalid combination head')[-1].Trim();$invalidBundle=Join-Path $taskHistoryRoot 'invalid-combination.json';Write-PreflightBundle $invalidBundle $invalidHead;Assert-PreflightRejected $invalidCombination $invalidBundle 'preflight invalid state combination'
    $invalidRoute=New-PreflightProject 'invalid-terminal-route';$terminalValues=@{review_stage='implementation';changes_requested_cycles='3';implementation_review_attempt='3';implementation_review_profile='terminal';implementation_review_terminated='true'};foreach($source in $preflightSources){foreach($field in $preflightFields){Set-PreflightField $invalidRoute $source.Relative $field 'mismatch' ([string]$terminalValues[$field])}};$invalidRouteHandoff=Join-Path $invalidRoute 'docs/ai/handoffs/TASK-004/IMPLEMENTATION_REVIEW_HANDOFF.md';[IO.File]::AppendAllText($invalidRouteHandoff,"- decision: NEEDS_USER_DECISION`n",$utf8NoBom);$null=Invoke-Git $invalidRoute @('add','-A') 'invalid route add';$null=Invoke-Git $invalidRoute @('commit','-q','-m','invalid terminated route') 'invalid route commit';$invalidRouteHead=(Invoke-Git $invalidRoute @('rev-parse','HEAD') 'invalid route head')[-1].Trim();$invalidRouteBundle=Join-Path $taskHistoryRoot 'invalid-terminal-route.json';Write-PreflightBundle $invalidRouteBundle $invalidRouteHead;Assert-PreflightRejected $invalidRoute $invalidRouteBundle 'preflight invalid terminal route combination'
    foreach($case in @('success','after_writes','after_next_action')){
        $project=Join-Path $taskHistoryRoot $case;$null=@(& git clone --no-checkout --quiet $seed $project 2>&1);if($LASTEXITCODE-ne0){throw "retained relay clone failed: $case"};$null=Invoke-Git $project @('config','core.autocrlf','false') "retained relay autocrlf $case";$null=Invoke-Git $project @('checkout','-q','codex/task-004') "retained relay checkout $case";$null=Invoke-Git $project @('remote','set-url','origin','https://github.com/owner/fixture.git') "retained relay remote $case"
        $before=Get-ProjectByteSnapshot $project;$retainedOne=[IO.File]::ReadAllBytes((Join-Path $project 'docs/ai/tasks/TASK-001.md'));$retainedTwo=[IO.File]::ReadAllBytes((Join-Path $project 'docs/ai/tasks/TASK-002.md'));$args=@('-Action','Import','-ProjectRoot',$project,'-BundlePath',$bundlePath,'-ExpectedSha256',$bundleSha,'-ExpectedBytes',[string]$bundleBytes);if($case-cne'success'){$args+=@('-FailureInjection',$case)};$import=Invoke-ScriptResult (Join-Path $project 'docs/ai/generated/shared/tools/relay-bundle.ps1') $args
        if($case-ceq'success'){$postValidation=Invoke-ProjectValidation $project;$retainedExact=([Convert]::ToBase64String($retainedOne)-ceq[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $project 'docs/ai/tasks/TASK-001.md'))))-and([Convert]::ToBase64String($retainedTwo)-ceq[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $project 'docs/ai/tasks/TASK-002.md'))));if($import.ExitCode-ne0-or$postValidation.ExitCode-ne0-or-not$retainedExact){throw "retained relay success failed: import=$($import.ExitCode) retained=$retainedExact`nIMPORT:`n$($import.Output)`nVALIDATION:`n$($postValidation.Output)"};Assert $true 'relay import preserves retained TASK history and validates synchronized state'}else{$after=Get-ProjectByteSnapshot $project;$status=@(& git -C $project status --porcelain=v1 --untracked-files=all);Assert ($import.ExitCode-ne0-and$import.Output-match'injected relay failure'-and(Test-ProjectByteSnapshot $before $after)-and$status.Count-eq0) "relay rollback $case is byte-exact with retained TASK history"}
    }

    function New-ConvergenceBundle($Template,$Finding,[int]$SpecRevision,[string]$ReviewedHead,$Reset){
        $copy=(($Template|ConvertTo-Json -Depth 30)|ConvertFrom-Json)
        $copy.PSObject.Properties.Remove('routing_mode');$copy.PSObject.Properties.Remove('route_result')
        $copy.task_id='TASK-004';$copy.repository='owner/fixture';$copy.branch='codex/task-004';$copy.reviewed_candidate=$baseCandidate;$copy.reviewed_handoff_head=$ReviewedHead;$copy.shared_candidate=$sharedCandidate
        $copy.decision='CHANGES_REQUESTED';$copy.review_stage='implementation';$copy.next_phase='implementation';$copy.next_actor='Codex';$copy.next_role='IMPLEMENTER';$copy.model='codex-model';$copy.effort='high';$copy.spec_revision=$SpecRevision;$copy.created_at='2026-08-09 00:00:00 JST';$copy.findings=@($Finding);$copy.finding_dispositions=$null;$copy.independent_review=$null;$copy.independent_review_result=$null;$copy.requirements=$null
        if($null-eq$Reset){$copy.spec_revision_reset=$null}else{$copy.spec_revision_reset=$Reset}
        return $copy
    }
    function Write-ConvergenceBundle([string]$Path,$Template,$Finding,[int]$SpecRevision,[string]$ReviewedHead,$Reset){
        $copy=New-ConvergenceBundle $Template $Finding $SpecRevision $ReviewedHead $Reset;[IO.File]::WriteAllText($Path,($copy|ConvertTo-Json -Depth 30),$utf8NoBom)
    }
    function Commit-Convergence([string]$Project,[string]$Message){$null=Invoke-Git $Project @('add','-A') "convergence add $Message";$null=Invoke-Git $Project @('commit','-q','-m',$Message) "convergence commit $Message"}
    function Read-ConvergenceValue([string]$Text,[string]$Key,[string]$Source){
        $matches=[regex]::Matches($Text,"(?m)^\s*(?:-\s*)?$([regex]::Escape($Key)):\s*(.*?)\s*$")
        if($matches.Count-eq0){return $null}
        if($matches.Count-ne1){throw "$Source must contain exactly one $Key"}
        return $matches[0].Groups[1].Value.Trim()
    }
    function Set-ConvergenceContext([string]$Project,[string[]]$RequiredChanges,[string[]]$DispositionAudit){
        $taskText=[IO.File]::ReadAllText((Join-Path $Project 'docs/ai/tasks/TASK-004.md'));$handoffMatch=[regex]::Match($taskText,'(?m)^handoff_file:\s*(.*?)\s*$');if(-not$handoffMatch.Success){throw 'convergence task handoff_file missing'};$handoffPath=Join-Path $Project $handoffMatch.Groups[1].Value.Trim()
        if(-not(Test-Path -LiteralPath $handoffPath -PathType Leaf)){throw "convergence handoff missing: $handoffPath"}
        $requiredLines=if($null-eq$RequiredChanges-or$RequiredChanges.Count-eq0){@('none')}else{@($RequiredChanges|ForEach-Object{([string]$_).Trim()})}
        if($requiredLines.Count-eq0){$requiredLines=@('none')}
        $dispositionLines=if($null-eq$DispositionAudit-or$DispositionAudit.Count-eq0){@('none')}else{@($DispositionAudit|ForEach-Object{([string]$_).Trim()})}
        if($dispositionLines.Count-eq0){$dispositionLines=@('none')}
        $text=[IO.File]::ReadAllText($handoffPath)
        $requiredReplacement=(($requiredLines|ForEach-Object{"- $_"}) -join "`r`n")
        $dispositionReplacement=(($dispositionLines|ForEach-Object{"- $_"}) -join "`r`n")
        $replacementCount=0
        $requiredPattern='(?ms)^(## Required changes\r?\n)(?<body>.*?)(^## User decisions required)'
        $requiredMatchEvaluator=[System.Text.RegularExpressions.MatchEvaluator]{
            param($match)
            $replacementCount++
            "$($match.Groups[1].Value)$requiredReplacement`r`n`r`n$($match.Groups[2].Value)"
        }
        $text=[regex]::Replace($text,$requiredPattern,$requiredMatchEvaluator)
        $dispositionPattern='(?ms)^(## Independent review disposition audit\r?\n)(?<body>.*?)(^## Acceptance criteria)'
        $dispositionMatchEvaluator=[System.Text.RegularExpressions.MatchEvaluator]{
            param($match)
            $replacementCount++
            "$($match.Groups[1].Value)$dispositionReplacement`r`n`r`n$($match.Groups[2].Value)"
        }
        $text=[regex]::Replace($text,$dispositionPattern,$dispositionMatchEvaluator)
        if($replacementCount -lt 2){
            $insert='## Required changes`r`n`r`n' + $requiredReplacement + "`r`n`r`n## User decisions required`r`n`r`n- none`r`n`r`n## Independent review disposition audit`r`n`r`n" + $dispositionReplacement + "`r`n`r`n"
            $anchor='(?m)^## Acceptance criteria\s*$'
            if([regex]::IsMatch($text,$anchor)){$text=[regex]::Replace($text,$anchor,($insert+'## Acceptance criteria'),1)}else{$text=[regex]::Replace($text,'(?ms)^## Required changes\s*\r?\n.*?(?=^##\s+|\z)','');$text=[regex]::Replace($text,'(?ms)^## Independent review disposition audit\s*\r?\n.*?(?=^##\s+|\z)','');$text=$text.TrimEnd()+"`r`n`r`n"+$insert}
        }
        [IO.File]::WriteAllText($handoffPath,$text,$utf8NoBom)
    }
    function Invoke-ConvergenceImport([string]$Project,[string]$BundlePath,[string]$Name,[int]$ExpectedCycles,[int]$ExpectedAttempt,[string]$ExpectedProfile,[string]$ExpectedTerminated,[bool]$ShouldPass,[string]$ExpectedStage='implementation'){
        $before=Get-ProjectByteSnapshot $Project;$sha=(Get-FileHash -Algorithm SHA256 -LiteralPath $BundlePath).Hash;$bytes=(Get-Item -LiteralPath $BundlePath).Length;$args=@('-Action','Import','-ProjectRoot',$Project,'-BundlePath',$BundlePath,'-ExpectedSha256',$sha,'-ExpectedBytes',[string]$bytes);$result=Invoke-ScriptResult (Join-Path $Project 'docs/ai/generated/shared/tools/relay-bundle.ps1') $args;$after=Get-ProjectByteSnapshot $Project;$status=@(& git -C $Project status --porcelain=v1 --untracked-files=all)
        if($ShouldPass){
            $taskText=[IO.File]::ReadAllText((Join-Path $Project 'docs/ai/tasks/TASK-004.md'));$stateText=[IO.File]::ReadAllText((Join-Path $Project 'docs/ai/CURRENT_STATE.md'));$nextText=[IO.File]::ReadAllText((Join-Path $Project 'docs/ai/NEXT_ACTION.yml'))
            $handoffRelative=Read-ConvergenceValue $taskText 'handoff_file' 'TASK';$handoffText=[IO.File]::ReadAllText((Join-Path $Project $handoffRelative));$reportText=[IO.File]::ReadAllText((Join-Path $Project 'docs/ai/reports/TASK-004/RELAY_IMPORT.md'))
            $expected=[ordered]@{review_stage=$ExpectedStage;changes_requested_cycles=[string]$ExpectedCycles;implementation_review_attempt=[string]$ExpectedAttempt;implementation_review_profile=$ExpectedProfile;implementation_review_terminated=$ExpectedTerminated}
            $sources=[ordered]@{TASK=$taskText;CURRENT_STATE=$stateText;NEXT_ACTION=$nextText;handoff=$handoffText;report=$reportText};$synchronized=$true
            foreach($field in $expected.Keys){
                foreach($source in $sources.GetEnumerator()){
                    $value=Read-ConvergenceValue $source.Value $field $source.Key
                    if($null-eq$value-or$value-cne[string]$expected[$field]){$synchronized=$false}
                }
            }
            if(-not($result.ExitCode-eq0-and$synchronized)){throw "$Name failed: exit=$($result.ExitCode) synchronized=$synchronized`n$($result.Output)"}
            Assert $true "$Name; TASK/CURRENT_STATE/NEXT_ACTION/handoff/report exact and generated report populated"
        }else{if(-not($result.ExitCode-ne0-and(Test-ProjectByteSnapshot $before $after)-and$status.Count-eq0)){throw "$Name failed: exit=$($result.ExitCode) status=$($status.Count)`n$($result.Output)"};Assert $true $Name}
        return $result
    }
    $convergenceProject=Join-Path $taskHistoryRoot 'convergence';$null=@(& git clone --no-checkout --quiet $seed $convergenceProject 2>&1);if($LASTEXITCODE-ne0){throw 'convergence fixture clone failed'};$null=Invoke-Git $convergenceProject @('config','core.autocrlf','false') 'convergence autocrlf';$null=Invoke-Git $convergenceProject @('config','user.name','TASK-154 simulation') 'convergence user';$null=Invoke-Git $convergenceProject @('config','user.email','task154@example.invalid') 'convergence email';$null=Invoke-Git $convergenceProject @('checkout','-q','codex/task-004') 'convergence checkout';$null=Invoke-Git $convergenceProject @('remote','set-url','origin','https://github.com/owner/fixture.git') 'convergence remote'
    $convergenceBundlePath=Join-Path $taskHistoryRoot 'convergence.json';$head=(Invoke-Git $convergenceProject @('rev-parse','HEAD') 'convergence head one')[-1].Trim();$f1=[pscustomobject]@{id='FINDING-154-01';severity='MAJOR';target='validator';problem='first finding';evidence='first evidence';impact='first impact';required_change='first change';review_scope='required_test'};Write-ConvergenceBundle $convergenceBundlePath $bundle $f1 1 $head $null;Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'attempt 1 failure leaves attempt 2 narrowed' 1 2 'narrowed' 'false' $true|Out-Null;Commit-Convergence $convergenceProject 'convergence attempt one'
    $head=(Invoke-Git $convergenceProject @('rev-parse','HEAD') 'convergence head two')[-1].Trim()

    $externalProject=Join-Path $taskHistoryRoot 'convergence-external-blocked';$null=@(& git clone --no-checkout --quiet $convergenceProject $externalProject 2>&1);if($LASTEXITCODE-ne0){throw 'external BLOCKED fixture clone failed'};$null=Invoke-Git $externalProject @('config','core.autocrlf','false') 'external blocked autocrlf';$null=Invoke-Git $externalProject @('checkout','-q','codex/task-004') 'external blocked checkout';$null=Invoke-Git $externalProject @('remote','set-url','origin','https://github.com/owner/fixture.git') 'external blocked remote';$externalHead=(Invoke-Git $externalProject @('rev-parse','HEAD') 'external blocked head')[-1].Trim();$external=New-ConvergenceBundle $bundle $f1 1 $externalHead $null;$external.decision='BLOCKED';$external.next_phase='blocked';[IO.File]::WriteAllText($convergenceBundlePath,($external|ConvertTo-Json -Depth 30),$utf8NoBom);Invoke-ConvergenceImport $externalProject $convergenceBundlePath 'external BLOCKED does not consume a cycle' 1 2 'narrowed' 'false' $true|Out-Null

    $designProject=Join-Path $taskHistoryRoot 'convergence-design';$null=@(& git clone --no-checkout --quiet $convergenceProject $designProject 2>&1);if($LASTEXITCODE-ne0){throw 'design convergence fixture clone failed'};$null=Invoke-Git $designProject @('config','core.autocrlf','false') 'design autocrlf';$null=Invoke-Git $designProject @('config','user.name','TASK-154 simulation') 'design user';$null=Invoke-Git $designProject @('config','user.email','task154@example.invalid') 'design email';$null=Invoke-Git $designProject @('checkout','-q','codex/task-004') 'design checkout';$null=Invoke-Git $designProject @('remote','set-url','origin','https://github.com/owner/fixture.git') 'design remote';$designHandoffRelative=Read-ConvergenceValue ([IO.File]::ReadAllText((Join-Path $designProject 'docs/ai/tasks/TASK-004.md')))'handoff_file' 'design TASK';$designHandoffPath=Join-Path $designProject $designHandoffRelative;$designText=[IO.File]::ReadAllText($designHandoffPath);$designText=$designText+"- design_candidate: $baseCandidate`n";[IO.File]::WriteAllText($designHandoffPath,$designText,$utf8NoBom);Commit-Convergence $designProject 'add design candidate identity';$designHead=(Invoke-Git $designProject @('rev-parse','HEAD') 'design head')[-1].Trim();$design=New-ConvergenceBundle $bundle $f1 1 $designHead $null;$design.review_stage='design';$design.next_phase='design';$design.next_actor='ChatGPT';$design.next_role='ORCHESTRATOR_AND_REVIEWER';$design.model='chatgpt-model';[IO.File]::WriteAllText($convergenceBundlePath,($design|ConvertTo-Json -Depth 30),$utf8NoBom);Invoke-ConvergenceImport $designProject $convergenceBundlePath 'design CHANGES_REQUESTED does not consume a cycle' 1 2 'narrowed' 'false' $true 'design'|Out-Null

    $limitFindings=@(1..3|ForEach-Object{[pscustomobject]@{id="FINDING-154-1$_";severity='MAJOR';target='validator';problem="standard finding $_";evidence="evidence $_";impact="impact $_";required_change="change $_";review_scope='validator'}});Write-ConvergenceBundle $convergenceBundlePath $bundle $limitFindings 1 $head $null;Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'standard profile rejects more than two actionable findings' 0 0 'none' 'none' $false|Out-Null
    $invalidPrior=[pscustomobject]@{id='FINDING-154-02';severity='MAJOR';target='validator';problem='invalid prior';evidence='invalid prior evidence';impact='invalid prior impact';required_change='invalid prior change';review_scope='validator';prior_finding_id='FINDING-DOES-NOT-EXIST'};Write-ConvergenceBundle $convergenceBundlePath $bundle $invalidPrior 1 $head $null;Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'attempt 2 rejects unknown prior_finding_id' 0 0 'none' 'none' $false|Out-Null

    $auditRejected=[pscustomobject]@{id='FINDING-154-06';severity='MAJOR';target='validator';problem='audit-only rejected prior';evidence='audit rejected evidence';impact='audit rejected impact';required_change='audit rejected change';review_scope='validator';prior_finding_id='FINDING-154-01'};Set-ConvergenceContext $convergenceProject @('none') @('FINDING-154-01 [MAJOR] disposition=rejected; reason=not accepted');Commit-Convergence $convergenceProject 'rejected prior audit context';$head=(Invoke-Git $convergenceProject @('rev-parse','HEAD') 'rejected prior audit head')[-1].Trim();Write-ConvergenceBundle $convergenceBundlePath $bundle $auditRejected 1 $head $null;Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'attempt 2 rejects prior found only in rejected disposition audit' 0 0 'none' 'none' $false|Out-Null
    $auditDeferred=[pscustomobject]@{id='FINDING-154-07';severity='MAJOR';target='validator';problem='audit-only deferred prior';evidence='audit deferred evidence';impact='audit deferred impact';required_change='audit deferred change';review_scope='validator';prior_finding_id='FINDING-154-01'};Set-ConvergenceContext $convergenceProject @('none') @('FINDING-154-01 [MAJOR] disposition=deferred; reason=not accepted');Commit-Convergence $convergenceProject 'deferred prior audit context';$head=(Invoke-Git $convergenceProject @('rev-parse','HEAD') 'deferred prior audit head')[-1].Trim();Write-ConvergenceBundle $convergenceBundlePath $bundle $auditDeferred 1 $head $null;Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'attempt 2 rejects prior found only in deferred disposition audit' 0 0 'none' 'none' $false|Out-Null
    Set-ConvergenceContext $convergenceProject @('FINDING-154-01 [MAJOR] first finding') @('none');Commit-Convergence $convergenceProject 'restore accepted required finding context';$head=(Invoke-Git $convergenceProject @('rev-parse','HEAD') 'restored accepted prior head')[-1].Trim()

    $resolvedProject=Join-Path $taskHistoryRoot 'convergence-resolved-prior';$null=@(& git clone --no-checkout --quiet $convergenceProject $resolvedProject 2>&1);if($LASTEXITCODE-ne0){throw 'resolved prior fixture clone failed'};$null=Invoke-Git $resolvedProject @('config','core.autocrlf','false') 'resolved prior autocrlf';$null=Invoke-Git $resolvedProject @('config','user.name','TASK-154 simulation') 'resolved prior user';$null=Invoke-Git $resolvedProject @('config','user.email','task154@example.invalid') 'resolved prior email';$null=Invoke-Git $resolvedProject @('checkout','-q','codex/task-004') 'resolved prior checkout';$null=Invoke-Git $resolvedProject @('remote','set-url','origin','https://github.com/owner/fixture.git') 'resolved prior remote';$resolvedTaskPath=Join-Path $resolvedProject 'docs/ai/tasks/TASK-004.md';$resolvedTask=[IO.File]::ReadAllText($resolvedTaskPath);$resolvedTask=[regex]::Replace($resolvedTask,'(?m)^implementation_review_open_finding_ids:.*$','implementation_review_open_finding_ids: none');[IO.File]::WriteAllText($resolvedTaskPath,$resolvedTask,$utf8NoBom);Commit-Convergence $resolvedProject 'mark prior finding resolved';$resolvedHead=(Invoke-Git $resolvedProject @('rev-parse','HEAD') 'resolved prior head')[-1].Trim();$resolvedPrior=[pscustomobject]@{id='FINDING-154-02';severity='MAJOR';target='validator';problem='resolved prior';evidence='resolved evidence';impact='resolved impact';required_change='resolved change';review_scope='validator';prior_finding_id='FINDING-154-01'};Write-ConvergenceBundle $convergenceBundlePath $bundle $resolvedPrior 1 $resolvedHead $null;Invoke-ConvergenceImport $resolvedProject $convergenceBundlePath 'attempt 2 rejects resolved prior_finding_id' 0 0 'none' 'none' $false|Out-Null

    $f2=[pscustomobject]@{id='FINDING-154-02';severity='MAJOR';target='validator';problem='unresolved first finding';evidence='second evidence';impact='second impact';required_change='second change';review_scope='accepted_prior_finding';prior_finding_id='FINDING-154-01'};Write-ConvergenceBundle $convergenceBundlePath $bundle $f2 1 $head $null;Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'attempt 2 failure alone enables attempt 3 terminal' 2 3 'terminal' 'false' $true|Out-Null;Commit-Convergence $convergenceProject 'convergence attempt two'
    $reportPath=Join-Path $convergenceProject 'docs/ai/reports/TASK-004/RELAY_IMPORT.md';$reportBytes=[IO.File]::ReadAllBytes($reportPath);$reportText=[IO.File]::ReadAllText($reportPath).Replace('implementation_review_profile: terminal','implementation_review_profile: standard');[IO.File]::WriteAllText($reportPath,$reportText,$utf8NoBom);$mismatchValidation=Invoke-ProjectValidation $convergenceProject;Assert ($mismatchValidation.ExitCode-ne0-and$mismatchValidation.Output-match'convergence mismatch') 'validator rejects five-source convergence mismatch';[IO.File]::WriteAllBytes($reportPath,$reportBytes)
    $head=(Invoke-Git $convergenceProject @('rev-parse','HEAD') 'convergence head three')[-1].Trim();$forbidden3=[pscustomobject]@{id='FINDING-154-03';severity='MINOR';target='non-required UI';problem='new nonblocking';evidence='third evidence';impact='low';required_change='optional change';review_scope='non_required_ui'};Write-ConvergenceBundle $convergenceBundlePath $bundle $forbidden3 1 $head $null;Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'attempt 3 rejects narrowed nonblocking finding' 0 0 'none' 'none' $false|Out-Null
    $bypass=New-ConvergenceBundle $bundle $forbidden3 1 $head $null;$bypass.decision='BLOCKED';$bypass.next_phase='blocked';[IO.File]::WriteAllText($convergenceBundlePath,($bypass|ConvertTo-Json -Depth 30),$utf8NoBom);Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'decision kind cannot bypass final finding constraints' 0 0 'none' 'none' $false|Out-Null
    $f3=[pscustomobject]@{id='FINDING-154-03';severity='MAJOR';target='release gate';problem='release blocker';evidence='third evidence';impact='release blocked';required_change='blocker change';review_scope='release_gate'};Write-ConvergenceBundle $convergenceBundlePath $bundle $f3 1 $head $null;Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'attempt 3 failure terminates in NEEDS_USER_DECISION' 3 3 'terminal' 'true' $true|Out-Null;Commit-Convergence $convergenceProject 'convergence terminal decision'
    $head=(Invoke-Git $convergenceProject @('rev-parse','HEAD') 'convergence head four')[-1].Trim();$f4=[pscustomobject]@{id='FINDING-154-04';severity='MAJOR';target='release gate';problem='fourth review';evidence='fourth evidence';impact='blocked';required_change='change';review_scope='release_gate'};Write-ConvergenceBundle $convergenceBundlePath $bundle $f4 1 $head $null;Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'terminated state rejects fourth CHANGES_REQUESTED' 0 0 'none' 'none' $false|Out-Null
    $approved=(New-ConvergenceBundle $bundle $f4 1 $head $null);$approved.decision='APPROVED';$approved.next_phase='release';[IO.File]::WriteAllText($convergenceBundlePath,($approved|ConvertTo-Json -Depth 30),$utf8NoBom);Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'terminated state cannot directly release' 0 0 'none' 'none' $false|Out-Null

    $reset=[pscustomobject]@{approved=$true;approved_by='USER';from_revision=1;to_revision=2;approval_id='USER-APPROVAL-154-01';approved_at='2026-08-09 00:00:00 JST'};$resetBundle=New-ConvergenceBundle $bundle $f3 2 $head $reset;$resetBundle.decision='BLOCKED';$resetBundle.next_phase='blocked';[IO.File]::WriteAllText($convergenceBundlePath,($resetBundle|ConvertTo-Json -Depth 30),$utf8NoBom);Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'approved spec revision resets terminated state to attempt 1 standard' 0 1 'standard' 'false' $true|Out-Null;Commit-Convergence $convergenceProject 'convergence approved spec reset'
    $head=(Invoke-Git $convergenceProject @('rev-parse','HEAD') 'post reset head')[-1].Trim();$f5=[pscustomobject]@{id='FINDING-154-05';severity='MAJOR';target='validator';problem='post reset first finding';evidence='reset evidence';impact='reset impact';required_change='reset change';review_scope='required_test'};Write-ConvergenceBundle $convergenceBundlePath $bundle $f5 2 $head $null;Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'first failure after reset leaves attempt 2 narrowed' 1 2 'narrowed' 'false' $true|Out-Null;Commit-Convergence $convergenceProject 'convergence post reset first failure'
    $head=(Invoke-Git $convergenceProject @('rev-parse','HEAD') 'approved reset head')[-1].Trim();$approvedReset=New-ConvergenceBundle $bundle $f5 2 $head $null;$approvedReset.decision='APPROVED';$approvedReset.next_phase='release';[IO.File]::WriteAllText($convergenceBundlePath,($approvedReset|ConvertTo-Json -Depth 30),$utf8NoBom);Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'APPROVED still resets convergence state' 0 1 'standard' 'false' $true|Out-Null;Commit-Convergence $convergenceProject 'convergence approved reset'
    $head=(Invoke-Git $convergenceProject @('rev-parse','HEAD') 'convergence head unapproved')[-1].Trim();$unapproved=New-ConvergenceBundle $bundle $f5 3 $head $null;[IO.File]::WriteAllText($convergenceBundlePath,($unapproved|ConvertTo-Json -Depth 30),$utf8NoBom);Invoke-ConvergenceImport $convergenceProject $convergenceBundlePath 'unapproved spec revision change rejected' 0 0 'none' 'none' $false|Out-Null
}finally{Remove-TestRoot $taskHistoryRoot}

$canonicalRoot=New-TestRoot 'canonical'
try{
    $fixtureProject=Join-Path $canonicalRoot 'project';$adapterPath=Join-Path $fixtureProject 'docs/ai/PROJECT_ADAPTER.psd1';[IO.Directory]::CreateDirectory((Split-Path -Parent $adapterPath))|Out-Null
    $fixtureAdapter=([IO.File]::ReadAllText((Join-Path $root 'templates/PROJECT_ADAPTER.psd1'))).Replace('<project name>','fixture').Replace('<owner/repository>','owner/repository')
    [IO.File]::WriteAllText($adapterPath,$fixtureAdapter,$utf8Bom)
    $fixtureBundle=[IO.File]::ReadAllText((Join-Path $root 'templates/RELAY_BUNDLE.json'))|ConvertFrom-Json;$fixtureBundle.model='codex-model';$fixtureBundle.effort='high';$fixtureBundle.created_at='2026-08-08 00:00:00 JST'
    $inputPath=Join-Path $canonicalRoot 'input.json';[IO.File]::WriteAllText($inputPath,($fixtureBundle|ConvertTo-Json -Depth 20),$utf8NoBom)
    $canonicalPath=Join-Path $canonicalRoot 'canonical.json';$newOutput=@(& $powershellExe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'tools/relay-bundle.ps1') -Action New -ProjectRoot $fixtureProject -BundlePath $inputPath -OutputPath $canonicalPath 2>&1);$newExit=$LASTEXITCODE
    Assert ($newExit-eq0-and(Test-Path -LiteralPath $canonicalPath -PathType Leaf)) 'canonical Action New succeeds'
    $canonicalIdentity=$newOutput[-1]|ConvertFrom-Json;$canonicalBytes=[IO.File]::ReadAllBytes($canonicalPath);$canonicalSha=(Get-FileHash -Algorithm SHA256 -LiteralPath $canonicalPath).Hash
    $hasBom=$canonicalBytes.Length-ge3-and$canonicalBytes[0]-eq0xEF-and$canonicalBytes[1]-eq0xBB-and$canonicalBytes[2]-eq0xBF;$crCount=@($canonicalBytes|Where-Object{$_-eq13}).Count;$terminalLf=$canonicalBytes.Length-gt0-and$canonicalBytes[$canonicalBytes.Length-1]-eq10-and($canonicalBytes.Length-eq1-or$canonicalBytes[$canonicalBytes.Length-2]-ne10)
    Assert (-not$hasBom-and$crCount-eq0-and$terminalLf-and$canonicalIdentity.Sha256-ceq$canonicalSha-and[long]$canonicalIdentity.Bytes-eq$canonicalBytes.Length) 'canonical bytes are UTF-8 no BOM, LF only, one terminal LF, and identity exact'
    foreach($variant in @(
        [pscustomobject]@{Name='empty';Value=[object[]]@()},
        [pscustomobject]@{Name='one';Value=[object[]]@([pscustomobject]@{finding_id='FINDING-1';status='accepted';reason='test'})},
        [pscustomobject]@{Name='multiple';Value=[object[]]@([pscustomobject]@{finding_id='FINDING-1';status='accepted';reason='one'},[pscustomobject]@{finding_id='FINDING-2';status='accepted';reason='two'})}
    )){
        $variantBundle=($fixtureBundle|ConvertTo-Json -Depth 20)|ConvertFrom-Json;$variantBundle.finding_dispositions=$variant.Value;$variantInput=Join-Path $canonicalRoot ("$($variant.Name)-input.json");$variantOutput=Join-Path $canonicalRoot ("$($variant.Name)-output.json");[IO.File]::WriteAllText($variantInput,($variantBundle|ConvertTo-Json -Depth 20),$utf8NoBom)
        $previousPreference=$ErrorActionPreference;$ErrorActionPreference='Continue'
        try{$variantFailureOutput=@(& $powershellExe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'tools/relay-bundle.ps1') -Action New -ProjectRoot $fixtureProject -BundlePath $variantInput -OutputPath $variantOutput 2>&1);$variantExit=$LASTEXITCODE}finally{$ErrorActionPreference=$previousPreference}
        Assert ($variantExit-ne0-and-not(Test-Path -LiteralPath $variantOutput)) "direct decision disposition $($variant.Name) fails before write"
    }
    $canonicalRepo=Join-Path $canonicalRoot 'canonical-repo';[IO.Directory]::CreateDirectory((Join-Path $canonicalRepo 'docs/ai/reports/TASK-000'))|Out-Null;[IO.File]::WriteAllText((Join-Path $canonicalRepo '.gitattributes'),"* text=auto eol=lf`n",$utf8NoBom);Copy-Item -LiteralPath $canonicalPath -Destination (Join-Path $canonicalRepo 'docs/ai/reports/TASK-000/RELAY_BUNDLE.json')
    $null=Invoke-Git $canonicalRepo @('init','-q') 'canonical init';$null=Invoke-Git $canonicalRepo @('config','user.name','TASK-148 simulation') 'canonical user';$null=Invoke-Git $canonicalRepo @('config','user.email','task148@example.invalid') 'canonical email';$null=Invoke-Git $canonicalRepo @('config','core.autocrlf','true') 'canonical autocrlf';$null=Invoke-Git $canonicalRepo @('add','-A') 'canonical add'
    $relative='docs/ai/reports/TASK-000/RELAY_BUNDLE.json';$workingBlob=(Invoke-Git $canonicalRepo @('hash-object','--no-filters',$relative) 'canonical working blob')[-1].Trim();$indexBlob=(Invoke-Git $canonicalRepo @('rev-parse',":$relative") 'canonical index blob')[-1].Trim();$indexBytes=[long](Invoke-Git $canonicalRepo @('cat-file','-s',":$relative") 'canonical index bytes')[-1]
    Assert ($workingBlob-ceq$indexBlob-and$indexBytes-eq$canonicalBytes.Length) 'canonical stage identity is exact'
    $null=Invoke-Git $canonicalRepo @('commit','-q','-m','canonical fixture') 'canonical commit';$canonicalCommit=(Invoke-Git $canonicalRepo @('rev-parse','HEAD') 'canonical HEAD')[-1].Trim();$commitBlob=(Invoke-Git $canonicalRepo @('rev-parse',"HEAD:$relative") 'canonical commit blob')[-1].Trim();Assert ($commitBlob-ceq$workingBlob) 'canonical commit identity is exact'
    $canonicalClone=Join-Path $canonicalRoot 'canonical-clone';$null=@(& git clone --no-checkout --no-local --quiet $canonicalRepo $canonicalClone 2>&1);if($LASTEXITCODE-ne0){throw 'canonical fresh clone failed'};$null=Invoke-Git $canonicalClone @('config','core.autocrlf','true') 'canonical clone autocrlf';$null=Invoke-Git $canonicalClone @('checkout','--detach','-q',$canonicalCommit) 'canonical clone checkout';$clonePath=Join-Path $canonicalClone $relative
    Assert ((Get-FileHash -Algorithm SHA256 -LiteralPath $clonePath).Hash-ceq$canonicalSha-and(Get-Item -LiteralPath $clonePath).Length-eq$canonicalBytes.Length) 'canonical fresh checkout SHA and bytes are exact'
}finally{Remove-TestRoot $canonicalRoot}

$negativeRoot = New-TestRoot 'source-negative'
try {
    $negativeSource = Join-Path $negativeRoot 'shared'
    $negativeProject = Join-Path $negativeRoot 'project'
    $baseline = (Invoke-Git $root @('rev-parse','HEAD') 'negative fixture baseline')[-1].Trim()
    $null = @(& git clone --no-checkout --no-local --quiet $root $negativeSource 2>&1)
    if ($LASTEXITCODE -ne 0) { throw 'negative shared clone failed' }
    $null = Invoke-Git $negativeSource @('config','core.autocrlf','false') 'negative source autocrlf'
    $null = Invoke-Git $negativeSource @('config','user.name','TASK-148 simulation') 'negative source user'
    $null = Invoke-Git $negativeSource @('config','user.email','task148@example.invalid') 'negative source email'
    $null = Invoke-Git $negativeSource @('remote','set-url','origin','https://github.com/Osato-Gasu/shared.git') 'negative source origin'
    $null = Invoke-Git $negativeSource @('checkout','--detach','-q',$baseline) 'negative source checkout'
    Initialize-ProjectSink $negativeProject

    $assumed = @()
    Reset-SharedFixture $negativeSource $baseline $assumed
    $payloadPath = Join-Path $negativeSource 'core/START.md'
    [IO.File]::WriteAllText($payloadPath, [IO.File]::ReadAllText($payloadPath) + "# unstaged self-consistent fixture`n", $utf8NoBom)
    Update-ManifestSha $negativeSource 'core/START.md'
    Assert-SourceFailure $negativeSource $negativeProject 'unstaged self-consistent source rejected before project write' '(?is)clean.* M core/START\.md'

    Reset-SharedFixture $negativeSource $baseline $assumed
    $payloadPath = Join-Path $negativeSource 'core/START.md'
    [IO.File]::WriteAllText($payloadPath, [IO.File]::ReadAllText($payloadPath) + "# staged self-consistent fixture`n", $utf8NoBom)
    Update-ManifestSha $negativeSource 'core/START.md'
    $null = Invoke-Git $negativeSource @('add','--','manifest.yml','core/START.md') 'stage self-consistent fixture'
    Assert-SourceFailure $negativeSource $negativeProject 'staged self-consistent source rejected before project write' '(?is)clean.*M  core/START\.md'

    Reset-SharedFixture $negativeSource $baseline $assumed
    $null = Invoke-Git $negativeSource @('rm','--cached','--','core/START.md') 'create untracked manifest shadow'
    $null = Invoke-Git $negativeSource @('commit','-q','-m','untracked manifest shadow fixture') 'commit untracked manifest shadow'
    Assert-SourceFailure $negativeSource $negativeProject 'untracked manifest-path shadow rejected before project write' '(?is)clean.*\?\? core/START\.md'

    foreach ($provenanceCase in @(
        [pscustomobject]@{ Relative='manifest.yml'; Append="# hidden manifest provenance fixture`n" },
        [pscustomobject]@{ Relative='VERSION'; Append="`t" },
        [pscustomobject]@{ Relative='core/START.md'; Append="# hidden payload provenance fixture`n" }
    )) {
        Reset-SharedFixture $negativeSource $baseline $assumed
        $assumed = @($provenanceCase.Relative)
        $null = Invoke-Git $negativeSource @('update-index','--assume-unchanged','--',$provenanceCase.Relative) "assume provenance $($provenanceCase.Relative)"
        $casePath = Join-Path $negativeSource $provenanceCase.Relative
        $caseText = [IO.File]::ReadAllText($casePath)
        if ($provenanceCase.Relative -ceq 'VERSION') { $caseText = $caseText.TrimEnd("`n") + $provenanceCase.Append + "`n" }
        else { $caseText += $provenanceCase.Append }
        [IO.File]::WriteAllText($casePath, $caseText, $utf8NoBom)
        $escapedPath = [regex]::Escape($provenanceCase.Relative)
        Assert-SourceFailure $negativeSource $negativeProject "raw HEAD mismatch rejected: $($provenanceCase.Relative)" "(?is)(HEAD blob|source commit blob).*${escapedPath}"
    }

    $variantCases = @(
        [pscustomobject]@{ Name='bom'; Reason='UTF-8 BOM is forbidden' },
        [pscustomobject]@{ Name='crlf'; Reason='CR byte is forbidden' },
        [pscustomobject]@{ Name='no-final-lf'; Reason='exactly one LF' },
        [pscustomobject]@{ Name='multiple-final-lf'; Reason='exactly one LF' },
        [pscustomobject]@{ Name='nul-control'; Reason='control character is forbidden' },
        [pscustomobject]@{ Name='c1-nel-control'; Reason='control character is forbidden' }
    )
    foreach ($relative in @('manifest.yml','VERSION','core/START.md')) {
        foreach ($variant in $variantCases) {
            Reset-SharedFixture $negativeSource $baseline $assumed
            $assumed = @($relative)
            Set-TextByteVariant (Join-Path $negativeSource $relative) $variant.Name
            $manifestChanged = $relative -cne 'manifest.yml'
            if ($manifestChanged) { Update-ManifestSha $negativeSource $relative }
            Commit-RawFixture $negativeSource $relative $manifestChanged "canonical $($variant.Name) $relative fixture"
            $expected = "(?is)$([regex]::Escape($variant.Reason)).*$([regex]::Escape($relative))"
            Assert-SourceFailure $negativeSource $negativeProject "canonical $($variant.Name) rejected: $relative" $expected
        }
    }
} finally { Remove-TestRoot $negativeRoot }

if(-not$SkipFreshCloneGate){
    Assert (@(git -C $root status --porcelain=v1).Count-eq0) 'fresh checkout gate source is clean'
    $candidate=(Invoke-Git $root @('rev-parse','HEAD') 'shared candidate')[-1].Trim();$freshRoot=New-TestRoot 'fresh-checkout'
    try{
        $freshClone=Join-Path $freshRoot 'shared';$null=@(& git clone --no-checkout --no-local --quiet $root $freshClone 2>&1);if($LASTEXITCODE-ne0){throw 'shared fresh clone failed'};$null=Invoke-Git $freshClone @('config','core.autocrlf','true') 'fresh clone autocrlf';$null=Invoke-Git $freshClone @('remote','set-url','origin','https://github.com/Osato-Gasu/shared.git') 'fresh clone origin';$null=Invoke-Git $freshClone @('checkout','--detach','-q',$candidate) 'fresh clone checkout'
        Assert ((Invoke-Git $freshClone @('rev-parse','HEAD') 'fresh clone HEAD')[-1].Trim()-ceq$candidate-and@(git -C $freshClone status --porcelain=v1).Count-eq0) 'fresh clone exact candidate and clean worktree'
        $freshManifest=[IO.File]::ReadAllText((Join-Path $freshClone 'manifest.yml'));$freshEntries=[regex]::Matches($freshManifest,'(?ms)^  - path:\s*(?<path>\S+)\s*\r?\n    target:\s*(?<target>\S+)\s*\r?\n    sha256:\s*(?<sha>[A-F0-9]{64})\s*$')
        foreach($entry in $freshEntries){$relative=$entry.Groups['path'].Value;$path=Join-Path $freshClone $relative;if((Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash-cne$entry.Groups['sha'].Value){throw "fresh manifest SHA mismatch: $relative"};$workingBlob=(Invoke-Git $freshClone @('hash-object','--no-filters',$relative) "fresh blob $relative")[-1].Trim();$commitBlob=(Invoke-Git $freshClone @('rev-parse',"HEAD:$relative") "fresh commit blob $relative")[-1].Trim();if($workingBlob-cne$commitBlob){throw "fresh raw blob mismatch: $relative"}}
        Assert ($freshEntries.Count-gt0) 'fresh clone manifest raw SHA and blob identity'
        $freshProbePath = Join-Path $freshRoot 'host-probe.ps1'
        [IO.File]::WriteAllText($freshProbePath, $hostProbeScript, $utf8NoBom)
        $freshProbeOutput = @(& $powershellExe -NoProfile -ExecutionPolicy Bypass -File $freshProbePath 2>&1)
        $freshProbeExit = $LASTEXITCODE
        $freshProbeLine = @(( $freshProbeOutput | Where-Object { $_ -like 'HOST=*' }))[0]
        $freshProbePathResolved = if($null -ne $freshProbeLine){ $freshProbeLine.Substring(5) } else { $null }
        Assert ($freshProbeExit-eq0 -and $freshProbeOutput -contains 'CHILD_OK' -and $freshProbePathResolved-ceq([IO.Path]::GetFullPath($powershellExe))) 'fresh clone child probe executes through resolved host'
        $validatorOutput=@(& $powershellExe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $freshClone 'tools/validate-shared.ps1') 2>&1);$validatorExit=$LASTEXITCODE;Assert ($validatorExit-eq0) 'fresh clone shared validator'
        $childOutput=@(& $powershellExe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $freshClone 'tools/test-shared-simulation.ps1') -SkipFreshCloneGate 2>&1);$childExit=$LASTEXITCODE;Assert ($childExit-eq0) 'fresh clone shared simulation'
        $childProbeEvidence = $childOutput | Select-String -SimpleMatch 'PASS resolved child probe executes through resolved host and reports host path'
        Assert (-not [string]::IsNullOrWhiteSpace($childProbeEvidence)) 'nested simulation also uses resolved host'
    }finally{Remove-TestRoot $freshRoot}
}

$results
Write-Output "Shared simulation passed: $($results.Count) checks."
