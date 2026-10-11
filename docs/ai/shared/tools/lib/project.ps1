# Project front matter (docs/ai/PROJECT.md). Core. Flat "key: value" lines; a value is plain text or one-line JSON
# (lists and objects), so the same file is readable by these tools, by people and by any YAML reader.
Set-StrictMode -Version Latest

function Read-ProjectFront {
    # The front matter of docs/ai/PROJECT.md as an ordered map of raw strings; empty when the file or the block is absent.
    param([Parameter(Mandatory)][string]$Root)
    $p = Join-Path $Root 'docs/ai/PROJECT.md'
    if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { return [ordered]@{} }
    $t = Read-TextLf $p
    if ($t -notmatch '(?s)\A---\n(.*?)\n---') { return [ordered]@{} }
    return (ConvertFrom-KeyValueLines $Matches[1])
}

function Get-ProjectValue {
    # One front matter value: parsed from JSON when it is JSON, else the raw text. A missing or empty value gives $Default.
    param($Front, [string]$Key, $Default = $null)
    if ($null -eq $Front -or -not $Front.Contains($Key)) { return $Default }
    $raw = [string]$Front[$Key]
    if ($raw.Trim() -eq '') { return $Default }
    try { return (ConvertFrom-Json -InputObject $raw -NoEnumerate -ErrorAction Stop) } catch { return $raw }
}

function Get-ProjectStringList {
    param($Front, [string]$Key)
    return @(ConvertTo-StringArray (Get-ProjectValue -Front $Front -Key $Key -Default @()))
}
