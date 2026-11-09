import { describe, expect, it } from "vitest";

import {
  createExecutionLog,
  createTaskPlan,
  createValidationResult,
  finalizeTaskReport,
  updateExecutionLog,
} from "@/lib/taskOrchestrator";
import { DEFAULT_SAFETY_POLICY } from "@/types/autonomy";

describe("taskOrchestrator", () => {
  it("creates a deterministic multi-step plan", () => {
    const plan = createTaskPlan("Generate downtown map", ["mass_edit"]);
    expect(plan.steps.map((step) => step.id)).toEqual([
      "plan",
      "backup",
      "apply",
      "validate",
      "report",
    ]);
  });

  it("tracks execution updates", () => {
    const plan = createTaskPlan("Fix scripts", []);
    const log = createExecutionLog(plan);
    const running = updateExecutionLog(log, "plan", { status: "running", note: "started" });
    const done = updateExecutionLog(running, "plan", { status: "completed", note: "done" });
    expect(done.entries.find((entry) => entry.stepId === "plan")?.status).toBe("completed");
    expect(done.entries.find((entry) => entry.stepId === "plan")?.notes).toEqual([
      "started",
      "done",
    ]);
  });

  it("finalizes report with validation outcome", () => {
    const plan = createTaskPlan("Audit workspace", []);
    const log = createExecutionLog(plan);
    const validation = createValidationResult(DEFAULT_SAFETY_POLICY, [
      { name: "backup", passed: true, detail: "ok" },
      { name: "rollback", passed: true, detail: "ok" },
      { name: "documentation", passed: true, detail: "ok" },
      { name: "validation", passed: true, detail: "ok" },
      { name: "security", passed: true, detail: "ok" },
      { name: "attribution", passed: true, detail: "ok" },
    ]);
    const report = finalizeTaskReport(plan, log, validation);
    expect(report.summary).toContain("completed");
    expect(report.failedSteps).toEqual([]);
  });
});
