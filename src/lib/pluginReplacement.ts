export interface PluginReplacementContract {
  id: string;
  name: string;
  capabilities: string[];
  inputContract: string;
  outputContract: string;
  testable: boolean;
}

const MODULES: PluginReplacementContract[] = [
  {
    id: "terrain-generator",
    name: "Terrain Generator",
    capabilities: ["terrain-generation", "heightmap-build", "material-paint"],
    inputContract: "terrain-request-v1",
    outputContract: "terrain-result-v1",
    testable: true,
  },
  {
    id: "asset-placement",
    name: "Asset Placement",
    capabilities: ["model-placement", "road-placement", "building-placement"],
    inputContract: "placement-request-v1",
    outputContract: "placement-result-v1",
    testable: true,
  },
  {
    id: "script-factory",
    name: "Script Factory",
    capabilities: ["script-creation", "script-refactor", "script-optimization"],
    inputContract: "script-request-v1",
    outputContract: "script-result-v1",
    testable: true,
  },
  {
    id: "batch-operations",
    name: "Batch Operations",
    capabilities: ["batch-rename", "folder-creation", "asset-organization"],
    inputContract: "batch-request-v1",
    outputContract: "batch-result-v1",
    testable: true,
  },
  {
    id: "lod-optimizer",
    name: "LOD Optimizer",
    capabilities: ["lod-generation", "mesh-optimization", "texture-compression"],
    inputContract: "lod-request-v1",
    outputContract: "lod-result-v1",
    testable: true,
  },
];

export function listPluginReplacementModules(): PluginReplacementContract[] {
  return MODULES;
}

export function selectPluginReplacementModules(goal: string): PluginReplacementContract[] {
  const text = goal.toLowerCase();
  return MODULES.filter((module) =>
    module.capabilities.some((capability) => text.includes(capability.split("-")[0])),
  );
}
