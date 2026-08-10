import { describe, expect, it } from "vitest";

import {
  composeBuilderPrompt,
  getBuilderTemplateById,
  getBuilderTemplates,
} from "@/lib/builderModes";

describe("builderModes", () => {
  it("includes workflow, quality checks, and user request in composed prompts", () => {
    const prompt = composeBuilderPrompt({
      text: "Build a helicopter combat system",
      modeId: "vehicle-systems-builder",
      workflowStage: "full_pipeline",
    });

    expect(prompt).toContain("Builder mode: Vehicle Systems Builder");
    expect(prompt).toContain("PLAN → GENERATE → APPLY in Studio → VERIFY in Studio → SUMMARIZE");
    expect(prompt).toContain("Validate missing references/services");
    expect(prompt).toContain("User request:");
    expect(prompt).toContain("Build a helicopter combat system");
  });

  it("applies selected template prompts when present", () => {
    const template = getBuilderTemplateById("team-spawn-builder", "template-loadouts");
    expect(template).not.toBeNull();

    const prompt = composeBuilderPrompt({
      text: "Create a role progression update",
      modeId: "team-spawn-builder",
      workflowStage: "plan",
      templatePrompt: template?.prompt,
    });

    expect(prompt).toContain("Template focus:");
    expect(prompt).toContain("loadouts");
    expect(prompt).toContain("Produce only the PLAN stage");
  });

  it("returns mode-specific templates plus shared templates", () => {
    const templates = getBuilderTemplates("ui-builder");
    const ids = templates.map((template) => template.id);

    expect(ids).toContain("template-ui-tooling");
    expect(ids).toContain("template-asset-recipe");
    expect(ids).toContain("template-4d-timeline");
  });
});
