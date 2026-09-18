[CmdletBinding()]
param(
    [string]$ProjectRoot,
    [switch]$Check,
    [string]$HtmlPath,
    [string]$InventoryPath = 'docs/ai/LEGACY_TASK_INVENTORY.json'
)

$ErrorActionPreference = 'Stop'
$utf8 = New-Object Text.UTF8Encoding($false, $true)
$unrecorded = ([char]0x672A) + ([char]0x8A18) + ([char]0x9332)

function Read-Text([string]$Path) { return [IO.File]::ReadAllText($Path, $utf8) }
function Html([AllowNull()][object]$Value) { if ($null -eq $Value) { return '' }; return [Net.WebUtility]::HtmlEncode([string]$Value) }
function Scalar([hashtable]$Map, [string]$Key) {
    if (-not $Map.ContainsKey($Key)) { return $unrecorded }
    $value = [string]$Map[$Key]
    if ([string]::IsNullOrWhiteSpace($value) -or $value -eq 'null' -or $value -eq '~') { return $unrecorded }
    return $value.Trim("'", '"')
}
function Parse-Frontmatter([string]$Text, [string]$Source) {
    $match = [regex]::Match($Text, '\A---\r?\n(?<body>.*?)\r?\n---(?:\r?\n|\z)', [Text.RegularExpressions.RegexOptions]::Singleline)
    if (-not $match.Success) { throw "Malformed TASK frontmatter: $Source" }
    $map = @{}
    foreach ($line in ($match.Groups['body'].Value -split '\r?\n')) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -notmatch '^([A-Za-z_][A-Za-z0-9_-]*):(?:[ \t]*(.*))?$') { throw "Malformed TASK frontmatter line in $Source" }
        if ($map.ContainsKey($Matches[1])) { throw "Duplicate TASK frontmatter key in $Source`: $($Matches[1])" }
        $map[$Matches[1]] = $Matches[2]
    }
    return $map
}
function New-Record([string]$Id, [hashtable]$Map, [string]$Relative, [string]$Source) {
    $summary = Scalar $Map 'summary'
    if ($summary -eq $unrecorded) { $summary = Scalar $Map 'feature' }
    if ($summary -eq $unrecorded) { $summary = Scalar $Map 'title' }
    if ($summary -eq $unrecorded) { $summary = $unrecorded }
    [pscustomobject][ordered]@{
        Id = $Id
        Summary = $summary
        Status = Scalar $Map 'status'
        Phase = if ($Map.ContainsKey('phase')) { Scalar $Map 'phase' } else { Scalar $Map 'current_phase' }
        Definition = Scalar $Map 'definition_state'
        Implementation = Scalar $Map 'implementation_state'
        Static = Scalar $Map 'static_verification_state'
        Runtime = Scalar $Map 'runtime_verification_state'
        Hold = Scalar $Map 'hold_state'
        HoldReason = Scalar $Map 'hold_reason'
        Progress = if ($Map.ContainsKey('progress')) { Scalar $Map 'progress' } else { Scalar $Map 'progress_state' }
        NextAction = if ($Map.ContainsKey('next_action')) { Scalar $Map 'next_action' } else { Scalar $Map 'next_step' }
        FormalCI = if ($Map.ContainsKey('formal_ci_state')) { Scalar $Map 'formal_ci_state' } else { Scalar $Map 'ci_state' }
        Relative = $Relative
        Source = $Source
    }
}

if ($MyInvocation.InvocationName -eq '.') { return }
$root = if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')) } else { [IO.Path]::GetFullPath($ProjectRoot) }
if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw "ProjectRoot is not a directory: $ProjectRoot" }
$inventoryFull = if ([IO.Path]::IsPathRooted($InventoryPath)) { [IO.Path]::GetFullPath($InventoryPath) } else { [IO.Path]::GetFullPath((Join-Path $root $InventoryPath)) }
$inventory = @{}
if (Test-Path -LiteralPath $inventoryFull -PathType Leaf) {
    try {
        $data = (Read-Text $inventoryFull) | ConvertFrom-Json
        foreach ($entry in @($data.tasks)) {
            $id = [string]$entry.task_id
            if ($id -notmatch '^TASK-\d+$') { throw "Invalid legacy inventory task id: $id" }
            if ($inventory.ContainsKey($id)) { throw "Duplicate legacy inventory task id: $id" }
            $map = @{}
            foreach ($property in @('summary','status','phase','definition_state','implementation_state','static_verification_state','runtime_verification_state','hold_state','hold_reason','progress','next_action','formal_ci_state')) { if ($entry.PSObject.Properties.Name -contains $property) { $map[$property] = [string]$entry.$property } }
            $inventory[$id] = New-Record $id $map '' ([string]$entry.source)
        }
    } catch { throw "Legacy TASK inventory is invalid: $($_.Exception.Message)" }
}

$records = @{}
$taskDir = Join-Path $root 'docs/ai/tasks'
if (Test-Path -LiteralPath $taskDir -PathType Container) {
    foreach ($file in @(Get-ChildItem -LiteralPath $taskDir -Filter 'TASK-*.md' -File | Sort-Object Name)) {
        if ($file.BaseName -notmatch '^TASK-\d+$') { continue }
        $id = $file.BaseName
        if ($records.ContainsKey($id)) { throw "Duplicate canonical TASK id: $id" }
        $relative = ('docs/ai/tasks/' + $file.Name).Replace('\','/')
        $records[$id] = New-Record $id (Parse-Frontmatter (Read-Text $file.FullName) $relative) $relative 'canonical TASK file'
    }
}
for ($i = 1; $i -le 20; $i++) {
    $id = ('TASK-{0:D3}' -f $i)
    if (-not $records.ContainsKey($id)) {
        if ($inventory.ContainsKey($id)) { $records[$id] = $inventory[$id] }
        else { $records[$id] = New-Record $id @{} '' 'current sources/Git history do not record this TASK'
        }
    }
}

$relativeOutput = $HtmlPath
if ([string]::IsNullOrWhiteSpace($relativeOutput)) {
    $adapterPath = Join-Path $root 'docs/ai/PROJECT_ADAPTER.psd1'
    if (Test-Path -LiteralPath $adapterPath -PathType Leaf) {
        try { $adapter = Import-PowerShellDataFile -LiteralPath $adapterPath; if ($adapter.Paths -and $adapter.Paths.TaskHtml) { $relativeOutput = [string]$adapter.Paths.TaskHtml } }
        catch { throw "PROJECT_ADAPTER.psd1 cannot be imported: $($_.Exception.Message)" }
    }
}
if ([string]::IsNullOrWhiteSpace($relativeOutput)) { $relativeOutput = 'docs/ai/TASKS.html' }
if ([IO.Path]::IsPathRooted($relativeOutput) -or $relativeOutput -match '(^|[\\/])\.\.([\\/]|$)' -or [IO.Path]::GetExtension($relativeOutput).ToLowerInvariant() -ne '.html') { throw "Unsafe HTML output path: $relativeOutput" }
$output = [IO.Path]::GetFullPath((Join-Path $root $relativeOutput))
if (-not $output.StartsWith($root.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'HTML output escapes ProjectRoot' }

function Relative-Link([string]$From, [string]$To) {
    if ([string]::IsNullOrWhiteSpace($To)) { return '' }
    $fromParts = $From.Replace('\','/').Trim('/').Split('/')
    $toParts = $To.Replace('\','/').Trim('/').Split('/')
    $fromDir = if ($fromParts.Count -gt 1) { @($fromParts[0..($fromParts.Count - 2)]) } else { @() }
    $common = 0; while ($common -lt $fromDir.Count -and $common -lt $toParts.Count -and $fromDir[$common] -ceq $toParts[$common]) { $common++ }
    $parts = @(); for ($j = $common; $j -lt $fromDir.Count; $j++) { $parts += '..' }; for ($j = $common; $j -lt $toParts.Count; $j++) { $parts += $toParts[$j] }
    return ($parts -join '/')
}

$outputRelative = $output.Substring($root.Length).TrimStart('\','/').Replace('\','/')
$rows = @()
foreach ($id in ($records.Keys | Sort-Object { [int]$_.Substring(5) })) {
    $r = $records[$id]
    $link = Relative-Link $outputRelative $r.Relative
    $idCell = if ($link) { '<a href="' + (Html $link) + '">' + (Html $r.Id) + '</a>' } else { Html $r.Id }
    $rows += '<tr><td>' + $idCell + '</td><td>' + (Html $r.Summary) + '</td><td>' + (Html $r.Status) + '</td><td>' + (Html $r.Phase) + '</td><td>' + (Html $r.Definition) + '</td><td>' + (Html $r.Implementation) + '</td><td>' + (Html $r.Static) + '</td><td>' + (Html $r.Runtime) + '</td><td>' + (Html $r.Hold) + '</td><td>' + (Html $r.HoldReason) + '</td><td>' + (Html $r.Progress) + '</td><td>' + (Html $r.NextAction) + '</td><td>' + (Html $r.FormalCI) + '</td></tr>'
}
$html = "<!doctype html>`n<html lang=`"en`"><head><meta charset=`"utf-8`"><meta name=`"viewport`" content=`"width=device-width, initial-scale=1`"><title>TASK inventory</title><style>body{font-family:system-ui,sans-serif;margin:2rem;color:#202124}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{border:1px solid #c7c7c7;padding:.45rem;text-align:left;vertical-align:top}th{background:#eef1f5;white-space:nowrap}td{max-width:20rem;overflow-wrap:anywhere}caption{text-align:left;font-size:1.4rem;font-weight:700;margin-bottom:.8rem}</style></head>`n<body><table><caption>TASK inventory</caption><thead><tr><th>TASK-ID</th><th>Summary</th><th>Status</th><th>Phase</th><th>Definition</th><th>Implementation</th><th>Static verification</th><th>Runtime verification</th><th>Hold</th><th>Hold reason</th><th>Progress</th><th>Next action</th><th>Formal CI</th></tr></thead><tbody>`n$($rows -join "`n")`n</tbody></table></body></html>`n"
if ($Check) {
    if (-not (Test-Path -LiteralPath $output -PathType Leaf)) { throw "Generated TASK HTML is missing: $relativeOutput" }
    $existing = Read-Text $output
    if ($existing -cne $html) {
        $firstDifference = 0
        $limit = [Math]::Min($existing.Length, $html.Length)
        while ($firstDifference -lt $limit -and $existing[$firstDifference] -ceq $html[$firstDifference]) { $firstDifference++ }
        throw "Generated TASK HTML is stale: $relativeOutput (existing=$($existing.Length), expected=$($html.Length), first_difference=$firstDifference)"
    }
    Write-Output "TASK HTML is current: $relativeOutput (20 tasks)."
    exit 0
}
$parent = Split-Path -Parent $output
if (-not (Test-Path -LiteralPath $parent -PathType Container)) { [IO.Directory]::CreateDirectory($parent) | Out-Null }
[IO.File]::WriteAllText($output, $html, (New-Object Text.UTF8Encoding($false)))
Write-Output "Updated $relativeOutput (20 tasks)."
