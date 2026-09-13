[CmdletBinding()]
param([switch]$Check)

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskRoot = Join-Path $root 'docs/ai/tasks'
$outputPath = Join-Path $root 'board/PROGRESS.html'
$utf8NoBom = New-Object Text.UTF8Encoding($false)

function Encode([string]$Value) {
    [Net.WebUtility]::HtmlEncode($Value)
}

function Field([string]$Text, [string]$Name, [string]$Default = '') {
    $match = [regex]::Match($Text, "(?m)^$([regex]::Escape($Name)):\s*(.+?)\s*$")
    if ($match.Success) { return $match.Groups[1].Value.Trim() }
    $Default
}

$tasks = @()
if (Test-Path -LiteralPath $taskRoot -PathType Container) {
    foreach ($file in @(Get-ChildItem -LiteralPath $taskRoot -File -Filter 'TASK-*.md' | Sort-Object Name)) {
        $text = [IO.File]::ReadAllText($file.FullName)
        $titleMatch = [regex]::Match($text, '(?m)^#\s+TASK-[0-9]+\s+[^A-Za-z0-9\r\n]+\s*(.+?)\s*$')
        $nextMatch = [regex]::Match($text, '(?m)^- Next action:\s*(.+?)\s*$')
        $tasks += [pscustomobject]@{
            Id = Field $text 'task_id' $file.BaseName
            Status = Field $text 'status' 'UNKNOWN'
            Phase = Field $text 'phase' 'UNKNOWN'
            Risk = Field $text 'risk' 'UNKNOWN'
            Candidate = Field $text 'current_candidate' 'none'
            Title = if ($titleMatch.Success) { $titleMatch.Groups[1].Value.Trim() } else { $file.BaseName }
            Next = if ($nextMatch.Success) { $nextMatch.Groups[1].Value.Trim() } else { '' }
        }
    }
}

$rows = New-Object 'Collections.Generic.List[string]'
foreach ($task in $tasks) {
    $rows.Add(('      <tr><td><code>{0}</code></td><td>{1}</td><td>{2}</td><td>{3}</td><td>{4}</td><td><code>{5}</code></td><td>{6}</td></tr>' -f
        (Encode $task.Id), (Encode $task.Title), (Encode $task.Status), (Encode $task.Phase),
        (Encode $task.Risk), (Encode $task.Candidate), (Encode $task.Next)))
}
if ($rows.Count -eq 0) { $rows.Add('      <tr><td colspan="7">No TASK files.</td></tr>') }

$activeCount = @($tasks | Where-Object { $_.Status -ceq 'ACTIVE' }).Count
$lines = @(
    '<!-- GENERATED FILE: DO NOT EDIT. NON-NORMATIVE HUMAN VIEW. Source: docs/ai/tasks/TASK-*.md -->',
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>Personal Finance Planner - Task Progress</title>',
    '  <style>body{max-width:1100px;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif;color:#18202a;background:#f7f9fc}h1{margin-bottom:.4rem}.notice{padding:.8rem 1rem;border-left:4px solid #4c6fff;background:#eef2ff}table{width:100%;border-collapse:collapse;background:white}th,td{padding:.7rem;border:1px solid #d8dfeb;text-align:left;vertical-align:top}th{background:#edf1f7}code{overflow-wrap:anywhere}</style>',
    '</head>',
    '<body>',
    '  <h1>Personal Finance Planner - Task Progress</h1>',
    '  <p class="notice"><strong>NON-NORMATIVE HUMAN VIEW.</strong> Canonical current state is owned by the explicitly assigned <code>docs/ai/tasks/TASK-xxx.md</code> file. This page is generated only from <code>docs/ai/tasks/TASK-*.md</code>.</p>',
    "  <p>Tracked TASK files: $($tasks.Count). Active TASKs: $activeCount.</p>",
    '  <table>',
    '    <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Phase</th><th>Risk</th><th>Candidate</th><th>Next action</th></tr></thead>',
    '    <tbody>',
    ($rows -join "`n"),
    '    </tbody>',
    '  </table>',
    '</body>',
    '</html>'
)
$content = ($lines -join "`n") + "`n"

if ($Check) {
    if (-not (Test-Path -LiteralPath $outputPath -PathType Leaf) -or [IO.File]::ReadAllText($outputPath) -cne $content) {
        throw 'board/PROGRESS.html is out of date; run tools/generate-progress.ps1'
    }
    Write-Output 'Non-normative progress view is current.'
    return
}

[IO.Directory]::CreateDirectory((Split-Path -Parent $outputPath)) | Out-Null
[IO.File]::WriteAllText($outputPath, $content, $utf8NoBom)
Write-Output 'Updated non-normative progress view from Shared 2 TASK files.'
