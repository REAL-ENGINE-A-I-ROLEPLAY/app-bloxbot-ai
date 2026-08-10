import type { ValidationReport } from "@/lib/verificationPipeline";
import type { WorkspaceDigitalTwin } from "@/lib/workspaceDigitalTwin";

export interface QualityScores {
  project: number;
  optimization: number;
  security: number;
  readability: number;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateQualityScores(
  twin: WorkspaceDigitalTwin,
  validation: ValidationReport,
): QualityScores {
  const projectPenalty =
    twin.health.missingAssets.length * 3 + twin.health.brokenModels.length * 2 + twin.health.missingRoots.length * 4;
  const optimizationPenalty =
    twin.health.performanceBottlenecks.length * 12 + Math.max(0, twin.nodes.length - 2_000) / 50;
  const securityPenalty =
    (validation.checks.find((check) => check.name === "security")?.passed ? 0 : 20) +
    twin.health.orphanedScripts.length;
  const readabilityPenalty =
    twin.health.orphanedScripts.length * 2 + Math.max(0, (twin.classCounts.ModuleScript ?? 0) - 200) / 10;

  return {
    project: clamp(100 - projectPenalty),
    optimization: clamp(100 - optimizationPenalty),
    security: clamp(100 - securityPenalty),
    readability: clamp(100 - readabilityPenalty),
  };
}

export function checkScoreThresholds(
  scores: QualityScores,
  thresholds: QualityScores,
): { accepted: boolean; failed: Array<keyof QualityScores> } {
  const failed = (Object.keys(scores) as Array<keyof QualityScores>).filter(
    (key) => scores[key] < thresholds[key],
  );
  return { accepted: failed.length === 0, failed };
}
