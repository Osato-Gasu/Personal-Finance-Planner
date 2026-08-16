import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, parse, relative, resolve, sep } from "node:path";

export const PUBLIC_AUDIT_SCHEMA_VERSION = 1;
export const PUBLIC_AUDIT_REQUIRED_SCANS = Object.freeze([
  "reachable_commits",
  "commit_objects",
  "reachable_trees",
  "reachable_blobs",
  "tree_entries",
  "historical_path_associations",
  "refs",
  "tags",
  "lfs_pointers",
  "submodules",
  "working_tree",
  "staged_bytes",
  "actions_run_logs",
  "actions_artifacts",
  "release_staging",
]);
export const PUBLIC_AUDIT_SCAN_METHOD =
  "git-rev-list-all+cat-file-commit+ls-tree-rz-v1";
export const PUBLIC_AUDIT_REQUIRED_PROVENANCE_HASHES = Object.freeze([
  "ref_set_sha256",
  "reachable_commit_set_sha256",
  "reachable_tree_set_sha256",
  "reachable_blob_set_sha256",
  "commit_path_blob_associations_sha256",
  "actions_run_set_sha256",
  "actions_job_set_sha256",
  "actions_artifact_set_sha256",
]);
export const PUBLIC_AUDIT_REQUIRED_ACTION_COUNTS = Object.freeze([
  "actions_run_inventory_count",
  "actions_job_inventory_count",
  "actions_required_job_log_count",
  "actions_job_log_retrieval_count",
  "actions_job_log_scan_count",
  "actions_artifact_inventory_count",
  "actions_artifact_retrieval_count",
  "actions_artifact_scan_count",
]);
export const PUBLIC_AUDIT_CATEGORIES = Object.freeze([
  "high_confidence_credential",
  "github_oauth_cloud_token",
  "private_key",
  "password_secret_assignment",
  "database_connection_credential",
  "live_session_cookie_secret",
  "pii",
  "bank_card_account_identity",
  "private_financial_export",
  "unintended_user_owned_file",
]);

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function isFixturePath(path) {
  return /(?:^|[\\/])(?:test|tests|fixtures?)(?:[\\/]|$)/iu.test(path);
}

function isAuditPolicyPath(path) {
  return /(?:^|[\\/])tools[\\/]public-exposure-audit(?:-lib)?\.mjs$/iu.test(
    path,
  );
}

function looksPlaceholder(value) {
  return /(?:example\.invalid|example\.com|placeholder|dummy|redacted|replace[_ -]?me|your[_ -]?(?:token|secret|password)|x{6,}|\*{6,}|<[^>]+>|\{\{[^}]+\}\})/iu.test(
    value,
  );
}

function fingerprint(value) {
  return `sha256:${sha256(Buffer.from(value, "utf8")).slice(0, 16)}`;
}

function luhn(value) {
  const digits = value.replace(/[^0-9]/gu, "");
  if (digits.length < 13 || digits.length > 19) return false;
  if (!/^(?:4|5[1-5]|3[47]|6(?:011|5))/u.test(digits)) return false;
  let sum = 0;
  let alternate = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function scanPublicBytes({
  bytes,
  path,
  evidencePath = path,
  commit = null,
  blob = null,
}) {
  const text = Buffer.from(bytes).toString("utf8");
  const matches = [];
  const add = (category, value) => {
    if (looksPlaceholder(value)) return;
    matches.push({
      path: evidencePath,
      commit,
      blob,
      category,
      count: 1,
      redacted_fingerprint: fingerprint(value),
    });
  };
  const patterns = [
    ["private_key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/gu],
    [
      "github_oauth_cloud_token",
      /\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35})\b/gu,
    ],
    [
      "database_connection_credential",
      /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s@/]{8,}@[^\s/]+/giu,
    ],
    [
      "live_session_cookie_secret",
      /\b(?:session|cookie)[_-]?(?:secret|token)\s*[:=]\s*["']?([A-Za-z0-9+/_=-]{24,})/giu,
    ],
    [
      "password_secret_assignment",
      /\b(?:password|passwd|client_secret|api_secret)\s*[:=]\s*["']?([^\s"']{12,})/giu,
    ],
  ];
  for (const [category, pattern] of patterns) {
    for (const match of text.matchAll(pattern))
      add(category, match[1] ?? match[0]);
  }
  for (const match of text.matchAll(
    /(?:card|credit|クレジット|カード)[^\n\r\d]{0,24}((?:\d[ -]?){13,19})(?!\d)/giu,
  )) {
    if (luhn(match[1])) add("bank_card_account_identity", match[1]);
  }
  if (
    /(?:^|[\\/])(?:\.env|id_(?:rsa|ed25519)|credentials?\.json|cookies?\.txt|bank[-_ ]?export|financial[-_ ]?export)(?:$|[.\\/])/iu.test(
      path,
    ) &&
    !isFixturePath(path) &&
    !isAuditPolicyPath(path)
  )
    add("unintended_user_owned_file", path);
  if (
    /(?:account_number|routing_number|card_number|口座番号|支店番号)/iu.test(
      text,
    ) &&
    /(?:transactions?|balances?|取引|残高)/iu.test(text) &&
    !isFixturePath(path) &&
    !isAuditPolicyPath(path)
  )
    add("private_financial_export", `${path}:financial-export-shape`);
  if (
    /(?:マイナンバー|個人番号)\D{0,8}\d{12}/u.test(text) &&
    !isFixturePath(path)
  )
    add("pii", `${path}:my-number`);
  return matches;
}

export function buildPublicAuditReport(input) {
  const findings = [...input.findings].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
  const findingsByCategory = Object.fromEntries(
    PUBLIC_AUDIT_CATEGORIES.map((category) => [
      category,
      findings.filter((finding) => finding.category === category).length,
    ]),
  );
  return {
    schema_version: PUBLIC_AUDIT_SCHEMA_VERSION,
    repository: input.repository,
    target_commit: input.targetCommit,
    repository_visibility: input.repositoryVisibility,
    phase: input.phase,
    result: findings.length === 0 ? "PASS" : "FAIL",
    fixture_policy: {
      explicit_fixture_paths_only: true,
      live_looking_values_never_ignored: true,
    },
    provenance: input.provenance,
    scans: Object.fromEntries(
      PUBLIC_AUDIT_REQUIRED_SCANS.map((name) => [name, input.scans[name] ?? 0]),
    ),
    findings_count: findings.length,
    findings_by_category: findingsByCategory,
    findings,
    started_at: input.startedAt,
    completed_at: input.completedAt,
  };
}

export function serializePublicAuditReport(report) {
  return Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function validatePublicExposureAudit(
  report,
  { repository, targetCommit, phase, reportBytes, expectedSha256 },
) {
  const errors = [];
  if (report?.schema_version !== PUBLIC_AUDIT_SCHEMA_VERSION)
    errors.push("public audit schema mismatch");
  if (report?.repository !== repository)
    errors.push("public audit repository mismatch");
  if (report?.target_commit !== targetCommit)
    errors.push("public audit target commit mismatch");
  if (report?.repository_visibility !== "public")
    errors.push("public audit did not verify public repository visibility");
  if (report?.phase !== phase) errors.push("public audit phase mismatch");
  if (phase !== "candidate_ci" && phase !== "release_preflight")
    errors.push("public audit phase is unsupported");
  if (report?.result !== "PASS" || report?.findings_count !== 0)
    errors.push("public audit has findings or did not pass");
  if (!Array.isArray(report?.findings))
    errors.push("public audit findings are missing");
  else if (report.findings.length !== report.findings_count)
    errors.push("public audit finding count mismatch");
  for (const category of PUBLIC_AUDIT_CATEGORIES) {
    if (
      !Number.isSafeInteger(report?.findings_by_category?.[category]) ||
      report.findings_by_category[category] < 0
    )
      errors.push(`public audit category is missing: ${category}`);
    else if (
      Array.isArray(report?.findings) &&
      report.findings_by_category[category] !==
        report.findings.filter((finding) => finding?.category === category)
          .length
    )
      errors.push(`public audit category count mismatch: ${category}`);
  }
  for (const scan of PUBLIC_AUDIT_REQUIRED_SCANS) {
    if (!Number.isSafeInteger(report?.scans?.[scan]) || report.scans[scan] < 0)
      errors.push(`public audit scan is incomplete: ${scan}`);
  }
  for (const scan of [
    "reachable_commits",
    "commit_objects",
    "reachable_trees",
    "reachable_blobs",
    "tree_entries",
    "historical_path_associations",
    "refs",
    "working_tree",
    "staged_bytes",
  ]) {
    if (!Number.isSafeInteger(report?.scans?.[scan]) || report.scans[scan] <= 0)
      errors.push(`public audit scan has impossible zero count: ${scan}`);
  }
  if (report?.scans?.commit_objects !== report?.scans?.reachable_commits)
    errors.push("public audit commit object scan count mismatch");
  if (
    report?.scans?.historical_path_associations !== report?.scans?.tree_entries
  )
    errors.push("public audit historical path association count mismatch");
  if (phase === "release_preflight" && report?.scans?.release_staging !== 5)
    errors.push(
      "public audit release staging scan must contain exactly 5 files",
    );
  if (phase === "candidate_ci" && report?.scans?.release_staging !== 0)
    errors.push("public audit candidate scan must not claim release staging");
  if (report?.provenance?.target_commit !== targetCommit)
    errors.push("public audit provenance target mismatch");
  if (report?.provenance?.scan_method !== PUBLIC_AUDIT_SCAN_METHOD)
    errors.push("public audit provenance scan method mismatch");
  for (const name of PUBLIC_AUDIT_REQUIRED_PROVENANCE_HASHES) {
    const hash = report?.provenance?.[name] ?? "";
    if (!/^[0-9A-F]{64}$/u.test(hash) || /^0{64}$/u.test(hash))
      errors.push(`public audit provenance is missing: ${name}`);
  }
  for (const name of PUBLIC_AUDIT_REQUIRED_ACTION_COUNTS) {
    const count = report?.provenance?.[name];
    if (!Number.isSafeInteger(count) || count < 0)
      errors.push(`public audit Actions provenance count is missing: ${name}`);
  }
  if (
    report?.provenance?.actions_job_inventory_count <
    report?.provenance?.actions_required_job_log_count
  )
    errors.push("public audit Actions job inventory count mismatch");
  if (
    report?.provenance?.actions_required_job_log_count !==
      report?.provenance?.actions_job_log_retrieval_count ||
    report?.provenance?.actions_job_log_retrieval_count !==
      report?.provenance?.actions_job_log_scan_count ||
    report?.provenance?.actions_job_log_scan_count !==
      report?.scans?.actions_run_logs
  )
    errors.push("public audit Actions job log completeness mismatch");
  if (
    report?.provenance?.actions_artifact_inventory_count !==
      report?.provenance?.actions_artifact_retrieval_count ||
    report?.provenance?.actions_artifact_retrieval_count !==
      report?.provenance?.actions_artifact_scan_count ||
    report?.provenance?.actions_artifact_scan_count !==
      report?.scans?.actions_artifacts
  )
    errors.push("public audit Actions artifact completeness mismatch");
  if (report?.provenance?.repository_scan_complete !== true)
    errors.push("public audit repository scan is incomplete");
  if (report?.provenance?.actions_scan_complete !== true)
    errors.push("public audit Actions scan is incomplete");
  if (
    report?.fixture_policy?.explicit_fixture_paths_only !== true ||
    report?.fixture_policy?.live_looking_values_never_ignored !== true
  )
    errors.push("public audit fixture policy mismatch");
  if (!Buffer.isBuffer(reportBytes))
    errors.push("public audit raw bytes missing");
  else {
    if (reportBytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])))
      errors.push("public audit must not contain a UTF-8 BOM");
    const raw = reportBytes.toString("utf8");
    if (raw.includes("\r") || !raw.endsWith("\n") || raw.endsWith("\n\n"))
      errors.push("public audit must use LF with exactly one trailing LF");
    if (expectedSha256 !== sha256(reportBytes))
      errors.push("public audit report SHA-256 mismatch");
  }
  return { ok: errors.length === 0, errors, side_effects: 0 };
}

export async function readAuditProof({ path, expectedSha256, ...identity }) {
  if (!isAbsolute(path)) throw new Error("public audit path must be absolute");
  const resolved = resolve(path);
  await assertNoLinkedPath(resolved);
  const stat = await lstat(resolved);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error("public audit path must be a regular non-link file");
  const bytes = await readFile(resolved);
  const report = JSON.parse(bytes.toString("utf8"));
  return {
    report,
    bytes,
    validation: validatePublicExposureAudit(report, {
      ...identity,
      reportBytes: bytes,
      expectedSha256,
    }),
  };
}

export function isPathInside(parent, candidate) {
  const value = relative(resolve(parent), resolve(candidate));
  return value !== "" && value !== ".." && !value.startsWith(`..${sep}`);
}

export async function assertNoLinkedPath(path) {
  const resolved = resolve(path);
  const root = parse(resolved).root;
  let current = root;
  for (const part of resolved
    .slice(root.length)
    .split(/[\\/]/u)
    .filter(Boolean)) {
    current = resolve(current, part);
    const stat = await lstat(current);
    if (stat.isSymbolicLink())
      throw new Error("public audit path must not traverse a link");
  }
}
