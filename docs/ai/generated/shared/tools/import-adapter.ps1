# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.25
# source commit: f07571d3e8745b9a49a28b1ac77e211c210146a3
# 直接編集禁止

function Import-AdapterText {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$Text)

    if($Text.Length -gt 0 -and $Text[0] -eq [char]0xFEFF){
        $Text = $Text.Substring(1)
        if($Text.Length -gt 0 -and $Text[0] -eq [char]0xFEFF){
            throw 'Adapter source has multiple leading UTF-8 BOM markers'
        }
    }

    $temporary=Join-Path ([IO.Path]::GetTempPath()) ("shared-adapter-"+[guid]::NewGuid().ToString('N')+'.psd1')
    try {
        [IO.File]::WriteAllText($temporary,$Text,[Text.UTF8Encoding]::new($true))
        Import-PowerShellDataFile -LiteralPath $temporary -ErrorAction Stop
    } finally {
        if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Force}
    }
}

function Import-AdapterFile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [ValidateSet('absent','present')][string]$ExpectedBom='absent'
    )

    $bytes=[IO.File]::ReadAllBytes($Path)
    $hasBom=$bytes.Length-ge3-and$bytes[0]-eq0xEF-and$bytes[1]-eq0xBB-and$bytes[2]-eq0xBF
    $hasMultipleBom = $hasBom -and $bytes.Length-ge6-and$bytes[3]-eq0xEF-and$bytes[4]-eq0xBB-and$bytes[5]-eq0xBF
    if($hasMultipleBom){ throw 'Adapter source has multiple leading UTF-8 BOM markers' }
    if($ExpectedBom-ceq'absent'-and$hasBom){throw "Adapter source must be UTF-8 without BOM: $Path"}
    if($ExpectedBom-ceq'present'-and-not$hasBom){throw "Generated project adapter must be UTF-8 with BOM: $Path"}
    $offset=if($hasBom){3}else{0}
    $decoder=[Text.UTF8Encoding]::new($false,$true)
    $text=$decoder.GetString($bytes,$offset,$bytes.Length-$offset)
    Import-AdapterText -Text $text
}
