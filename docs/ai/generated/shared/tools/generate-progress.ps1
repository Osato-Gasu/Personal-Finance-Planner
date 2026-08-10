# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.20
# source commit: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
# 直接編集禁止

[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ProjectRoot,[switch]$Check)

$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'import-adapter.ps1')
$root=[IO.Path]::GetFullPath($ProjectRoot);$utf8NoBom=[Text.UTF8Encoding]::new($false)
function ReadText([string]$Relative){return [IO.File]::ReadAllText((Join-Path $root $Relative))}
function Value([string]$Text,[string]$Key,[string]$Source){$m=[regex]::Match($Text,"(?m)^\s*$([regex]::Escape($Key)):\s*(.*?)\s*$");if(-not $m.Success){throw "Missing '$Key' in $Source"};return $m.Groups[1].Value.Trim()}
function Html([AllowNull()][string]$Text){if($null -eq $Text){return ''};return [Net.WebUtility]::HtmlEncode($Text)}
function MapValue([hashtable]$Labels,[string]$Raw,[string]$Kind,[string]$Source){if(-not $Labels.ContainsKey($Raw)){throw "Unknown $Kind '$Raw' in $Source"};return [string]$Labels[$Raw]}

$adapterPath=Join-Path $root 'docs/ai/PROJECT_ADAPTER.psd1'
if(-not(Test-Path -LiteralPath $adapterPath -PathType Leaf)){throw 'Missing docs/ai/PROJECT_ADAPTER.psd1.'}
$adapter=Import-AdapterFile -Path $adapterPath -ExpectedBom present
if([int]$adapter.SchemaVersion -ne 1){throw "Unsupported project adapter schema: $($adapter.SchemaVersion)"}
$columns=@($adapter.Backlog.Columns)
if($columns.Count -lt 2){throw 'Project adapter must define at least two BACKLOG columns.'}
$keys=@{};foreach($column in $columns){if([string]::IsNullOrWhiteSpace($column.Key)-or[string]::IsNullOrWhiteSpace($column.Header)-or[string]::IsNullOrWhiteSpace($column.SourceHeader)-or[string]::IsNullOrWhiteSpace($column.Type)){throw 'BACKLOG column adapter is incomplete.'};if($keys.ContainsKey($column.Key)){throw "Duplicate adapter column key: $($column.Key)"};$keys[$column.Key]=$true;if($column.Type -eq 'map' -and (-not $column.Labels -or $column.Labels.Count -eq 0)){throw "Map column has no labels: $($column.Key)"}}
if(-not($columns|Where-Object{$_.Type -eq 'id'})){throw 'Project adapter requires one id column.'}
$state=ReadText 'docs/ai/CURRENT_STATE.md';$backlog=ReadText 'docs/ai/BACKLOG.md';$next=ReadText 'docs/ai/NEXT_ACTION.yml'
$projectName=[string]$adapter.ProjectName;if([string]::IsNullOrWhiteSpace($projectName)){throw 'ProjectName is required in adapter.'}
$updated=Value $state 'updated_at' 'docs/ai/CURRENT_STATE.md';$nextAction=Value $state 'next_action' 'docs/ai/CURRENT_STATE.md'
$active=@([regex]::Matches($state,'(?m)^\s+-\s+(TASK-[0-9]+)\s*$')|ForEach-Object{$_.Groups[1].Value}|Select-Object -Unique);if($state -match '(?m)^active_tasks:\s*\[\]\s*$'){$active=@()};if($active.Count -gt 1){throw 'active TASK must be 0 or 1.'}
$taskCards=@();foreach($id in $active){$relative="docs/ai/tasks/$id.md";$text=ReadText $relative;$phase=Value $text 'current_phase' $relative;$role=Value $text 'current_role_id' $relative;if(-not $adapter.PhaseLabels.ContainsKey($phase)){throw "Unknown phase '$phase' in $relative"};if(-not $adapter.RoleLabels.ContainsKey($role)){throw "Unknown role '$role' in $relative"};$taskCards+=[pscustomobject]@{Id=$id;Title=(Value $text 'title' $relative);Phase=[string]$adapter.PhaseLabels[$phase];Role=[string]$adapter.RoleLabels[$role];Model=(Value $text 'assigned_model' $relative);Effort=(Value $text 'assigned_effort' $relative)}}
$block=[regex]::Match($backlog,'(?s)<!-- PROGRESS:START -->\s*(.*?)\s*<!-- PROGRESS:END -->');if(-not $block.Success){throw 'BACKLOG progress markers are missing.'}
$lines=@($block.Groups[1].Value -split '\r?\n'|Where-Object{-not[string]::IsNullOrWhiteSpace($_)})
if($lines.Count -lt 2){throw 'BACKLOG table is incomplete.'}
$headerCells=@($lines[0].Trim('|').Split('|')|ForEach-Object{$_.Trim()});if($headerCells.Count -ne $columns.Count){throw "BACKLOG header column count must be $($columns.Count); found $($headerCells.Count)."}
for($i=0;$i-lt$columns.Count;$i++){if($headerCells[$i]-cne[string]$columns[$i].SourceHeader){throw "BACKLOG header mismatch at column ${i}: '$($headerCells[$i])' / '$($columns[$i].SourceHeader)'"}}
$separatorCells=@($lines[1].Trim('|').Split('|')|ForEach-Object{$_.Trim()});if($separatorCells.Count-ne$columns.Count-or@($separatorCells|Where-Object{$_-notmatch'^:?-{3,}:?$'}).Count){throw 'BACKLOG separator row is invalid.'}
$rows=@();$seen=@{};for($lineIndex=2;$lineIndex-lt$lines.Count;$lineIndex++){$line=$lines[$lineIndex];if($line-notmatch'^\|'){throw "Malformed BACKLOG line: $line"};$cells=@($line.Trim('|').Split('|')|ForEach-Object{$_.Trim()});if($cells.Count-ne$columns.Count){throw "BACKLOG row must have $($columns.Count) cells: $line"};$display=[ordered]@{};for($i=0;$i-lt$columns.Count;$i++){$column=$columns[$i];$raw=$cells[$i];switch($column.Type){'id'{if($raw-notmatch'^[A-Z][A-Z0-9]*-[A-Z0-9-]+$'){throw "Invalid BACKLOG ID: $raw"};if($seen.ContainsKey($raw)){throw "Duplicate BACKLOG ID: $raw"};$seen[$raw]=$true;$display[$column.Key]=$raw}'map'{$display[$column.Key]=MapValue $column.Labels $raw $column.Key 'docs/ai/BACKLOG.md'}'text'{$display[$column.Key]=$raw}default{throw "Unknown adapter column type: $($column.Type)"}}};$rows+=[pscustomobject]$display}
$tableHeaders=@($columns|ForEach-Object{"<th>$(Html $_.Header)</th>"}) -join ''
$tableRows=@($rows|ForEach-Object{$row=$_;$cells=@($columns|ForEach-Object{"<td>$(Html ([string]$row.($_.Key)))</td>"}) -join '';"      <tr>$cells</tr>"})
if($taskCards.Count-eq0){$current=@"
  <section class="current-task"><div class="cards">
    <div class="card"><span class="label">現在の機能</span>なし</div><div class="card"><span class="label">現在の工程</span>なし</div>
    <div class="card"><span class="label">現在の担当</span>なし</div><div class="card"><span class="label">モデル／負荷</span>なし</div>
    <div class="card wide"><span class="label">次の作業</span>$(Html $nextAction)</div></div><p class="meta">現在着手中の機能はありません</p></section>
"@;$activeSummary='なし'}else{$t=$taskCards[0];$activeSummary="$($t.Id) — $($t.Title)";$current=@"
  <section class="current-task"><h3>$(Html $t.Id)</h3><div class="cards">
    <div class="card"><span class="label">現在の機能</span>$(Html $t.Title)</div><div class="card"><span class="label">現在の工程</span>$(Html $t.Phase)</div>
    <div class="card"><span class="label">現在の担当</span>$(Html $t.Role)</div><div class="card"><span class="label">モデル／負荷</span>$(Html "$($t.Model) / $($t.Effort)")</div>
    <div class="card wide"><span class="label">次の作業</span>$(Html $nextAction)</div></div></section>
"@}
$productCards=''
if($adapter.ProductIdentity.Mode -eq 'single_file'){
    $sourceRelative=[string]$adapter.ProductIdentity.SourceFile;$prefix=[string]$adapter.ProductIdentity.FieldPrefix
    if([string]::IsNullOrWhiteSpace($sourceRelative)-or[string]::IsNullOrWhiteSpace($prefix)){throw 'single_file product identity requires SourceFile and FieldPrefix.'}
    $identityText=ReadText $sourceRelative
    $productCommit=Value $identityText ($prefix+'commit') $sourceRelative
    $productSha=Value $identityText ($prefix+'sha256') $sourceRelative
    $productBytes=Value $identityText ($prefix+'bytes') $sourceRelative
    if([bool]$adapter.ProductIdentity.Display){$productCards='<div class="card"><span class="label">正式製品</span><code>{0}</code></div><div class="card"><span class="label">製品 SHA-256</span><code>{1}</code><br>{2} バイト</div>' -f (Html $productCommit),(Html $productSha),(Html $productBytes)}
}elseif($adapter.ProductIdentity.Mode -ne 'none'){throw "Unknown product identity mode: $($adapter.ProductIdentity.Mode)"}
$html=@"
<!-- GENERATED FILE: DO NOT EDIT. Source: project adapter, CURRENT_STATE, active TASK, BACKLOG, NEXT_ACTION -->
<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>$(Html $projectName) — 進捗</title><style>:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#10131a;color:#eef2ff}body{max-width:1180px;margin:0 auto;padding:2rem 1rem 4rem}h1{font-size:1.55rem}.meta{color:#b8c1d9}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem;margin:1.5rem 0}.card{border:1px solid #343c52;border-radius:.65rem;padding:.9rem;background:#171c27}.wide{grid-column:span 2}.label{display:block;color:#9fa9c5;font-size:.8rem;margin-bottom:.3rem}code{overflow-wrap:anywhere}.table-wrap{overflow-x:auto;border:1px solid #343c52;border-radius:.65rem}table{border-collapse:collapse;width:100%;min-width:900px;background:#171c27}th,td{text-align:left;padding:.7rem;border-bottom:1px solid #2d3447;vertical-align:top}th{background:#202637}@media(max-width:560px){.wide{grid-column:auto}}</style></head><body>
<h1>$(Html $projectName) — 進捗</h1><p class="meta">この画面は正本ではありません。project adapter、CURRENT_STATE、active TASK、BACKLOG、NEXT_ACTIONから自動生成されています。</p><p class="meta">更新日: $(Html $updated)</p>
<div class="cards">$productCards<div class="card"><span class="label">現在の機能</span>$(Html $activeSummary)</div><div class="card"><span class="label">BACKLOG</span>$($rows.Count)</div></div>
<h2>現在地点</h2>$current<h2>BACKLOG</h2><div class="table-wrap"><table><thead><tr>$tableHeaders</tr></thead><tbody>
$($tableRows-join"`n")
</tbody></table></div></body></html>
"@
$html=$html.Replace("`r`n","`n");$path=Join-Path $root 'board/PROGRESS.html'
if($Check){if(-not(Test-Path $path)-or[IO.File]::ReadAllText($path)-cne$html){Write-Error 'board/PROGRESS.html is out of date.';exit 1};Write-Output "Progress board is current ($($rows.Count) backlog rows; $($taskCards.Count) active tasks).";return}
[IO.Directory]::CreateDirectory((Split-Path -Parent $path))|Out-Null;[IO.File]::WriteAllText($path,$html,$utf8NoBom);Write-Output "Generated board/PROGRESS.html ($($rows.Count) backlog rows; $($taskCards.Count) active tasks)."
