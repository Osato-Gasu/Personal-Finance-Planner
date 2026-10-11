# Shared 3.0 common helpers. PowerShell 7+ (Linux / Windows). Dot-source only.
Set-StrictMode -Version Latest

# Exit codes are part of the contract (RULES.md section 7).
$script:ExitCode = @{ OK = 0; FAIL = 1; BLOCKED = 2; UNKNOWN = 3; CONFLICT = 4 }

function New-SharedError {
    param([Parameter(Mandatory)][string]$Reason, [Parameter(Mandatory)][string]$Message, [int]$Code = 1)
    $e = [System.InvalidOperationException]::new("${Reason}: $Message")
    $e.Data['Reason'] = $Reason
    $e.Data['Code'] = $Code
    return $e
}

function Stop-Shared {
    param([Parameter(Mandatory)][string]$Reason, [Parameter(Mandatory)][string]$Message, [int]$Code = 1)
    throw (New-SharedError -Reason $Reason -Message $Message -Code $Code)
}

function Test-Sha40 { param([AllowNull()][string]$Value) return ($null -ne $Value -and $Value -cmatch '\A[0-9a-f]{40}\z') }

function Assert-Sha40 {
    param([AllowNull()][string]$Value, [string]$What = 'sha')
    if (-not (Test-Sha40 $Value)) { Stop-Shared -Reason 'SHA_NOT_EXACT' -Message "$What must be a full lowercase 40-hex commit id." }
}

function ConvertTo-Lf { param([AllowNull()][string]$Text) if ($null -eq $Text) { return '' } return ($Text -replace "`r`n", "`n") -replace "`r", "`n" }

function Get-Sha256Hex {
    param([Parameter(Mandatory)][string]$Text)
    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($Text)
    return ([System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::HashData($bytes)) -replace '-', '').ToLowerInvariant()
}

function Write-Utf8NoBom {
    # Atomic replace: write a sibling temp file, then move over the target.
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Text)
    $dir = Split-Path -Parent ([System.IO.Path]::GetFullPath($Path))
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $tmp = Join-Path $dir (".shared-tmp-" + [guid]::NewGuid().ToString('N'))
    [System.IO.File]::WriteAllText($tmp, (ConvertTo-Lf $Text), [System.Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $tmp -Destination $Path -Force
}

function Read-TextLf {
    param([Parameter(Mandatory)][string]$Path)
    return ConvertTo-Lf ([System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false)))
}

function Read-JsonFile {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { Stop-Shared -Reason 'FILE_MISSING' -Message "Missing file: $Path" }
    try { return (Read-TextLf $Path) | ConvertFrom-Json -Depth 32 -NoEnumerate:$false }
    catch { Stop-Shared -Reason 'JSON_INVALID' -Message "Invalid JSON: $Path ($($_.Exception.Message))" }
}

function Get-Prop {
    # Safe property read under StrictMode. Returns $Default when absent.
    param($Object, [string]$Name, $Default = $null)
    if ($null -eq $Object) { return $Default }
    if ($Object -is [System.Collections.IDictionary]) { if ($Object.Contains($Name)) { return $Object[$Name] } return $Default }
    $p = $Object.PSObject.Properties[$Name]
    if ($null -eq $p) { return $Default }
    return $p.Value
}

function ConvertTo-StringArray { param($Value) if ($null -eq $Value) { return @() } return @($Value | ForEach-Object { [string]$_ }) }

function Get-RelativePath {
    param([string]$Root, [string]$Path)
    return ([System.IO.Path]::GetRelativePath($Root, $Path)) -replace '\\', '/'
}

function Test-GlobMatch {
    # Repo-relative '/' paths. '**' = any depth, '*' = within one segment.
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Pattern)
    $re = [System.Text.StringBuilder]::new('\A')
    $i = 0
    while ($i -lt $Pattern.Length) {
        $c = $Pattern[$i]
        if ($c -eq '*') {
            if ($i + 1 -lt $Pattern.Length -and $Pattern[$i + 1] -eq '*') {
                $i += 2
                if ($i -lt $Pattern.Length -and $Pattern[$i] -eq '/') { $i++; [void]$re.Append('(?:.*/)?') } else { [void]$re.Append('.*') }
                continue
            }
            [void]$re.Append('[^/]*')
        } elseif ($c -eq '?') { [void]$re.Append('[^/]') }
        else { [void]$re.Append([regex]::Escape([string]$c)) }
        $i++
    }
    [void]$re.Append('\z')
    # Case-insensitive on purpose: Windows and macOS checkouts fold case, so `Tools/x.ps1` must not escape `tools/**`.
    return [regex]::IsMatch($Path, $re.ToString(), [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
}

function Test-AnyGlob { param([string]$Path, [string[]]$Patterns) foreach ($p in $Patterns) { if (Test-GlobMatch -Path $Path -Pattern $p) { return $true } } return $false }

# Minimal "key: value" frontmatter / lock reader. Values are plain strings; no YAML features.
function ConvertFrom-KeyValueLines {
    param([AllowNull()][string]$Text)
    $map = [ordered]@{}
    foreach ($line in ((ConvertTo-Lf $Text) -split "`n")) {
        if ($line -match '\A\s*#' -or $line -notmatch '\A([A-Za-z_][A-Za-z0-9_\-]*)\s*:\s*(.*?)\s*\z') { continue }
        $v = $Matches[2]
        if ($v.Length -ge 2 -and (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'")))) { $v = $v.Substring(1, $v.Length - 2) }
        if (-not $map.Contains($Matches[1])) { $map[$Matches[1]] = $v }
    }
    return $map
}

function Get-RepoRootOf { param([string]$Start = '.') return [System.IO.Path]::GetFullPath($Start) }

function Test-RepoName { param([AllowNull()][string]$Value) return ($null -ne $Value -and $Value -cmatch '\A[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+\z' -and $Value -notmatch '(\A|/)\.{1,2}(/|\z)') }
