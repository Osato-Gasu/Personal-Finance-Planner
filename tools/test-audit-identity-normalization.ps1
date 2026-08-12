[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$validator = Join-Path $PSScriptRoot 'validate-audit-identities.ps1'
$powershellExe = [Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
$fixture = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) ('pfp-audit-identity-' + [guid]::NewGuid().ToString('N'))))
$utf8NoBom = New-Object Text.UTF8Encoding($false)

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

function Write-Registry([string]$Path,[string]$Commit,[string]$Blob,[string]$Sha,[long]$Bytes) {
    $registry = [ordered]@{
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
                declared_by_path = 'artifact.txt'
                declared_sha256 = ('A' * 64)
                declared_bytes = 999
                explanation = 'fixture historical identity'
            }
        })
    }
    [IO.File]::WriteAllText($Path,($registry | ConvertTo-Json -Depth 12),$utf8NoBom)
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

[IO.Directory]::CreateDirectory($fixture) | Out-Null
try {
    Invoke-Git $fixture @('init','-q') | Out-Null
    Invoke-Git $fixture @('config','user.name','audit identity fixture') | Out-Null
    Invoke-Git $fixture @('config','user.email','audit-identity@example.invalid') | Out-Null
    [IO.File]::WriteAllBytes((Join-Path $fixture '.gitattributes'),$utf8NoBom.GetBytes("* text=auto eol=lf`n"))
    $workingBytes = $utf8NoBom.GetBytes("alpha`r`nbeta`r`n")
    [IO.File]::WriteAllBytes((Join-Path $fixture 'artifact.txt'),$workingBytes)
    $workingSha = Get-Sha256 $workingBytes
    Invoke-Git $fixture @('add','.gitattributes','artifact.txt') | Out-Null
    Invoke-Git $fixture @('commit','-q','-m','commit normalized fixture') | Out-Null
    $commit = Invoke-Git $fixture @('rev-parse','HEAD')
    $blob = Invoke-Git $fixture @('rev-parse','HEAD:artifact.txt')
    $committedBytes = Get-BlobBytes $fixture $blob
    $committedSha = Get-Sha256 $committedBytes
    if ($workingSha -ceq $committedSha -or $workingBytes.LongLength -eq $committedBytes.LongLength) { throw 'fixture did not reproduce CRLF to LF identity drift' }

    $registryPath = Join-Path $fixture 'audit-identities.json'
    Write-Registry $registryPath $commit $blob $workingSha $workingBytes.LongLength
    $negative = Invoke-Validator $fixture $registryPath
    if ($negative.ExitCode -eq 0 -or $negative.Output -notmatch '(byte count mismatch|SHA-256 mismatch)') { throw "pre-normalized identity was not rejected: $($negative.Output)" }

    Write-Registry $registryPath $commit $blob $committedSha $committedBytes.LongLength
    $positive = Invoke-Validator $fixture $registryPath
    if ($positive.ExitCode -ne 0) { throw "committed LF identity was rejected: $($positive.Output)" }

    Write-Registry $registryPath $commit $blob ('A' * 64) 999
    $staleCurrent = Invoke-Validator $fixture $registryPath
    if ($staleCurrent.ExitCode -eq 0) { throw 'historical identity was accepted as current identity' }

    Write-Output "Audit identity normalization test passed: CRLF working identity rejected; committed LF identity accepted; historical identity rejected as current."
} finally {
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if ($fixture.StartsWith($tempRoot,[StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $fixture) -like 'pfp-audit-identity-*' -and (Test-Path -LiteralPath $fixture -PathType Container)) {
        Remove-Item -LiteralPath $fixture -Recurse -Force
    }
}
