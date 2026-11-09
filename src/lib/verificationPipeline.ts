import type { WorkspaceDigitalTwin } from "@/lib/workspaceDigitalTwin";
import type { TaskStep } from "@/lib/taskOrchestrator";

export interface ValidationCheck {
  name: "script-runtime" | "dependencies" | "performance" | "security" | "attribution";
  passed: boolean;
  detail: string;
}

export interface DryRunPreview {
  summary: string;
  impactedAreas: string[];
  risky: boolean;
}

export interface ValidationReport {
  passed: boolean;
  checks: ValidationCheck[];
}

export function createDryRunPreview(
  steps: TaskStep[],
  options?: { riskyActions?: readonly string[] },
): DryRunPreview {
  const impactedAreas = steps.map((step) => step.title);
  const risky = (options?.riskyActions?.length ?? 0) > 0;
  return {
    summary: `${steps.length} planned steps with ${steps.filter((step) => step.checkpoint).length} checkpoints`,
    impactedAreas,
    risky,
  };
}

export function runVerificationPipeline(twin: WorkspaceDigitalTwin): ValidationReport {
  const checks: ValidationCheck[] = [
    {
      name: "script-runtime",
      passed: twin.health.orphanedScripts.length === 0,
      detail:
        twin.health.orphanedScripts.length === 0
          ? "No orphaned scripts detected"
          : `${twin.health.orphanedScripts.length} orphaned scripts found`,
    },
    {
      name: "dependencies",
      passed: twin.health.missingAssets.length === 0,
      detail:
        twin.health.missingAssets.length === 0
          ? "No missing core assets detected"
          : `${twin.health.missingAssets.length} nodes reference missing assets`,
    },
    {
      name: "performance",
      passed: twin.health.performanceBottlenecks.length === 0,
      detail:
        twin.health.performanceBottlenecks.length === 0
          ? "No major bottlenecks detected"
          : twin.health.performanceBottlenecks.join("; "),
    },
    {
      name: "security",
      passed: twin.health.missingRoots.length === 0,
      detail:
        twin.health.missingRoots.length === 0
          ? "Core service roots present"
          : `Missing roots: ${twin.health.missingRoots.join(", ")}`,
    },
    {
      name: "attribution",
      passed: true,
      detail: "Attribution manifest check must run during import workflow.",
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
  };
}
