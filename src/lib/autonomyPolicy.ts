import type { PermissionRequest } from "@opencode-ai/sdk/v2/client";
import type {
  AutonomyMode,
  PermissionDecision,
  PermissionDecisionRecord,
  PermissionDecisionScope,
  RiskAction,
  SafetyPolicy,
} from "@/types/autonomy";

const RISKY_PROMPT_RULES: Array<{ action: RiskAction; pattern: RegExp }> = [
  { action: "mass_edit", pattern: /\b(batch|mass|bulk|all scripts|all files|all assets)\b/iu },
  { action: "delete", pattern: /\b(delete|remove|destroy|wipe|purge)\b/iu },
  { action: "publish_deploy", pattern: /\b(publish|deploy|release|ship live)\b/iu },
  { action: "ownership_license", pattern: /\b(license|ownership|attribution|copyright)\b/iu },
  { action: "security_critical", pattern: /\b(remoteevent|backdoor|exploit|security)\b/iu },
];

const RISKY_PERMISSION_PATTERN =
  /\b(rm\s+-rf|del\s+\/f|publish|deploy|ownership|license|chmod|sudo|powershell)\b/iu;
const OWNERSHIP_PERMISSION_PATTERN = /\b(ownership|license|attribution|copyright)\b/iu;

function matchesPattern(input: string, pattern: string): boolean {
  if (pattern === "*" || pattern.trim() === "") return true;
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`^${escaped}$`, "iu").test(input);
}

export function detectRiskActions(prompt: string): RiskAction[] {
  const text = prompt.toLowerCase();
  const found = new Set<RiskAction>();
  for (const rule of RISKY_PROMPT_RULES) {
    if (rule.pattern.test(text)) found.add(rule.action);
  }
  return [...found];
}

export function isRiskyPermissionRequest(request: PermissionRequest): boolean {
  if (RISKY_PERMISSION_PATTERN.test(request.permission)) return true;
  return request.patterns.some((pattern) => RISKY_PERMISSION_PATTERN.test(pattern));
}

export function isOwnershipPermissionRequest(request: PermissionRequest): boolean {
  if (OWNERSHIP_PERMISSION_PATTERN.test(request.permission)) return true;
  return request.patterns.some((pattern) => OWNERSHIP_PERMISSION_PATTERN.test(pattern));
}

export function normalizePermissionPattern(patterns: string[]): string {
  if (patterns.length === 0) return "*";
  return patterns.join(" || ").slice(0, 1_024);
}

export function resolvePermissionDecision(
  matrix: PermissionDecisionRecord[],
  request: PermissionRequest,
  context: { sessionID: string; workspaceScopeKey: string },
): PermissionDecisionRecord | null {
  const signature = normalizePermissionPattern(request.patterns);
  const matches = matrix.filter((entry) => {
    if (entry.permission !== request.permission) return false;
    if (!matchesPattern(signature, entry.pattern)) return false;
    if (entry.scope === "session") return entry.sessionID === context.sessionID;
    if (entry.scope === "workplace") return entry.scopeKey === context.workspaceScopeKey;
    return true;
  });
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.createdAt - a.createdAt);
  return matches[0] ?? null;
}

export function toPermissionReply(decision: PermissionDecision): "always" | "reject" {
  return decision === "allow" ? "always" : "reject";
}

export function createPermissionDecisionRecord(input: {
  permission: string;
  pattern: string;
  decision: PermissionDecision;
  scope: PermissionDecisionScope;
  sessionID: string | null;
  scopeKey?: string | null;
  customInstruction?: string | null;
}): PermissionDecisionRecord {
  return {
    permission: input.permission,
    pattern: input.pattern,
    decision: input.decision,
    scope: input.scope,
    sessionID: input.sessionID,
    scopeKey: input.scopeKey ?? null,
    customInstruction: input.customInstruction ?? null,
    createdAt: Date.now(),
  };
}

export function upsertPermissionDecision(
  matrix: PermissionDecisionRecord[],
  nextEntry: PermissionDecisionRecord,
): PermissionDecisionRecord[] {
  return [
    nextEntry,
    ...matrix.filter(
      (entry) =>
        !(
          entry.permission === nextEntry.permission &&
          entry.pattern === nextEntry.pattern &&
          entry.scope === nextEntry.scope &&
          entry.sessionID === nextEntry.sessionID &&
          entry.scopeKey === nextEntry.scopeKey
        ),
    ),
  ].slice(0, 250);
}

export function isRiskActionBlocked(policy: SafetyPolicy, action: RiskAction): boolean {
  return policy.gateRiskyActions && policy.blockedRiskActions.includes(action);
}

export function buildAutonomyDirective(input: {
  mode: AutonomyMode;
  policy: SafetyPolicy;
  riskyActions: RiskAction[];
}): string {
  const blocked = input.riskyActions.filter((action) => isRiskActionBlocked(input.policy, action));
  const gates = [
    input.policy.requireBackups ? "Backups required before modifications" : null,
    input.policy.requireRollbackPoints ? "Rollback points required" : null,
    input.policy.requireDocumentation ? "Documentation updates required" : null,
    input.policy.requireValidation ? "Validation required before completion" : null,
  ].filter((value): value is string => value !== null);

  const modeInstruction =
    input.mode === "suggest"
      ? "Suggest-only mode: produce a plan and ask for approval before applying risky actions."
      : input.mode === "semi_auto"
        ? "Semi-auto mode: continue autonomously but stop at approval checkpoints for risky actions."
        : "Full-auto mode: execute end-to-end while obeying all safety gates and blocked actions.";

  const blockedInstruction =
    blocked.length === 0
      ? "No blocked risk categories triggered."
      : `Blocked risk categories: ${blocked.join(", ")}. Do not execute those actions without explicit approval.`;

  return [
    "Autonomy policy:",
    `- ${modeInstruction}`,
    ...gates.map((gate) => `- ${gate}`),
    `- ${blockedInstruction}`,
  ].join("\n");
}
