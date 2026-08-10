export type ProductLane = "lane-a" | "lane-b" | "lane-c" | "lane-d";

export type BuilderModeId =
  | "ui-builder"
  | "vehicle-systems-builder"
  | "team-spawn-builder"
  | "combat-builder"
  | "economy-builder";

export type WorkflowStage = "full_pipeline" | "plan" | "generate" | "apply" | "verify" | "summarize";

export interface BuilderMode {
  id: BuilderModeId;
  label: string;
  lane: ProductLane;
  description: string;
  executionFocus: string;
}

export interface BuilderTemplate {
  id: string;
  modeId: BuilderModeId | "all";
  label: string;
  prompt: string;
}

export const BUILDER_MODES: readonly BuilderMode[] = [
  {
    id: "ui-builder",
    label: "UI Builder",
    lane: "lane-a",
    description: "Build tools, UI, and GUI systems",
    executionFocus: "Prioritize reusable GUI modules, input flows, and clear UX state handling.",
  },
  {
    id: "vehicle-systems-builder",
    label: "Vehicle Systems Builder",
    lane: "lane-b",
    description: "Vehicle classes, handling, ownership, and simulation systems",
    executionFocus:
      "Prioritize scalable vehicle architecture for cars, trucks, semis, bikes, boats, planes, jets, and helicopters.",
  },
  {
    id: "team-spawn-builder",
    label: "Team/Spawn Builder",
    lane: "lane-b",
    description: "Teams, spawn routing, loadouts, and permissions",
    executionFocus:
      "Prioritize deterministic spawn safety, balanced teams, role permissions, and reliable loadout assignment.",
  },
  {
    id: "combat-builder",
    label: "Combat Builder",
    lane: "lane-b",
    description: "Weapons, damage, progression, and tactical loops",
    executionFocus:
      "Prioritize server-authoritative combat logic, anti-exploit safeguards, and observable balancing telemetry.",
  },
  {
    id: "economy-builder",
    label: "Economy Builder",
    lane: "lane-d",
    description: "Progression, rewards, monetization-safe loops, and reliability",
    executionFocus:
      "Prioritize robust data consistency, anti-abuse controls, and maintainable progression configuration.",
  },
];

export const BUILDER_TEMPLATES: readonly BuilderTemplate[] = [
  {
    id: "template-team-setup",
    modeId: "team-spawn-builder",
    label: "Team setup + spawn routing",
    prompt:
      "Create a complete team architecture with balancing rules, spawn routing by team/state, role permissions, and fallback handling when spawns are blocked.",
  },
  {
    id: "template-loadouts",
    modeId: "team-spawn-builder",
    label: "Team gear/tool/weapon loadouts",
    prompt:
      "Design role-based loadouts for teams including gear/tools/weapons, grant logic, restrictions, and safe defaults for missing assets.",
  },
  {
    id: "template-vehicle-framework",
    modeId: "vehicle-systems-builder",
    label: "Vehicle framework pack",
    prompt:
      "Create a modular vehicle framework for 4 wheelers, dirt bikes, motorcycles, semis, cars, trucks, military vehicles, jets, boats, planes, and helicopters including shared fuel, damage, handling, ownership, keybinds, enter/exit, and repair flows.",
  },
  {
    id: "template-livery-system",
    modeId: "vehicle-systems-builder",
    label: "Livery + skin system",
    prompt:
      "Build a livery/skin system with layered materials, decals, variant presets, unlock conditions, and server-validated save/load behavior.",
  },
  {
    id: "template-combat-loop",
    modeId: "combat-builder",
    label: "Combat gameplay loop",
    prompt:
      "Define a combat loop with weapon classes, damage model, hit validation, cooldown/reload constraints, and anti-exploit checks for server authority.",
  },
  {
    id: "template-ui-tooling",
    modeId: "ui-builder",
    label: "Tooling UI + command center",
    prompt:
      "Create a command-center style UI for long-running jobs with queued tasks, progress, partial outputs, rollback options, and dependency-map visibility.",
  },
  {
    id: "template-asset-recipe",
    modeId: "all",
    label: "3D asset recipe output",
    prompt:
      "Produce an asset recipe for each requested model with naming, scale targets, rig hints, collision setup, attachment points, and integration checklist for Roblox.",
  },
  {
    id: "template-4d-timeline",
    modeId: "all",
    label: "“4D-like” timeline behaviors",
    prompt:
      "Implement time-based effects that emulate 4D-style behavior using animation states, procedural transformations, timeline-driven events, and synchronized state transitions.",
  },
  {
    id: "template-blueprint-military",
    modeId: "all",
    label: "Military RP starter blueprint",
    prompt:
      "Create a one-click Military RP project starter blueprint with teams, permissions, loadouts, vehicle pools, mission loops, and admin controls.",
  },
  {
    id: "template-blueprint-vehicle-sandbox",
    modeId: "all",
    label: "Vehicle sandbox starter blueprint",
    prompt:
      "Create a one-click Vehicle Sandbox starter blueprint with spawning pads, handling presets, livery presets, tuning zones, and persistence boundaries.",
  },
  {
    id: "template-blueprint-team-combat",
    modeId: "all",
    label: "Team combat starter blueprint",
    prompt:
      "Create a one-click Team Combat starter blueprint with team balancing, spawn safety, loadouts, objective loops, and round-state transitions.",
  },
  {
    id: "template-blueprint-logistics",
    modeId: "all",
    label: "Logistics/transport starter blueprint",
    prompt:
      "Create a one-click Logistics/Transport starter blueprint with cargo flow systems, route missions, fleet ownership, and failure-recovery mechanics.",
  },
];

const WORKFLOW_INSTRUCTIONS: Record<WorkflowStage, string> = {
  full_pipeline:
    "Execute this request in order: PLAN → GENERATE → APPLY in Studio → VERIFY in Studio → SUMMARIZE final outputs, risks, and follow-up tasks.",
  plan: "Produce only the PLAN stage: architecture, assumptions, dependencies, and execution order.",
  generate:
    "Produce only the GENERATE stage: concrete scripts/assets/configuration changes required by the approved plan.",
  apply:
    "Produce only the APPLY stage: perform constrained Studio changes and report exactly what was modified.",
  verify:
    "Produce only the VERIFY stage: run targeted checks and report pass/fail evidence with causes for any failures.",
  summarize:
    "Produce only the SUMMARIZE stage: concise outcome summary, unresolved risks, and recommended next actions.",
};

function laneLabel(lane: ProductLane): string {
  switch (lane) {
    case "lane-a":
      return "Lane A: Build/tools/UI/GUI generation";
    case "lane-b":
      return "Lane B: Roblox gameplay systems";
    case "lane-c":
      return "Lane C: 3D/livery/timeline content pipeline";
    default:
      return "Lane D: Reliability/safety/performance";
  }
}

export function getBuilderModeById(id: BuilderModeId): BuilderMode {
  return BUILDER_MODES.find((mode) => mode.id === id) ?? BUILDER_MODES[0];
}

export function getBuilderTemplates(modeId: BuilderModeId): BuilderTemplate[] {
  return BUILDER_TEMPLATES.filter((template) => template.modeId === "all" || template.modeId === modeId);
}

export function getBuilderTemplateById(
  modeId: BuilderModeId,
  templateId: string | null,
): BuilderTemplate | null {
  if (!templateId) return null;
  return getBuilderTemplates(modeId).find((template) => template.id === templateId) ?? null;
}

function qualityChecklist(mode: BuilderMode): string[] {
  const shared = [
    "Validate missing references/services and report any unresolved dependency.",
    "Validate hierarchy paths and report invalid or ambiguous paths.",
    "Validate server/client boundaries and identify unsafe authority patterns.",
    "Check performance red flags (heavy loops, replication misuse, memory pressure).",
  ];
  const modeSpecific: Record<BuilderModeId, string[]> = {
    "ui-builder": [
      "Verify UI state transitions and edge-case flows for disconnected/missing data.",
    ],
    "vehicle-systems-builder": [
      "Verify vehicle ownership, enter/exit safety, and handling defaults for each class.",
    ],
    "team-spawn-builder": [
      "Verify spawn safety, team balancing logic, and role-based permission boundaries.",
    ],
    "combat-builder": [
      "Verify server-authoritative damage and anti-exploit protections for weapon actions.",
    ],
    "economy-builder": [
      "Verify economy state consistency and anti-abuse controls for reward paths.",
    ],
  };
  return [...shared, ...modeSpecific[mode.id]];
}

export function composeBuilderPrompt(input: {
  text: string;
  modeId: BuilderModeId;
  workflowStage: WorkflowStage;
  templatePrompt?: string | null;
}): string {
  const userText = input.text.trim();
  if (!userText) return input.text;
  const mode = getBuilderModeById(input.modeId);
  const templateBlock = input.templatePrompt?.trim()
    ? `Template focus:\n${input.templatePrompt.trim()}`
    : null;
  const checks = qualityChecklist(mode).map((item, index) => `${index + 1}. ${item}`).join("\n");
  return [
    `Builder mode: ${mode.label}`,
    laneLabel(mode.lane),
    `Mode focus: ${mode.executionFocus}`,
    `Workflow: ${WORKFLOW_INSTRUCTIONS[input.workflowStage]}`,
    "Post-generation quality checks:",
    checks,
    templateBlock,
    "User request:",
    userText,
  ]
    .filter(Boolean)
    .join("\n\n");
}
