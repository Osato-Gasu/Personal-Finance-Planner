[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$validator = Join-Path $PSScriptRoot 'validate-audit-identities.ps1'
$powershellExe = [Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
$fixture = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) ('pfp-audit-identity-' + [guid]::NewGuid().ToString('N'))))
$utf8NoBom = New-Object Text.UTF8Encoding($false)
$oldSha = '0143D33D69C56705FFA74B5E73265A4594681FA7E8440B743EF7658F6829731E'
$oldBytes = 34723
$checks = 0

function Invoke-Git([string]$WorkingDirectory,[string[]]$Arguments) {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = @(& git -C $WorkingDirectory @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($exitCode -ne 0) { throw "git $($Arguments -join ' ') failed: $($output -join "`n")" }
    ($output -join "`n").Trim()
}

function Get-BlobBytes([string]$WorkingDirectory,[string]$Blob) {
    $startInfo = New-Object Diagnostics.ProcessStartInfo
    $startInfo.FileName = 'git'
    $startInfo.Arguments = "cat-file blob $Blob"
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $startInfo
    $memory = New-Object IO.MemoryStream
    try {
        if (-not $process.Start()) { throw 'failed to start git cat-file' }
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.StandardOutput.BaseStream.CopyTo($memory)
        $process.WaitForExit()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0) { throw "git cat-file failed: $stderr" }
        $memory.ToArray()
    } finally { $memory.Dispose(); $process.Dispose() }
}

function Get-Sha256([byte[]]$Bytes) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-', '') }
    finally { $sha.Dispose() }
}

function New-Registry([string]$Commit,[string]$Blob,[string]$Sha,[long]$Bytes,[string]$HistoryPath,[string]$HistoryBlob) {
    [ordered]@{
        schema_version = 1
        identities = @([ordered]@{
            id = 'normalization-fixture'
            current_verified_identity = [ordered]@{
                source_commit = $Commit
                source_path = 'artifact.txt'
                git_blob = $Blob
                sha256 = $Sha
                bytes = $Bytes
                byte_source = 'exact_committed_git_blob'
                eol_contract = 'normalized_lf'
            }
            historical_mismatch = [ordered]@{
                finding_id = 'FINDING-NORMALIZATION-FIXTURE'
                declared_by_commit = $Commit
                declared_by_path = $HistoryPath
                declared_by_git_blob = $HistoryBlob
                declared_sha256 = $oldSha
                declared_bytes = $oldBytes
                explanation = 'fixture historical identity bound to committed declaration'
            }
        })
    }
}

function Write-Registry([string]$Path,$Registry) {
    [IO.File]::WriteAllText($Path,($Registry | ConvertTo-Json -Depth 12),$utf8NoBom)
}

function Invoke-Validator([string]$WorkingDirectory,[string]$Registry) {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = @(& $powershellExe -NoProfile -ExecutionPolicy Bypass -File $validator -ProjectRoot $WorkingDirectory -RegistryPath $Registry 2>&1)
        $exitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    [pscustomobject]@{ ExitCode=$exitCode; Output=($output -join "`n") }
}

function Assert-Pass([string]$Name,$Registry) {
    Write-Registry $script:registryPath $Registry
    $result = Invoke-Validator $fixture $script:registryPath
    if ($result.ExitCode -ne 0) { throw "$Name unexpectedly failed: $($result.Output)" }
    $script:checks++
}

function Assert-Fail([string]$Name,$Registry,[string]$ExpectedPattern) {
    Write-Registry $script:registryPath $Registry
    $result = Invoke-Validator $fixture $script:registryPath
    if ($result.ExitCode -eq 0 -or $result.Output -notmatch $ExpectedPattern) { throw "$Name was not rejected as expected ($ExpectedPattern): $($result.Output)" }
    $script:checks++
}

function Write-Declaration([string]$Path,[string[]]$Lines) {
    [IO.File]::WriteAllBytes((Join-Path $fixture $Path),$utf8NoBom.GetBytes(($Lines -join "`n") + "`n"))
}

[IO.Directory]::CreateDirectory($fixture) | Out-Null
try {
    Invoke-Git $fixture @('init','-q') | Out-Null
    Invoke-Git $fixture @('config','user.name','audit identity fixture') | Out-Null
    Invoke-Git $fixture @('config','user.email','audit-identity@example.invalid') | Out-Null
    [IO.File]::WriteAllBytes((Join-Path $fixture '.gitattributes'),$utf8NoBom.GetBytes("* text=auto eol=lf`n"))
    $workingBytes = $utf8NoBom.GetBytes("alpha`r`nbeta`r`n")
    [IO.File]::WriteAllBytes((Join-Path $fixture 'artifact.txt'),$workingBytes)
    Write-Declaration 'relay-handoff.md' @("- approval_relay_sha256: $oldSha","- approval_relay_bytes: $oldBytes")
    Write-Declaration 'sha-missing.md' @("- approval_relay_bytes: $oldBytes")
    Write-Declaration 'sha-duplicate.md' @("- approval_relay_sha256: $oldSha","- approval_relay_sha256: $oldSha","- approval_relay_bytes: $oldBytes")
    Write-Declaration 'sha-mismatch.md' @("- approval_relay_sha256: $('B' * 64)","- approval_relay_bytes: $oldBytes")
    Write-Declaration 'bytes-missing.md' @("- approval_relay_sha256: $oldSha")
    Write-Declaration 'bytes-duplicate.md' @("- approval_relay_sha256: $oldSha","- approval_relay_bytes: $oldBytes","- approval_relay_bytes: $oldBytes")
    Write-Declaration 'bytes-mismatch.md' @("- approval_relay_sha256: $oldSha","- approval_relay_bytes: 34724")
    Write-Declaration 'other-declaration.md' @("- approval_relay_sha256: $('C' * 64)",'- approval_relay_bytes: 123')
    [IO.File]::WriteAllBytes((Join-Path $fixture 'invalid-utf8.md'),[byte[]](0xFF,0xFE,0xFD))
    $workingSha = Get-Sha256 $workingBytes
    Invoke-Git $fixture @('add','.') | Out-Null
    Invoke-Git $fixture @('commit','-q','-m','commit normalized fixture and declarations') | Out-Null
    $commit = Invoke-Git $fixture @('rev-parse','HEAD')
    $blob = Invoke-Git $fixture @('rev-parse','HEAD:artifact.txt')
    $historyBlob = Invoke-Git $fixture @('rev-parse','HEAD:relay-handoff.md')
    $committedBytes = Get-BlobBytes $fixture $blob
    $committedSha = Get-Sha256 $committedBytes
    if ($workingSha -ceq $committedSha -or $workingBytes.LongLength -eq $committedBytes.LongLength) { throw 'fixture did not reproduce CRLF to LF identity drift' }

    $registryPath = Join-Path $fixture 'audit-identities.json'
    $base = New-Registry $commit $blob $committedSha $committedBytes.LongLength 'relay-handoff.md' $historyBlob
    Assert-Pass 'committed LF current identity and actual historical pair binding' $base

    $case = New-Registry $commit $blob $workingSha $workingBytes.LongLength 'relay-handoff.md' $historyBlob
    Assert-Fail 'pre-normalized CRLF current identity' $case '(byte count mismatch|SHA-256 mismatch)'
    $case = New-Registry $commit $blob $oldSha $oldBytes 'relay-handoff.md' $historyBlob
    Assert-Fail 'actual historical pair in current identity fields' $case '(byte count mismatch|SHA-256 mismatch)'

    $case = New-Registry $commit $blob $committedSha $committedBytes.LongLength 'relay-handoff.md' $historyBlob
    $case.identities[0].historical_mismatch.declared_by_commit = 'ABC'
    Assert-Fail 'invalid declared_by_commit' $case 'declared_by_commit is invalid'
    $case = New-Registry $commit $blob $committedSha $committedBytes.LongLength 'relay-handoff.md' $historyBlob
    $case.identities[0].historical_mismatch.declared_by_commit = ('f' * 40)
    Assert-Fail 'nonexistent declared_by_commit' $case 'git rev-parse.*failed'
    $case = New-Registry $commit $blob $committedSha $committedBytes.LongLength 'relay-handoff.md' $historyBlob
    $case.identities[0].historical_mismatch.declared_by_path = 'C:/absolute.md'
    Assert-Fail 'invalid absolute declared_by_path' $case 'declared_by_path is invalid'
    $case = New-Registry $commit $blob $committedSha $committedBytes.LongLength 'relay-handoff.md' $historyBlob
    $case.identities[0].historical_mismatch.declared_by_path = '../relay-handoff.md'
    Assert-Fail 'declared_by_path traversal' $case 'declared_by_path is invalid'
    $case = New-Registry $commit $blob $committedSha $committedBytes.LongLength 'relay-handoff.md' $historyBlob
    $case.identities[0].historical_mismatch.declared_by_path = 'missing.md'
    Assert-Fail 'nonexistent declared_by_path' $case 'git rev-parse.*failed'
    $case = New-Registry $commit $blob $committedSha $committedBytes.LongLength 'relay-handoff.md' $historyBlob
    $case.identities[0].historical_mismatch.declared_by_git_blob = $blob
    Assert-Fail 'declared_by_git_blob mismatch' $case 'historical Git blob mismatch'
    $case = New-Registry $commit $blob $committedSha $committedBytes.LongLength 'relay-handoff.md' $historyBlob
    $case.identities[0].historical_mismatch.Remove('explanation')
    Assert-Fail 'missing explanation' $case 'historical explanation is required'
    $case = New-Registry $commit $blob $committedSha $committedBytes.LongLength 'relay-handoff.md' $historyBlob
    $case.identities[0].historical_mismatch.explanation = '   '
    Assert-Fail 'empty explanation' $case 'historical explanation is required'

    foreach ($sourceCase in @(
        @{Name='approval SHA missing';Path='sha-missing.md';Pattern='approval_relay_sha256 exactly once'},
        @{Name='approval SHA duplicate';Path='sha-duplicate.md';Pattern='approval_relay_sha256 exactly once'},
        @{Name='approval SHA mismatch';Path='sha-mismatch.md';Pattern='approval_relay_sha256 mismatch'},
        @{Name='approval bytes missing';Path='bytes-missing.md';Pattern='approval_relay_bytes exactly once'},
        @{Name='approval bytes duplicate';Path='bytes-duplicate.md';Pattern='approval_relay_bytes exactly once'},
        @{Name='approval bytes mismatch';Path='bytes-mismatch.md';Pattern='approval_relay_bytes mismatch'},
        @{Name='alternate declaration object';Path='other-declaration.md';Pattern='historical approval_relay_(sha256|bytes) mismatch'},
        @{Name='invalid UTF-8 declaration';Path='invalid-utf8.md';Pattern='not strict UTF-8'}
    )) {
        $sourceBlob = Invoke-Git $fixture @('rev-parse',"HEAD:$($sourceCase.Path)")
        $case = New-Registry $commit $blob $committedSha $committedBytes.LongLength $sourceCase.Path $sourceBlob
        Assert-Fail $sourceCase.Name $case $sourceCase.Pattern
    }

    $case = New-Registry $commit $blob $committedSha $committedBytes.LongLength 'relay-handoff.md' $historyBlob
    $case.identities[0].historical_mismatch.declared_sha256 = ('D' * 64)
    Assert-Fail 'historical SHA-only mutation' $case 'approval_relay_sha256 mismatch'
    $case = New-Registry $commit $blob $committedSha $committedBytes.LongLength 'relay-handoff.md' $historyBlob
    $case.identities[0].historical_mismatch.declared_bytes = 34724
    Assert-Fail 'historical bytes-only mutation' $case 'approval_relay_bytes mismatch'

    $global:LASTEXITCODE = 0
    Write-Output "Audit identity normalization test passed: $checks checks; CRLF current rejected; committed LF current accepted; actual old pair rejected as current and accepted only as Git-bound historical evidence."
} finally {
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if ($fixture.StartsWith($tempRoot,[StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $fixture) -like 'pfp-audit-identity-*' -and (Test-Path -LiteralPath $fixture -PathType Container)) {
        Remove-Item -LiteralPath $fixture -Recurse -Force
    }
}
