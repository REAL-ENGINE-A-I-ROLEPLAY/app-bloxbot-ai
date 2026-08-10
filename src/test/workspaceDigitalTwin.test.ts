import { describe, expect, it } from "vitest";

import { calculateQualityScores } from "@/lib/qualityScoring";
import { runVerificationPipeline } from "@/lib/verificationPipeline";
import { buildWorkspaceDigitalTwin } from "@/lib/workspaceDigitalTwin";

describe("workspaceDigitalTwin", () => {
  it("builds health diagnostics from explorer snapshot", () => {
    const twin = buildWorkspaceDigitalTwin({
      placeName: "Test Place",
      capturedAt: new Date().toISOString(),
      roots: [
        {
          name: "Workspace",
          className: "Workspace",
          path: "Workspace",
          hasChildren: true,
          properties: [],
          attributes: [],
          children: [
            {
              name: "BrokenModel",
              className: "Model",
              path: "Workspace.BrokenModel",
              hasChildren: false,
              properties: [],
              attributes: [],
              children: [],
            },
            {
              name: "RiverSound",
              className: "Sound",
              path: "Workspace.RiverSound",
              hasChildren: false,
              properties: [{ name: "SoundId", value: "" }],
              attributes: [],
              children: [],
            },
          ],
        },
      ],
    });

    expect(twin.health.brokenModels).toContain("Workspace.BrokenModel");
    expect(twin.health.missingAssets).toContain("Workspace.RiverSound");
    expect(twin.health.missingRoots.length).toBeGreaterThan(0);

    const validation = runVerificationPipeline(twin);
    expect(validation.passed).toBe(false);

    const scores = calculateQualityScores(twin, validation);
    expect(scores.project).toBeLessThan(100);
    expect(scores.security).toBeLessThan(100);
  });
});
