# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ProjectRoot,
    [string]$SharedRoot,
    [switch]$Check,
    [string]$ManagedAdoptionPlanPath,
    [switch]$InstallSeeds
)

$ErrorActionPreference = 'Stop'
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$utf8Bom = [System.Text.UTF8Encoding]::new($true)
$strictUtf8NoBom = [System.Text.UTF8Encoding]::new($false, $true)
$directEditForbidden = [regex]::Unescape('\u76f4\u63a5\u7de8\u96c6\u7981\u6b62')
$project = [System.IO.Path]::GetFullPath($ProjectRoot)
$generatedRoot = Join-Path $project 'docs/ai/generated/shared'
$lockPath = Join-Path $project 'docs/ai/SHARED_RULES.lock.yml'

function Get-Sha256Bytes([byte[]]$Bytes) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-', '') }
    finally { $sha.Dispose() }
}
function Get-Sha256File([string]$Path) { return Get-Sha256Bytes ([System.IO.File]::ReadAllBytes($Path)) }
function ConvertTo-OutputTextBytes([string]$Text,[bool]$WithBom) {
    $payload=$utf8NoBom.GetBytes($Text)
    if(-not$WithBom){return $payload}
    $preamble=$utf8Bom.GetPreamble()
    $bytes=[byte[]]::new($preamble.Length+$payload.Length)
    [Array]::Copy($preamble,0,$bytes,0,$preamble.Length)
    [Array]::Copy($payload,0,$bytes,$preamble.Length,$payload.Length)
    return $bytes
}
function Get-GitBlobIdBytes([byte[]]$Bytes) {
    $header = [Text.Encoding]::ASCII.GetBytes("blob $($Bytes.Length)`0")
    $input = [byte[]]::new($header.Length + $Bytes.Length)
    [Array]::Copy($header, 0, $input, 0, $header.Length)
    [Array]::Copy($Bytes, 0, $input, $header.Length, $Bytes.Length)
    $sha = [Security.Cryptography.SHA1]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($input))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}
function ConvertFrom-CanonicalTextBytes([byte[]]$Bytes, [string]$Source) {
    if ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF) { throw "UTF-8 BOM is forbidden: $Source" }
    if ($Bytes -contains 13) { throw "CR byte is forbidden: $Source" }
    if ($Bytes.Length -eq 0 -or $Bytes[$Bytes.Length - 1] -ne 10 -or ($Bytes.Length -ge 2 -and $Bytes[$Bytes.Length - 2] -eq 10)) { throw "File must end with exactly one LF: $Source" }
    try { $text = $strictUtf8NoBom.GetString($Bytes) }
    catch { throw "Canonical text must be valid UTF-8: $Source" }
    if(-not$text.IsNormalized([Text.NormalizationForm]::FormC)){throw "Canonical text must be Unicode NFC: $Source"}
    foreach ($character in $text.ToCharArray()) {
        $code = [int]$character
        if ([char]::IsControl($character) -and $code -ne 9 -and $code -ne 10) { throw "Control character is forbidden in text payload: $Source" }
    }
    return $text
}
function Invoke-GitValue([string[]]$Arguments, [string]$Failure) {
    $value = @(& git -C $resolvedShared @Arguments 2>$null)
    if ($LASTEXITCODE -ne 0) { throw $Failure }
    return ($value -join "`n").Trim()
}
function Assert-SourceRepository {
    $sourceCommit = Invoke-GitValue @('rev-parse', '--verify', 'HEAD^{commit}') 'Shared source must have a committed HEAD.'
    if ($sourceCommit -notmatch '^[0-9a-f]{40}$') { throw 'Shared source commit identity is invalid.' }
    $repositoryRoot = Invoke-GitValue @('rev-parse', '--show-toplevel') 'Shared source must be a Git worktree.'
    $expectedRoot = [IO.Path]::GetFullPath($resolvedShared).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $actualRoot = [IO.Path]::GetFullPath($repositoryRoot).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    if (-not $actualRoot.Equals($expectedRoot, [StringComparison]::OrdinalIgnoreCase)) { throw "SharedRoot must be the Git worktree root: $actualRoot" }
    $status = @(& git -C $resolvedShared status --porcelain=v1 --untracked-files=all --ignore-submodules=none 2>$null)
    if ($LASTEXITCODE -ne 0) { throw 'Shared source clean-state check failed.' }
    if ($status.Count -ne 0) { throw "Shared source must be clean (no staged, unstaged, or untracked files): $($status -join '; ')" }
    return $sourceCommit
}
function Read-CommittedCanonicalText([string]$Relative, [string]$Commit) {
    $relativePath = $Relative.Replace('\', '/')
    if ([IO.Path]::IsPathRooted($relativePath) -or $relativePath -match '(^|/)\.\.(/|$)') { throw "Manifest source path escapes SharedRoot: $Relative" }
    $fullPath = [IO.Path]::GetFullPath((Join-Path $resolvedShared $relativePath))
    $rootPrefix = [IO.Path]::GetFullPath($resolvedShared).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $fullPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Manifest source path escapes SharedRoot: $Relative" }
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { throw "Committed source file is missing: $Relative" }
    if (((Get-Item -LiteralPath $fullPath).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Reparse point is forbidden: $Relative" }
    $bytes = [IO.File]::ReadAllBytes($fullPath)
    $text = ConvertFrom-CanonicalTextBytes $bytes $Relative
    $workingBlob = Get-GitBlobIdBytes $bytes
    $commitBlob = Invoke-GitValue @('rev-parse', "$Commit`:$relativePath") "Committed source blob is missing: $Relative"
    if ($commitBlob -notmatch '^[0-9a-f]{40}$' -or $workingBlob -cne $commitBlob) { throw "Working bytes do not match source commit blob: $Relative" }
    return [pscustomobject]@{ Bytes=$bytes; Text=$text; Blob=$commitBlob }
}
function Get-Payload([string]$Text) {
    $pattern = '\A# GENERATED FILE: DO NOT EDIT\.\r?\n# source version: .+?\r?\n# source commit: .+?\r?\n# \u76f4\u63a5\u7de8\u96c6\u7981\u6b62\r?\n\r?\n'
    return [regex]::Replace($Text, $pattern, '', [Text.RegularExpressions.RegexOptions]::None)
}
function Get-InstalledPayload([string]$Text){
    if(-not$governanceV1){return $Text}
    $Text.Replace('<shared-version>',$version).Replace('<shared-commit>',$sourceCommit).Replace('<shared-tree>',$sourceTree).Replace('<manifest-sha256>',$manifestSha).Replace('<40-hex-commit>',$sourceCommit).Replace('<40-hex-tree>',$sourceTree).Replace('<64-uppercase-hex>',$manifestSha)
}
function Resolve-ProjectTarget([string]$Target){
    $relative=$Target.Replace('\','/');if([IO.Path]::IsPathRooted($relative)-or$relative-match'(^|/)\.\.(/|$)'){throw "Manifest target escapes project root: $Target"}
    $full=[IO.Path]::GetFullPath((Join-Path $project $relative));$prefix=$project.TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)+[IO.Path]::DirectorySeparatorChar
    if(-not$full.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw "Manifest target escapes project root: $Target"};$full
}
function Get-SafeProjectTree {
    $prefix=$project.TrimEnd('\','/')+'\';$gitPath=[IO.Path]::GetFullPath((Join-Path $project '.git'))
    $rootItem=Get-Item -LiteralPath $project -Force
    if(($rootItem.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne0){throw "Project transaction root is a reparse point: $project"}
    $files=[Collections.Generic.List[object]]::new();$directories=[Collections.Generic.List[object]]::new();$pending=[Collections.Generic.Stack[string]]::new();$pending.Push($project)
    while($pending.Count-gt0){
        $current=$pending.Pop()
        foreach($item in @(Get-ChildItem -LiteralPath $current -Force)){
            $full=[IO.Path]::GetFullPath($item.FullName)
            if($full.Equals($gitPath,[StringComparison]::OrdinalIgnoreCase)-or$full.StartsWith(($gitPath.TrimEnd('\')+'\'),[StringComparison]::OrdinalIgnoreCase)){continue}
            if(-not$full.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw "Project transaction entry escapes root: $full"}
            if(($item.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne0){throw "Project transaction reparse point is forbidden: $full"}
            if($item.PSIsContainer){$directories.Add($item);$pending.Push($full)}else{$files.Add($item)}
        }
    }
    [pscustomobject]@{Files=@($files|Sort-Object FullName);Directories=@($directories|Sort-Object FullName)}
}
function Get-ProjectTransactionSnapshot {
    $files=[ordered]@{};$directories=[Collections.Generic.List[string]]::new();$prefix=$project.TrimEnd('\','/')+'\';$tree=Get-SafeProjectTree
    foreach($file in @($tree.Files)){$full=[IO.Path]::GetFullPath($file.FullName);$relative=$full.Substring($prefix.Length).Replace('\','/');$files[$relative]=[Convert]::ToBase64String([IO.File]::ReadAllBytes($full))}
    foreach($directory in @($tree.Directories)){$full=[IO.Path]::GetFullPath($directory.FullName);$directories.Add($full.Substring($prefix.Length).Replace('\','/'))}
    [pscustomobject]@{Files=$files;Directories=@($directories)}
}
function Test-ProjectTransactionSnapshot($Expected,$Actual){
    if($Expected.Files.Count-ne$Actual.Files.Count-or$Expected.Directories.Count-ne$Actual.Directories.Count){return $false}
    foreach($key in @($Expected.Files.Keys)){if(-not$Actual.Files.Contains($key)-or[string]$Actual.Files[$key]-cne[string]$Expected.Files[$key]){return $false}}
    for($i=0;$i-lt$Expected.Directories.Count;$i++){if([string]$Expected.Directories[$i]-cne[string]$Actual.Directories[$i]){return $false}};$true
}
function Remove-SafeProjectDirectoryTree([string]$Path){
    $full=[IO.Path]::GetFullPath($Path);$prefix=$project.TrimEnd('\','/')+'\'
    if(-not$full.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw "Rollback directory escapes project root: $full"}
    $item=Get-Item -LiteralPath $full -Force
    if(-not$item.PSIsContainer){throw "Rollback expected a directory: $full"}
    if(($item.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne0){throw "Rollback refuses a reparse-point directory: $full"}
    foreach($child in @(Get-ChildItem -LiteralPath $full -Force)){
        $childFull=[IO.Path]::GetFullPath($child.FullName)
        if(-not$childFull.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw "Rollback child escapes project root: $childFull"}
        if(($child.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne0){throw "Rollback refuses a reparse-point child: $childFull"}
        if($child.PSIsContainer){Remove-SafeProjectDirectoryTree $childFull}else{[IO.File]::Delete($childFull)}
    }
    [IO.Directory]::Delete($full,$false)
}
function Restore-ProjectTransactionSnapshot($Snapshot){
    $prefix=$project.TrimEnd('\','/')+'\';$null=Get-SafeProjectTree
    $baselineFiles=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal);foreach($relative in @($Snapshot.Files.Keys)){$null=$baselineFiles.Add([string]$relative)}
    $baselineDirectories=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal);foreach($relative in @($Snapshot.Directories)){$null=$baselineDirectories.Add([string]$relative)}
    foreach($relative in @($Snapshot.Files.Keys)){
        $full=Resolve-ProjectTarget ([string]$relative)
        if(Test-Path -LiteralPath $full -PathType Container){Remove-SafeProjectDirectoryTree $full}
    }
    foreach($relative in @($Snapshot.Directories|Sort-Object {($_-split'/').Count},@{Expression={$_};Ascending=$true})){
        $full=Resolve-ProjectTarget ([string]$relative)
        if(Test-Path -LiteralPath $full -PathType Leaf){$item=Get-Item -LiteralPath $full -Force;if(($item.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne0){throw "Rollback refuses a reparse-point file: $full"};[IO.File]::Delete($full)}
        [IO.Directory]::CreateDirectory($full)|Out-Null
    }
    foreach($relative in @($Snapshot.Files.Keys)){
        $full=Resolve-ProjectTarget ([string]$relative);[IO.Directory]::CreateDirectory((Split-Path -Parent $full))|Out-Null
        [IO.File]::WriteAllBytes($full,[Convert]::FromBase64String([string]$Snapshot.Files[$relative]))
    }
    $current=Get-SafeProjectTree
    foreach($file in @($current.Files|Sort-Object FullName -Descending)){
        $full=[IO.Path]::GetFullPath($file.FullName);$relative=$full.Substring($prefix.Length).Replace('\','/')
        if(-not$baselineFiles.Contains($relative)){[IO.File]::Delete($full)}
    }
    $current=Get-SafeProjectTree
    foreach($directory in @($current.Directories|Sort-Object {$_.FullName.Length} -Descending)){
        $full=[IO.Path]::GetFullPath($directory.FullName);$relative=$full.Substring($prefix.Length).Replace('\','/')
        if(-not$baselineDirectories.Contains($relative)){[IO.Directory]::Delete($full,$false)}
    }
    $actual=Get-ProjectTransactionSnapshot;if(-not(Test-ProjectTransactionSnapshot $Snapshot $actual)){throw 'Project transaction rollback did not restore the exact file and directory snapshot.'}
}
function Invoke-PostWriteGate([string]$Name,[string]$Script,[string[]]$Arguments){
    if(-not(Test-Path -LiteralPath $Script -PathType Leaf)){throw "Post-write gate script is missing: $Name / $Script"}
    $hostPath=[Diagnostics.Process]::GetCurrentProcess().MainModule.FileName;if(-not(Test-Path -LiteralPath $hostPath -PathType Leaf)){throw "Post-write PowerShell host is unavailable: $Name"}
    $output=@(& $hostPath -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $Script @Arguments 2>&1);$exitCode=$LASTEXITCODE
    if($exitCode-ne0){throw "Post-write gate failed: $Name (exit $exitCode)`n$($output-join"`n")"}
}
function Get-GitBlobSha1Bytes([byte[]]$Bytes){
    $header=[Text.Encoding]::ASCII.GetBytes("blob $($Bytes.Length)`0");$input=[byte[]]::new($header.Length+$Bytes.Length);[Array]::Copy($header,0,$input,0,$header.Length);[Array]::Copy($Bytes,0,$input,$header.Length,$Bytes.Length)
    $sha=[Security.Cryptography.SHA1]::Create();try{([BitConverter]::ToString($sha.ComputeHash($input))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
}
function Test-Utf8Boundary([byte[]]$Bytes,[long]$Offset){
    if($Offset-lt0-or$Offset-gt$Bytes.Length){return $false};try{$null=$strictUtf8NoBom.GetString($Bytes,0,[int]$Offset);$true}catch{$false}
}
function Get-RawTextFacts([byte[]]$Bytes){
    try{$null=$strictUtf8NoBom.GetString($Bytes)}catch{throw 'Managed adoption old target must be valid UTF-8.'}
    $bom=$Bytes.Length-ge3-and$Bytes[0]-eq0xEF-and$Bytes[1]-eq0xBB-and$Bytes[2]-eq0xBF;$lf=0;$crlf=0;$loneCr=0
    for($i=0;$i-lt$Bytes.Length;$i++){if($Bytes[$i]-eq10){$lf++;if($i-gt0-and$Bytes[$i-1]-eq13){$crlf++}}elseif($Bytes[$i]-eq13-and($i+1-ge$Bytes.Length-or$Bytes[$i+1]-ne10)){$loneCr++}}
    if($loneCr-ne0){throw 'Managed adoption old target contains unsupported lone CR line endings.'}
    $lineEndings=if($lf-eq0){'none'}elseif($crlf-eq$lf){'crlf'}elseif($crlf-eq0){'lf'}else{'mixed'}
    $lineCount=if($Bytes.Length-eq0){0}else{$lf+$(if($Bytes[$Bytes.Length-1]-eq10){0}else{1})}
    [pscustomobject]@{Bom=if($bom){'present'}else{'absent'};LineEndings=$lineEndings;LineCount=$lineCount}
}
function Get-LineNumberAtByte([byte[]]$Bytes,[long]$Offset){
    $line=1;for($i=0;$i-lt$Offset;$i++){if($Bytes[$i]-eq10){$line++}};$line
}
function Read-ManagedAdoptionPlan([object[]]$ManagedEntries){
    if([string]::IsNullOrWhiteSpace($ManagedAdoptionPlanPath)){return $null}
    $planPath=[IO.Path]::GetFullPath($ManagedAdoptionPlanPath);$planBytes=[IO.File]::ReadAllBytes($planPath);$planText=ConvertFrom-CanonicalTextBytes $planBytes 'managed adoption plan';$plan=$planText|ConvertFrom-Json -ErrorAction Stop
    $names=@($plan.PSObject.Properties.Name);$expected=@('schema_version','task_id','source_commit','semantic_review','managed_adoptions');if(($names-join'|')-cne($expected-join'|')){throw 'Managed adoption plan root fields/order are invalid.'}
    if([int]$plan.schema_version-ne1-or[string]$plan.task_id-notmatch'^TASK-[0-9]+$'-or[string]$plan.source_commit-cne$sourceCommit){throw 'Managed adoption plan identity is invalid.'}
    $reviewNames=@($plan.semantic_review.PSObject.Properties.Name);if(($reviewNames-join'|')-cne'reviewer|decision|task_id|source_commit|baseline_commit|baseline_tree|classification_sha256s'){throw 'Managed adoption semantic review fields/order are invalid.'}
    if([string]$plan.semantic_review.reviewer-cne'ChatGPT'-or[string]$plan.semantic_review.decision-cne'APPROVED'-or[string]$plan.semantic_review.task_id-cne[string]$plan.task_id-or[string]$plan.semantic_review.source_commit-cne$sourceCommit){throw 'Managed adoption semantic review approval is invalid.'}
    $projectHead=@(& git -C $project rev-parse --verify 'HEAD^{commit}' 2>$null);if($LASTEXITCODE-ne0-or$projectHead.Count-ne1){throw 'Managed adoption project baseline commit is unavailable.'};$projectHead=$projectHead[0].Trim()
    $projectTree=@(& git -C $project rev-parse --verify 'HEAD^{tree}' 2>$null);if($LASTEXITCODE-ne0-or$projectTree.Count-ne1){throw 'Managed adoption project baseline tree is unavailable.'};$projectTree=$projectTree[0].Trim()
    if([string]$plan.semantic_review.baseline_commit-cne$projectHead-or[string]$plan.semantic_review.baseline_tree-cne$projectTree){throw 'Managed adoption semantic review is not bound to project baseline.'}
    $byTarget=@{};$adoptions=@($plan.managed_adoptions);$reviewHashes=@($plan.semantic_review.classification_sha256s);if($reviewHashes.Count-ne$adoptions.Count){throw 'Managed adoption semantic review classification hash count is invalid.'}
    for($adoptionIndex=0;$adoptionIndex-lt$adoptions.Count;$adoptionIndex++){$record=$adoptions[$adoptionIndex]
        $recordNames=@($record.PSObject.Properties.Name);if(($recordNames-join'|')-cne'target|source_path|baseline_commit|baseline_tree|expected_existing_blob|expected_existing_sha256|classification_artifact|classification_schema_version|classification_sha256'){throw 'Managed adoption record fields/order are invalid.'}
        $target=[string]$record.target;if($byTarget.ContainsKey($target)){throw "Managed adoption plan target is duplicated: $target"};$byTarget[$target]=$record
        if([string]$record.baseline_commit-cne$projectHead-or[string]$record.baseline_tree-cne$projectTree-or[string]$record.classification_sha256-notmatch'^[A-F0-9]{64}$'-or[string]$reviewHashes[$adoptionIndex]-cne[string]$record.classification_sha256){throw "Managed adoption record baseline or semantic-review binding is invalid: $target"}
    }
    foreach($entry in $ManagedEntries){
        if(-not$byTarget.ContainsKey([string]$entry.Target)){throw "Managed adoption plan target is missing: $($entry.Target)"}
        $record=$byTarget[[string]$entry.Target];if([string]$record.source_path-cne[string]$entry.Path){throw "Managed adoption source path mismatch: $($entry.Target)"}
        $targetPath=Resolve-ProjectTarget $entry.Target;if(-not(Test-Path -LiteralPath $targetPath -PathType Leaf)){throw "Managed adoption target is absent or renamed: $($entry.Target)"};$oldBytes=[IO.File]::ReadAllBytes($targetPath);$oldSha=Get-Sha256Bytes $oldBytes
        $oldBlob=@(& git -C $project rev-parse --verify "$projectHead`:$($entry.Target)" 2>$null);if($LASTEXITCODE-ne0-or$oldBlob.Count-ne1){throw "Managed adoption target is not present in the pinned baseline: $($entry.Target)"};$oldBlob=$oldBlob[0].Trim()
        if((Get-GitBlobSha1Bytes $oldBytes)-cne$oldBlob-or[string]$record.expected_existing_blob-cne$oldBlob-or[string]$record.expected_existing_sha256-cne$oldSha){throw "Managed adoption old blob/SHA identity mismatch: $($entry.Target)"}
        $artifactRelative=[string]$record.classification_artifact;$artifactPath=Resolve-ProjectTarget $artifactRelative;if(-not(Test-Path -LiteralPath $artifactPath -PathType Leaf)){throw "Managed adoption classification artifact is missing: $artifactRelative"};$artifactBytes=[IO.File]::ReadAllBytes($artifactPath)
        if((Get-Sha256Bytes $artifactBytes)-cne[string]$record.classification_sha256-or[int]$record.classification_schema_version-ne1){throw "Managed adoption classification artifact identity mismatch: $($entry.Target)"}
        $artifactText=ConvertFrom-CanonicalTextBytes $artifactBytes "managed adoption classification artifact $artifactRelative";$artifact=$artifactText|ConvertFrom-Json -ErrorAction Stop
        $artifactFields=@('schema_version','task_id','target','baseline_commit','baseline_tree','old_target_blob','old_target_sha256','source_byte_length','source_line_count','source_encoding','source_bom','source_line_endings','ranges');if((@($artifact.PSObject.Properties.Name)-join'|')-cne($artifactFields-join'|')){throw "Managed adoption classification artifact fields/order are invalid: $($entry.Target)"}
        $facts=Get-RawTextFacts $oldBytes
        if([int]$artifact.schema_version-ne1-or[string]$artifact.task_id-cne[string]$plan.task_id-or[string]$artifact.target-cne[string]$entry.Target-or[string]$artifact.baseline_commit-cne$projectHead-or[string]$artifact.baseline_tree-cne$projectTree-or[string]$artifact.old_target_blob-cne$oldBlob-or[string]$artifact.old_target_sha256-cne$oldSha-or[long]$artifact.source_byte_length-ne$oldBytes.Length-or[long]$artifact.source_line_count-ne$facts.LineCount-or[string]$artifact.source_encoding-cne'utf-8'-or[string]$artifact.source_bom-cne$facts.Bom-or[string]$artifact.source_line_endings-cne$facts.LineEndings){throw "Managed adoption classification source identity mismatch: $($entry.Target)"}
        $renderedBytes=$utf8NoBom.GetBytes((Get-InstalledPayload $sourceRecords[$entry.Path].Text));$rangeIds=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal);$expectedStart=0;$previousRangeId=''
        foreach($range in @($artifact.ranges)){
            $rangeFields=@('range_id','byte_start','byte_end_exclusive','line_start','line_end_inclusive','classification','destination_path','destination_anchor','destination_candidate_blob','destination_candidate_sha256','disposition','rationale');if((@($range.PSObject.Properties.Name)-join'|')-cne($rangeFields-join'|')){throw "Managed adoption classification range fields/order are invalid: $($entry.Target)"}
            $startType=$range.byte_start-is[int]-or$range.byte_start-is[long];$endType=$range.byte_end_exclusive-is[int]-or$range.byte_end_exclusive-is[long];$lineStartType=$range.line_start-is[int]-or$range.line_start-is[long];$lineEndType=$range.line_end_inclusive-is[int]-or$range.line_end_inclusive-is[long]
            $rangeId=[string]$range.range_id;$start=[long]$range.byte_start;$end=[long]$range.byte_end_exclusive
            if(-not$startType-or-not$endType-or-not$lineStartType-or-not$lineEndType-or$rangeId-notmatch'^R-[0-9]{4}$'-or-not$rangeIds.Add($rangeId)-or($previousRangeId-ne''-and[string]::CompareOrdinal($previousRangeId,$rangeId)-ge0)-or$start-ne$expectedStart-or$end-le$start-or$end-gt$oldBytes.Length-or-not(Test-Utf8Boundary $oldBytes $start)-or-not(Test-Utf8Boundary $oldBytes $end)){throw "Managed adoption byte range is invalid: $($entry.Target)/$rangeId"}
            $actualLineStart=Get-LineNumberAtByte $oldBytes $start;$actualLineEnd=Get-LineNumberAtByte $oldBytes ($end-1);if([long]$range.line_start-ne$actualLineStart-or[long]$range.line_end_inclusive-ne$actualLineEnd){throw "Managed adoption line range is inconsistent: $($entry.Target)/$rangeId"}
            $classification=[string]$range.classification;$disposition=[string]$range.disposition;if(@('common_governance','project_safety','project_execution','non_normative')-cnotcontains$classification-or@('replaced_by_managed_loader','moved_to_project_rules','moved_to_workflow','retained_project_owned','discarded_non_normative')-cnotcontains$disposition-or[string]::IsNullOrWhiteSpace([string]$range.rationale)){throw "Managed adoption classification/disposition/rationale is invalid: $($entry.Target)/$rangeId"}
            if($disposition-ceq'discarded_non_normative'){
                if($classification-cne'non_normative'-or[string]$range.destination_path-cne'none'-or[string]$range.destination_anchor-cne'none'-or[string]$range.destination_candidate_blob-cne'none'-or[string]$range.destination_candidate_sha256-cne'none'){throw "Managed adoption discarded range destination is invalid: $($entry.Target)/$rangeId"}
            }else{
                $destinationPath=[string]$range.destination_path;$destinationBytes=if($destinationPath-ceq[string]$entry.Target){$renderedBytes}else{$destinationFull=Resolve-ProjectTarget $destinationPath;if(-not(Test-Path -LiteralPath $destinationFull -PathType Leaf)){throw "Managed adoption destination is missing: $destinationPath"};[IO.File]::ReadAllBytes($destinationFull)}
                $destinationAnchor=[string]$range.destination_anchor;$destinationText=$strictUtf8NoBom.GetString($destinationBytes);if([string]::IsNullOrWhiteSpace($destinationAnchor)-or([regex]::Matches($destinationText,[regex]::Escape($destinationAnchor))).Count-ne1-or[string]$range.destination_candidate_blob-cne(Get-GitBlobSha1Bytes $destinationBytes)-or[string]$range.destination_candidate_sha256-cne(Get-Sha256Bytes $destinationBytes)){throw "Managed adoption destination identity/anchor is invalid: $($entry.Target)/$rangeId"}
            }
            $expectedStart=$end;$previousRangeId=$rangeId
        }
        if($expectedStart-ne$oldBytes.Length-or$oldBytes.Length-eq0){throw "Managed adoption byte classification is incomplete: $($entry.Target)"}
    }
    if($byTarget.Count-ne$ManagedEntries.Count){throw 'Managed adoption plan has an unknown target.'};$plan
}
function Read-Key([string]$Text, [string]$Key, [string]$Source) {
    $match = [regex]::Match($Text, "(?m)^$([regex]::Escape($Key)):\s*(.+?)\s*$")
    if (-not $match.Success) { throw "Missing '$Key' in $Source" }
    return $match.Groups[1].Value.Trim()
}
function Read-Manifest([string]$Text,[bool]$GovernanceV1) {
    $pattern=if($GovernanceV1){'(?ms)^  - path:\s*(?<path>\S+)\n    target:\s*(?<target>\S+)\n    mode:\s*(?<mode>snapshot|managed|seed|source_only)\n    sha256:\s*(?<sha>[A-F0-9]{64})$'}else{'(?ms)^  - path:\s*(?<path>\S+)\s*\r?\n    target:\s*(?<target>\S+)\s*\r?\n    sha256:\s*(?<sha>[A-F0-9]{64})\s*$'}
    $matches = [regex]::Matches($Text,$pattern)
    if ($matches.Count -eq 0) { throw 'manifest.yml has no files.' }
    if($GovernanceV1-and$matches.Count-ne[regex]::Matches($Text,'(?m)^  - path:').Count){throw 'governance v1 manifest contains a malformed or mode-less entry.'}
    return @($matches | ForEach-Object { [pscustomobject]@{ Path=$_.Groups['path'].Value; Target=$_.Groups['target'].Value; Mode=if($GovernanceV1){$_.Groups['mode'].Value}else{'snapshot'}; Sha=$_.Groups['sha'].Value } })
}
function Resolve-SharedRoot {
    if (-not [string]::IsNullOrWhiteSpace($SharedRoot)) { return [System.IO.Path]::GetFullPath($SharedRoot) }
    if (-not [string]::IsNullOrWhiteSpace($env:AI_DEVELOPMENT_GOVERNANCE_ROOT)) { return [System.IO.Path]::GetFullPath($env:AI_DEVELOPMENT_GOVERNANCE_ROOT) }
    return [System.IO.Path]::GetFullPath((Join-Path $project '../../_shared/ai-development-governance'))
}

$resolvedShared = Resolve-SharedRoot
$sharedRootExists = Test-Path -LiteralPath $resolvedShared -PathType Container
$sourceAvailable = Test-Path -LiteralPath (Join-Path $resolvedShared 'manifest.yml') -PathType Leaf
$snapshotManifestPath = Join-Path $generatedRoot 'manifest.yml'

if ($sharedRootExists -and -not $sourceAvailable) { throw "Shared source directory exists but manifest.yml is missing: $resolvedShared" }
if (-not $sourceAvailable -and -not $Check) { throw "Shared source is unavailable: $resolvedShared" }
if (-not $sourceAvailable -and -not (Test-Path -LiteralPath $snapshotManifestPath -PathType Leaf)) { throw 'Shared source and project snapshot are both unavailable.' }
if (-not (Test-Path -LiteralPath $lockPath -PathType Leaf) -and $Check) { throw 'Missing docs/ai/SHARED_RULES.lock.yml.' }

if ($sourceAvailable) {
    $sourceCommit = Assert-SourceRepository
    $sourceTree = Invoke-GitValue @('rev-parse','--verify',"$sourceCommit`^{tree}") 'Shared source tree identity is unavailable.'
    $sourceRecords = @{}
    $sourceRecords['manifest.yml'] = Read-CommittedCanonicalText 'manifest.yml' $sourceCommit
    $sourceRecords['VERSION'] = Read-CommittedCanonicalText 'VERSION' $sourceCommit
    $sourceRecords['.gitattributes'] = Read-CommittedCanonicalText '.gitattributes' $sourceCommit
    $manifestText = $sourceRecords['manifest.yml'].Text
    $manifestBytes = $sourceRecords['manifest.yml'].Bytes
    $version = $sourceRecords['VERSION'].Text.Trim()
    $syncedAt = Invoke-GitValue @('show', '-s', '--format=%cI', $sourceCommit) 'Shared source commit time is unavailable.'
} else {
    $snapshotManifestBytes = [System.IO.File]::ReadAllBytes($snapshotManifestPath)
    $snapshotManifestText = ConvertFrom-CanonicalTextBytes $snapshotManifestBytes 'generated manifest snapshot'
    $manifestText = Get-Payload $snapshotManifestText
    $manifestBytes = $utf8NoBom.GetBytes($manifestText)
    $lockTextForSource = ConvertFrom-CanonicalTextBytes ([System.IO.File]::ReadAllBytes($lockPath)) 'shared rules lock'
    $lockVersionKey=if($lockTextForSource-match'(?m)^source_version:'){'source_version'}else{'version'}
    $lockCommitKey=if($lockTextForSource-match'(?m)^source_commit:'){'source_commit'}else{'commit'}
    $version = Read-Key $lockTextForSource $lockVersionKey $lockPath
    $sourceCommit = Read-Key $lockTextForSource $lockCommitKey $lockPath
    $sourceTree = if($lockTextForSource-match'(?m)^source_tree:'){Read-Key $lockTextForSource 'source_tree' $lockPath}else{'legacy-unavailable'}
    $syncedAt = if($lockTextForSource-match'(?m)^synced_at:'){Read-Key $lockTextForSource 'synced_at' $lockPath}else{'immutable'}
    $manifestText = ConvertFrom-CanonicalTextBytes $manifestBytes 'generated manifest payload'
}

$sourceName = Read-Key $manifestText 'source_name' 'manifest.yml'
$sourceRepository = Read-Key $manifestText 'source_repository' 'manifest.yml'
$payloadType = Read-Key $manifestText 'payload_type' 'manifest.yml'
if ($payloadType -cne 'text') { throw "Unsupported manifest payload_type: $payloadType" }
$manifestVersion = Read-Key $manifestText 'version' 'manifest.yml'
if ($manifestVersion -cne $version) { throw "VERSION and manifest version differ: $version / $manifestVersion" }
$manifestSchema=Read-Key $manifestText 'schema_version' 'manifest.yml';$governanceV1=$version-match'^1\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
if(($governanceV1-and$manifestSchema-cne'2')-or(-not$governanceV1-and$manifestSchema-cne'1')){throw "Unsupported manifest schema_version for $version`: $manifestSchema"}
$manifestSha = Get-Sha256Bytes $manifestBytes
$entries = Read-Manifest $manifestText $governanceV1
foreach ($entry in $entries) {
    if ($entry.Path -ceq '.gitattributes' -or $entry.Target -ceq '.gitattributes') {
        throw '.gitattributes is a shared repository policy file and must not be distributed in the project snapshot.'
    }
}

if ($sourceAvailable) {
    foreach ($entry in $entries) {
        if (-not $sourceRecords.ContainsKey($entry.Path)) { $sourceRecords[$entry.Path] = Read-CommittedCanonicalText $entry.Path $sourceCommit }
        if ((Get-Sha256Bytes $sourceRecords[$entry.Path].Bytes) -cne $entry.Sha) { throw "Manifest hash mismatch: $($entry.Path)" }
    }
}

$header = "# GENERATED FILE: DO NOT EDIT.`n# source version: $version`n# source commit: $sourceCommit`n# $directEditForbidden`n`n"
$snapshotEntries=@($entries|Where-Object{$_.Mode-ceq'snapshot'})
$managedEntries=@($entries|Where-Object{$_.Mode-ceq'managed'})
$seedEntries=@($entries|Where-Object{$_.Mode-ceq'seed'})
$expectedTargets = @($snapshotEntries.Target) + @('manifest.yml')
$payloadSetSha=Get-Sha256Bytes $utf8NoBom.GetBytes((($snapshotEntries|ForEach-Object{"$($_.Path)|$($_.Sha)"})-join"`n")+"`n")
$canonicalSourcePaths=@('AGENTS.md','core/POLICY.psd1','core/CONSTITUTION.md','core/OUTPUT.md','core/LIFECYCLE.md','core/ARTIFACTS.md','core/EXECUTION.md')
$adoptionPlan=if($governanceV1){Read-ManagedAdoptionPlan $managedEntries}else{$null}
if(-not[string]::IsNullOrWhiteSpace($ManagedAdoptionPlanPath)-and-not$governanceV1){throw 'Managed adoption plan is supported only by governance v1.'}
if($InstallSeeds-and-not$governanceV1){throw 'Explicit seed installation is supported only by governance v1.'}

if ($Check) {
    $lockText = ConvertFrom-CanonicalTextBytes ([System.IO.File]::ReadAllBytes($lockPath)) 'shared rules lock'
    $expectedLock = if($governanceV1){[ordered]@{schema_version='1';source_name=$sourceName;source_repository=$sourceRepository;source_version=$version;source_commit=$sourceCommit;source_tree=$sourceTree;manifest_sha256=$manifestSha;payload_sha256=$payloadSetSha}}else{[ordered]@{schema_version='1';source_name=$sourceName;source_repository=$sourceRepository;version=$version;commit=$sourceCommit;manifest_sha256=$manifestSha;generated_root='docs/ai/generated/shared';synced_at=$syncedAt}}
    foreach ($pair in $expectedLock.GetEnumerator()) {
        if ((Read-Key $lockText $pair.Key $lockPath) -cne $pair.Value) { throw "Shared lock mismatch: $($pair.Key)" }
    }
    if($governanceV1){
        $lockLines=[Collections.Generic.List[string]]::new();foreach($pair in $expectedLock.GetEnumerator()){$lockLines.Add("$($pair.Key): $($pair.Value)")};$lockLines.Add('source_paths:')
        foreach($relative in $canonicalSourcePaths){
            $pathLine="  - path: $relative";$pathIndex=$lockText.IndexOf("$pathLine`n",[StringComparison]::Ordinal);if($pathIndex-lt0){throw "Shared lock canonical source path is missing: $relative"}
            $blobMatch=[regex]::Match($lockText.Substring($pathIndex+$pathLine.Length+1),'\A    blob: (?<blob>[0-9a-f]{40})\n');if(-not$blobMatch.Success){throw "Shared lock canonical source blob is invalid: $relative"}
            if($sourceAvailable-and$blobMatch.Groups['blob'].Value-cne[string]$sourceRecords[$relative].Blob){throw "Shared lock canonical source blob mismatch: $relative"}
            $lockLines.Add($pathLine);$lockLines.Add("    blob: $($blobMatch.Groups['blob'].Value)")
        }
        $expectedLockText=($lockLines-join"`n")+"`n";if($lockText-cne$expectedLockText){throw 'Shared lock schema, order, or canonical source identity is invalid.'}
    }
    $files = @(Get-ChildItem -LiteralPath $generatedRoot -File -Recurse | ForEach-Object { $_.FullName.Substring($generatedRoot.Length + 1).Replace('\','/') })
    foreach ($target in $expectedTargets) { if ($files -cnotcontains $target) { throw "Generated snapshot file missing: $target" } }
    foreach ($file in $files) { if ($expectedTargets -cnotcontains $file) { throw "Unexpected generated snapshot file: $file" } }
    foreach ($entry in $snapshotEntries) {
        $targetPath = Join-Path $generatedRoot $entry.Target
        $targetText = [System.IO.File]::ReadAllText($targetPath)
        if ($targetText -notmatch "\A# GENERATED FILE: DO NOT EDIT\.`r?`n# source version: $([regex]::Escape($version))`r?`n# source commit: $sourceCommit`r?`n# $([regex]::Escape($directEditForbidden))") { throw "Generated marker mismatch: $($entry.Target)" }
        $payloadBytes = $utf8NoBom.GetBytes((Get-Payload $targetText))
        $payloadHash = Get-Sha256Bytes $payloadBytes
        if ($payloadHash -cne $entry.Sha) { throw "Generated snapshot was modified: $($entry.Target)" }
        [void](ConvertFrom-CanonicalTextBytes $payloadBytes "generated payload $($entry.Target)")
    }
    $snapshotManifestPayload = Get-Payload ([System.IO.File]::ReadAllText($snapshotManifestPath))
    if ((Get-Sha256Bytes $utf8NoBom.GetBytes($snapshotManifestPayload)) -cne $manifestSha) { throw 'Generated manifest mismatch.' }
    Write-Output "Shared snapshot is current. version=$version commit=$sourceCommit source_available=$sourceAvailable"
    return
}

if ($sourceAvailable) {
    $finalSourceCommit = Assert-SourceRepository
    if ($finalSourceCommit -cne $sourceCommit) { throw 'Shared source HEAD changed during synchronization.' }
    foreach ($relative in @($sourceRecords.Keys)) {
        $currentRecord = Read-CommittedCanonicalText $relative $sourceCommit
        if ($currentRecord.Blob -cne $sourceRecords[$relative].Blob -or (Get-Sha256Bytes $currentRecord.Bytes) -cne (Get-Sha256Bytes $sourceRecords[$relative].Bytes)) { throw "Shared source bytes changed during synchronization: $relative" }
    }
}

$lock = if($governanceV1){
    $lines=[Collections.Generic.List[string]]::new();foreach($line in @('schema_version: 1',"source_name: $sourceName","source_repository: $sourceRepository","source_version: $version","source_commit: $sourceCommit","source_tree: $sourceTree","manifest_sha256: $manifestSha","payload_sha256: $payloadSetSha",'source_paths:')){$lines.Add($line)}
    foreach($relative in $canonicalSourcePaths){if(-not$sourceRecords.ContainsKey($relative)){throw "canonical source identity path is absent from manifest: $relative"};$lines.Add("  - path: $relative");$lines.Add("    blob: $($sourceRecords[$relative].Blob)")}
    ($lines-join"`n")+"`n"
}else{"schema_version: 1`nsource_name: $sourceName`nsource_repository: $sourceRepository`nversion: $version`ncommit: $sourceCommit`nmanifest_sha256: $manifestSha`ngenerated_root: docs/ai/generated/shared`nsynced_at: $syncedAt`n"}
$writes=[Collections.Generic.List[object]]::new()
foreach($entry in $snapshotEntries){$targetPath=Join-Path $generatedRoot $entry.Target;$payload=$header+$sourceRecords[$entry.Path].Text;$withBom=[IO.Path]::GetExtension($targetPath)-ieq'.ps1';$writes.Add([pscustomobject]@{Path=$targetPath;Bytes=(ConvertTo-OutputTextBytes $payload $withBom);Kind='snapshot'})}
$writes.Add([pscustomobject]@{Path=$snapshotManifestPath;Bytes=$utf8NoBom.GetBytes($header+$manifestText);Kind='snapshot_manifest'})
if($null-ne$adoptionPlan){foreach($entry in $managedEntries){$writes.Add([pscustomobject]@{Path=(Resolve-ProjectTarget $entry.Target);Bytes=$utf8NoBom.GetBytes((Get-InstalledPayload $sourceRecords[$entry.Path].Text));Kind='managed'})}}
if($InstallSeeds){foreach($entry in $seedEntries){$targetPath=Resolve-ProjectTarget $entry.Target;if(-not(Test-Path -LiteralPath $targetPath)){$writes.Add([pscustomobject]@{Path=$targetPath;Bytes=$utf8NoBom.GetBytes((Get-InstalledPayload $sourceRecords[$entry.Path].Text));Kind='seed'})}}}
$writes.Add([pscustomobject]@{Path=$lockPath;Bytes=$utf8NoBom.GetBytes($lock);Kind='lock'})
$unexpected=@();if(Test-Path -LiteralPath $generatedRoot -PathType Container){$unexpected=@(Get-ChildItem -LiteralPath $generatedRoot -File -Recurse|Where-Object{$expectedTargets-cnotcontains$_.FullName.Substring($generatedRoot.Length+1).Replace('\','/')})}
$transactionSnapshot=Get-ProjectTransactionSnapshot
try{
    foreach($write in $writes){
        [IO.Directory]::CreateDirectory((Split-Path -Parent $write.Path))|Out-Null;[IO.File]::WriteAllBytes($write.Path,$write.Bytes)
    }
    foreach($file in $unexpected){Remove-Item -LiteralPath $file.FullName -Force}
    $syncScript=[IO.Path]::GetFullPath($PSCommandPath);$nextScript=Join-Path $generatedRoot 'tools/generate-next-action.ps1';$progressScript=Join-Path $generatedRoot 'tools/generate-progress.ps1';$validatorScript=Join-Path $generatedRoot 'tools/validate-project.ps1'
    Invoke-PostWriteGate 'snapshot-lock-check-before-generators' $syncScript @('-ProjectRoot',$project,'-SharedRoot',$resolvedShared,'-Check')
    Invoke-PostWriteGate 'generate-next-action' $nextScript @('-ProjectRoot',$project)
    Invoke-PostWriteGate 'generate-progress' $progressScript @('-ProjectRoot',$project)
    $postGeneratorSnapshot=Get-ProjectTransactionSnapshot
    Invoke-PostWriteGate 'generate-next-action-check' $nextScript @('-ProjectRoot',$project,'-Check')
    Invoke-PostWriteGate 'generate-progress-check' $progressScript @('-ProjectRoot',$project,'-Check')
    Invoke-PostWriteGate 'complete-project-validator-with-overlay' $validatorScript @('-ProjectRoot',$project)
    Invoke-PostWriteGate 'snapshot-lock-semantic-round-trip' $syncScript @('-ProjectRoot',$project,'-SharedRoot',$resolvedShared,'-Check')
    $postGateSnapshot=Get-ProjectTransactionSnapshot;if(-not(Test-ProjectTransactionSnapshot $postGeneratorSnapshot $postGateSnapshot)){throw 'Post-write gates modified project bytes or directory state during semantic round-trip validation.'}
}catch{
    $original=$_.Exception;try{Restore-ProjectTransactionSnapshot $transactionSnapshot}catch{throw "Original post-write transaction failure: $($original.Message)`nRollback failure: $($_.Exception.Message)"};throw $original
}
Write-Output "Synchronized shared governance. version=$version commit=$sourceCommit snapshot=$($snapshotEntries.Count) managed=$(@($writes|Where-Object{$_.Kind-ceq'managed'}).Count) seeded=$(@($writes|Where-Object{$_.Kind-ceq'seed'}).Count)"
