import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DISTRIBUTION_APPROVAL_PATHS = Object.freeze({
  relayBundle: "docs/ai/reports/TASK-009/RELAY_BUNDLE.json",
  task: "docs/ai/tasks/TASK-009.md",
  releaseHandoff: "docs/ai/handoffs/TASK-009/RELEASE_HANDOFF.md",
});

const FULL_SHA = /^[0-9a-f]{40}$/u;

function parseTaskFrontmatter(text) {
  if (typeof text !== "string") return null;
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/u)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

function parseReleaseHandoff(text) {
  if (typeof text !== "string") return null;
  const fields = {};
  for (const line of text.split(/\r?\n/u)) {
    const key = line.match(/^-\s+([a-z][a-z0-9_]*):\s*(.*?)\s*$/u);
    if (key) fields[key[1]] = key[2];
  }
  return fields;
}

function parsedBundle(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" ? value : null;
}

function requireExact(errors, actual, expected, message) {
  if (actual !== expected) errors.push(message);
}

function requireSha(errors, value, label) {
  if (typeof value !== "string" || !FULL_SHA.test(value))
    errors.push(`${label} must be a lowercase full 40-hex SHA`);
}

/**
 * Validate the approval proof stored in the target commit's repository tree.
 * The function is deliberately pure: it reads no files and performs no writes.
 */
export function evaluateCanonicalApproval(input = {}) {
  const errors = [];
  const targetSha = input.targetSha ?? input.targetCommit ?? input.sourceCommit;
  const bundle = parsedBundle(input.relayBundle ?? input.bundle);
  const task =
    input.taskFrontmatter ?? parseTaskFrontmatter(input.taskText ?? input.task);
  const handoff =
    input.releaseHandoff ??
    parseReleaseHandoff(input.releaseHandoffText ?? input.handoffText);

  if (typeof targetSha !== "string" || !FULL_SHA.test(targetSha))
    errors.push("target SHA must be a lowercase full 40-hex SHA");
  if (input.sourceCommit !== undefined && input.sourceCommit !== targetSha)
    errors.push("canonical approval source commit must equal target SHA");
  if (input.readErrors?.length)
    for (const error of input.readErrors) errors.push(String(error));

  if (!bundle) {
    errors.push("canonical APPROVED relay bundle is missing or invalid JSON");
  } else {
    requireExact(
      errors,
      bundle.task_id,
      "TASK-009",
      "relay task identity mismatch",
    );
    requireExact(
      errors,
      bundle.decision,
      "APPROVED",
      "relay decision is not APPROVED",
    );
    requireExact(
      errors,
      bundle.review_stage,
      "implementation",
      "relay review stage is not implementation",
    );
    requireExact(
      errors,
      bundle.next_phase,
      "release",
      "relay next phase is not release",
    );
    requireExact(
      errors,
      bundle.next_actor,
      "Codex",
      "relay next actor is not Codex",
    );
    requireExact(
      errors,
      bundle.next_role,
      "IMPLEMENTER",
      "relay next role is not IMPLEMENTER",
    );
    requireSha(errors, bundle.reviewed_candidate, "relay reviewed_candidate");
    requireSha(
      errors,
      bundle.reviewed_handoff_head,
      "relay reviewed_handoff_head",
    );
    requireExact(
      errors,
      bundle.route_result?.resolved_commit,
      bundle.reviewed_handoff_head,
      "relay resolved commit does not equal reviewed handoff head",
    );
    if (bundle.route_result?.requested_ref !== undefined)
      requireExact(
        errors,
        bundle.route_result.requested_ref,
        `refs/heads/${bundle.branch}`,
        "relay requested ref does not match branch",
      );
  }

  if (!task) {
    errors.push("TASK-009 release state is missing or malformed");
  } else {
    requireExact(
      errors,
      task.task_id,
      "TASK-009",
      "TASK release state task identity mismatch",
    );
    requireExact(
      errors,
      task.status,
      "approved",
      "TASK-009 state is not approved",
    );
    requireExact(
      errors,
      task.current_phase,
      "release",
      "TASK-009 phase is not release",
    );
    requireExact(
      errors,
      task.current_role_id,
      "IMPLEMENTER",
      "TASK-009 role is not IMPLEMENTER",
    );
    requireExact(
      errors,
      task.next_actor,
      "Codex",
      "TASK-009 next actor is not Codex",
    );
    requireExact(
      errors,
      task.next_role,
      "IMPLEMENTER",
      "TASK-009 next role is not IMPLEMENTER",
    );
    requireExact(
      errors,
      task.handoff_file,
      DISTRIBUTION_APPROVAL_PATHS.releaseHandoff,
      "TASK-009 handoff file is not RELEASE_HANDOFF.md",
    );
    if (bundle)
      for (const field of ["implementation_candidate", "reviewed_candidate"])
        requireExact(
          errors,
          task[field],
          bundle.reviewed_candidate,
          `TASK-009 ${field} does not match approved candidate`,
        );
  }

  if (!handoff) {
    errors.push("canonical RELEASE_HANDOFF.md is missing or malformed");
  } else {
    requireExact(
      errors,
      handoff.task_id,
      "TASK-009",
      "release handoff task identity mismatch",
    );
    requireExact(
      errors,
      handoff.decision,
      "APPROVED",
      "release handoff decision is not APPROVED",
    );
    requireExact(
      errors,
      handoff.next_phase,
      "release",
      "release handoff phase is not release",
    );
    requireExact(
      errors,
      handoff.next_actor,
      "Codex",
      "release handoff next actor is not Codex",
    );
    requireExact(
      errors,
      handoff.next_role,
      "IMPLEMENTER",
      "release handoff next role is not IMPLEMENTER",
    );
    requireExact(
      errors,
      handoff.relay_schema,
      "2",
      "release handoff relay schema is not 2",
    );
    if (bundle) {
      requireExact(
        errors,
        handoff.reviewed_candidate,
        bundle.reviewed_candidate,
        "release handoff candidate does not match approved candidate",
      );
      requireExact(
        errors,
        handoff.candidate_commit,
        bundle.reviewed_candidate,
        "release handoff candidate_commit does not match approved candidate",
      );
      requireExact(
        errors,
        handoff.reviewed_handoff_head,
        bundle.reviewed_handoff_head,
        "release handoff head does not match approved handoff",
      );
      requireExact(
        errors,
        handoff.resolved_commit,
        bundle.reviewed_handoff_head,
        "release handoff resolved commit does not match approved handoff",
      );
    }
  }

  if (bundle && typeof targetSha === "string" && FULL_SHA.test(targetSha)) {
    // A proof is bound to the target by the immutable git-tree read performed
    // by readCanonicalApprovalAtCommit. If a caller supplies bytes directly,
    // sourceCommit is mandatory so a SHA equality argument cannot be forged.
    if (input.sourceCommit === undefined)
      errors.push("canonical approval source commit is required");
    if (bundle.route_result?.requested_ref && bundle.branch) {
      requireExact(
        errors,
        bundle.route_result.requested_ref,
        `refs/heads/${bundle.branch}`,
        "canonical approval branch identity mismatch",
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    source_commit: input.sourceCommit ?? null,
    reviewed_candidate: bundle?.reviewed_candidate ?? null,
    reviewed_handoff_head: bundle?.reviewed_handoff_head ?? null,
    decision: bundle?.decision ?? null,
    phase: task?.current_phase ?? null,
  };
}

export const validateCanonicalApproval = evaluateCanonicalApproval;

async function readGitBlob(cwd, targetSha, path) {
  try {
    const result = await execFileAsync(
      "git",
      ["show", `${targetSha}:${path}`],
      { cwd, encoding: "utf8", windowsHide: true },
    );
    return { text: result.stdout };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      text: null,
      error: `${path} cannot be read at target SHA: ${message}`,
    };
  }
}

/** Read the canonical proof files from the immutable target commit tree. */
export async function readCanonicalApprovalAtCommit({
  cwd = process.cwd(),
  targetSha,
}) {
  const entries = await Promise.all(
    Object.entries(DISTRIBUTION_APPROVAL_PATHS).map(async ([key, path]) => [
      key,
      await readGitBlob(cwd, targetSha, path),
    ]),
  );
  const result = { sourceCommit: targetSha, readErrors: [] };
  for (const [key, value] of entries) {
    result[
      key === "relayBundle"
        ? "relayBundle"
        : key === "task"
          ? "taskText"
          : "releaseHandoffText"
    ] = value.text;
    if (value.error) result.readErrors.push(value.error);
  }
  return result;
}
