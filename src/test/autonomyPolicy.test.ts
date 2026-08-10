import { describe, expect, it } from "vitest";

import {
  buildAutonomyDirective,
  createPermissionDecisionRecord,
  detectRiskActions,
  resolvePermissionDecision,
  toPermissionReply,
  upsertPermissionDecision,
} from "@/lib/autonomyPolicy";
import { DEFAULT_SAFETY_POLICY } from "@/types/autonomy";

describe("autonomyPolicy", () => {
  it("detects risky actions from prompt text", () => {
    const risky = detectRiskActions("Delete all assets and publish release with license rewrite");
    expect(risky).toEqual(
      expect.arrayContaining(["delete", "publish_deploy", "ownership_license", "mass_edit"]),
    );
  });

  it("resolves stored permission decision by scope", () => {
    const matrix = [
      createPermissionDecisionRecord({
        permission: "bash",
        pattern: "rm *",
        decision: "deny",
        scope: "session",
        sessionID: "session-1",
      }),
    ];
    const resolved = resolvePermissionDecision(
      matrix,
      { id: "p1", sessionID: "session-1", permission: "bash", patterns: ["rm -rf /tmp"] },
      { sessionID: "session-1", workspaceScopeKey: "workspace-1" },
    );
    expect(resolved?.decision).toBe("deny");
    expect(toPermissionReply(resolved?.decision ?? "allow")).toBe("reject");
  });

  it("keeps newest matrix entry when upserting duplicates", () => {
    const first = createPermissionDecisionRecord({
      permission: "bash",
      pattern: "*",
      decision: "allow",
      scope: "always",
      sessionID: null,
    });
    const second = { ...first, decision: "deny" as const, createdAt: first.createdAt + 10 };
    const updated = upsertPermissionDecision([first], second);
    expect(updated[0]?.decision).toBe("deny");
    expect(updated).toHaveLength(1);
  });

  it("builds directive with blocked-risk guidance", () => {
    const directive = buildAutonomyDirective({
      mode: "semi_auto",
      policy: DEFAULT_SAFETY_POLICY,
      riskyActions: ["publish_deploy"],
    });
    expect(directive).toContain("Semi-auto mode");
    expect(directive).toContain("Blocked risk categories");
  });
});
