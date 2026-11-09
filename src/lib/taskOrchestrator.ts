import type { RiskAction, SafetyPolicy } from "@/types/autonomy";

export interface TaskStep {
  id: string;
  title: string;
  dependsOn: string[];
  checkpoint: boolean;
  rollbackPoint: boolean;
  successCriteria: string;
}

export interface OrchestratedTaskPlan {
  goal: string;
  createdAt: string;
  riskyActions: RiskAction[];
  steps: TaskStep[];
}

export interface TaskExecutionEntry {
  stepId: string;
  status: "pending" | "running" | "completed" | "failed" | "blocked";
  startedAt: string | null;
  completedAt: string | null;
  notes: string[];
}

export interface TaskExecutionLog {
  goal: string;
  planCreatedAt: string;
  entries: TaskExecutionEntry[];
}

export interface TaskValidationResult {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
}

export interface TaskFinalReport {
  goal: string;
  summary: string;
  validation: TaskValidationResult;
  completedAt: string;
  failedSteps: string[];
}

function makeStep(
  id: string,
  title: string,
  successCriteria: string,
  options?: { dependsOn?: string[]; checkpoint?: boolean; rollbackPoint?: boolean },
): TaskStep {
  return {
    id,
    title,
    successCriteria,
    dependsOn: options?.dependsOn ?? [],
    checkpoint: options?.checkpoint ?? false,
    rollbackPoint: options?.rollbackPoint ?? false,
  };
}

export function createTaskPlan(goal: string, riskActions: RiskAction[]): OrchestratedTaskPlan {
  return {
    goal,
    createdAt: new Date().toISOString(),
    riskyActions: riskActions,
    steps: [
      makeStep("plan", "Plan task", "Task scope, dependencies, and quality gates are defined."),
      makeStep("backup", "Create backup and rollback point", "Rollback snapshot exists.", {
        dependsOn: ["plan"],
        checkpoint: true,
        rollbackPoint: true,
      }),
      makeStep(
        "apply",
        "Apply deterministic changes",
        "Changes match plan and respect policy constraints.",
        { dependsOn: ["backup"] },
      ),
      makeStep(
        "validate",
        "Run validation pipeline",
        "Script, runtime, dependency, performance, security, and attribution checks pass.",
        { dependsOn: ["apply"], checkpoint: true },
      ),
      makeStep("report", "Generate final report", "Execution log, validation output, and summary recorded.", {
        dependsOn: ["validate"],
      }),
    ],
  };
}

export function createExecutionLog(plan: OrchestratedTaskPlan): TaskExecutionLog {
  return {
    goal: plan.goal,
    planCreatedAt: plan.createdAt,
    entries: plan.steps.map((step) => ({
      stepId: step.id,
      status: "pending",
      startedAt: null,
      completedAt: null,
      notes: [],
    })),
  };
}

export function updateExecutionLog(
  log: TaskExecutionLog,
  stepId: string,
  update: { status: TaskExecutionEntry["status"]; note?: string },
): TaskExecutionLog {
  return {
    ...log,
    entries: log.entries.map((entry) => {
      if (entry.stepId !== stepId) return entry;
      const startedAt = entry.startedAt ?? (update.status === "pending" ? null : new Date().toISOString());
      const completedAt =
        update.status === "completed" || update.status === "failed" ? new Date().toISOString() : null;
      return {
        ...entry,
        status: update.status,
        startedAt,
        completedAt,
        notes: update.note ? [...entry.notes, update.note] : entry.notes,
      };
    }),
  };
}

export function createValidationResult(policy: SafetyPolicy, checks: TaskValidationResult["checks"]) {
  const requiredChecks = [
    "backup",
    "rollback",
    "documentation",
    "validation",
    "security",
    "attribution",
  ];
  const expected = new Set(requiredChecks);
  if (!policy.requireBackups) expected.delete("backup");
  if (!policy.requireRollbackPoints) expected.delete("rollback");
  if (!policy.requireDocumentation) expected.delete("documentation");
  if (!policy.requireValidation) expected.delete("validation");

  const hasRequired = checks.every((check) => !expected.has(check.name) || check.passed);
  return {
    passed: hasRequired && checks.every((check) => check.passed),
    checks,
  };
}

export function finalizeTaskReport(
  plan: OrchestratedTaskPlan,
  log: TaskExecutionLog,
  validation: TaskValidationResult,
): TaskFinalReport {
  const failedSteps = log.entries
    .filter((entry) => entry.status === "failed" || entry.status === "blocked")
    .map((entry) => entry.stepId);

  return {
    goal: plan.goal,
    summary: validation.passed && failedSteps.length === 0 ? "Task completed successfully." : "Task requires follow-up.",
    validation,
    completedAt: new Date().toISOString(),
    failedSteps,
  };
}
