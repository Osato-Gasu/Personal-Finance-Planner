# Policy and the optional repository registry (core). Pure functions over data.
# The tier classification, the authority checks and the autonomous-writes kill switch belong to the gate tools (tools/gate/lib/policy-gate.ps1).
Set-StrictMode -Version Latest

# Used when a Project is checked without its pinned Shared policy, so the secret scan never silently turns off.
$script:DefaultSecretPatterns = @('gh[pousr]_[A-Za-z0-9]{36,}', 'github_pat_[A-Za-z0-9_]{50,}', '-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----', 'sk-ant-[A-Za-z0-9_\-]{20,}', 'AKIA[0-9A-Z]{16}', 'xox[baprs]-[A-Za-z0-9\-]{10,}')

function Read-Policy { param([string]$Root) return Read-JsonFile -Path (Join-Path $Root 'policy.json') }

function New-EmptyAuthority {
    # The fail-closed registry: nobody is authorised. Used when no registry exists (missing file = no authority, not an error).
    return [pscustomobject]@{ schema = 1; actors = [pscustomobject]@{ claude = @(); gpt = @(); user = @() }; extra = $null }
}

function Read-Authority {
    param([string]$Root)
    $p = Join-Path $Root 'docs/ai/AUTHORITY.json'
    if (-not (Test-Path -LiteralPath $p)) { return New-EmptyAuthority }
    return Read-JsonFile -Path $p
}

function Get-EffectivePolicy {
    # Shared policy plus the repository's own additions. A repository may only be stricter (union / min).
    param($Policy, $Authority)
    $extra = Get-Prop $Authority 'extra'
    $union = { param($k) @((ConvertTo-StringArray (Get-Prop $Policy $k @())) + (ConvertTo-StringArray (Get-Prop $extra $k @()))) | Select-Object -Unique }
    $limits = Get-Prop $Policy 't0_limits'
    $xl = Get-Prop $extra 't0_limits'
    return [pscustomobject]@{
        Kinds = Get-Prop $Policy 'kinds'
        T2Paths = @(& $union 't2_paths')
        T1Paths = @(& $union 't1_paths')
        T0Paths = @(& $union 't0_paths')      # the ONLY places a change may merge without a decision; a Project adds its product dirs here (registry change = role `user`)
        T0Deny = @(& $union 't0_deny')        # never autonomous, even inside a T0 path (build, dependency, script, config categories)
        FrozenPaths = @(& $union 'frozen_paths')
        FrozenTaskMax = [int](Get-Prop $Policy 'frozen_task_max' 0)
        TaskIdMin = [int](Get-Prop $Policy 'task_id_min' 0)
        CiRequired = @((ConvertTo-StringArray (Get-Prop (Get-Prop $Policy 'ci') 'required' @())) + (ConvertTo-StringArray (Get-Prop $extra 'ci_required' @())) | Select-Object -Unique)
        CiApp = [string](Get-Prop (Get-Prop $Policy 'ci') 'app_slug' 'github-actions')
        MaxFiles = [Math]::Min([int](Get-Prop $limits 'max_files' 40), [int](Get-Prop $xl 'max_files' 2147483647))
        MaxLines = [Math]::Min([int](Get-Prop $limits 'max_lines' 600), [int](Get-Prop $xl 'max_lines' 2147483647))
        Decisions = Get-Prop $Policy 'decisions'
        BaseBranch = [string](Get-Prop $Policy 'base_branch' 'main')
        GateContext = [string](Get-Prop $Policy 'gate_context' 'shared/gate')
        SecretPatterns = @(if (@(ConvertTo-StringArray (Get-Prop $Policy 'secret_patterns' @())).Count -gt 0) { ConvertTo-StringArray (Get-Prop $Policy 'secret_patterns' @()) } else { $script:DefaultSecretPatterns })
    }
}
