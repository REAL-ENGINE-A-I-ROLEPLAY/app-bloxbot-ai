import type { ExplorerNode, ExplorerSnapshot } from "@/lib/explorer";

const ROOT_EXPECTATIONS = new Set([
  "Workspace",
  "ReplicatedStorage",
  "ServerStorage",
  "ServerScriptService",
  "StarterPlayer",
  "StarterGui",
  "StarterPack",
  "Lighting",
  "MaterialService",
  "SoundService",
  "Teams",
  "Chat",
]);

const SCRIPT_CLASSES = new Set(["Script", "LocalScript", "ModuleScript"]);
const ASSET_ID_FIELDS = new Set(["MeshId", "TextureID", "SoundId", "AnimationId"]);
const SAFE_SCRIPT_PARENT_PATTERN =
  /^(Workspace|ReplicatedStorage|ServerStorage|ServerScriptService|StarterPlayer|StarterGui|StarterPack|ReplicatedFirst)(\.|$)/u;

export interface TwinNode {
  path: string;
  name: string;
  className: string;
  parentPath: string | null;
  childCount: number;
  propertyMap: Record<string, string>;
}

export interface WorkspaceHealth {
  missingRoots: string[];
  brokenModels: string[];
  missingAssets: string[];
  orphanedScripts: string[];
  duplicateAssets: Array<{ assetId: string; count: number; paths: string[] }>;
  performanceBottlenecks: string[];
}

export interface WorkspaceDigitalTwin {
  placeName: string;
  capturedAt: string;
  nodes: TwinNode[];
  classCounts: Record<string, number>;
  health: WorkspaceHealth;
}

function flattenNode(node: ExplorerNode, parentPath: string | null, into: TwinNode[]): void {
  const propertyMap: Record<string, string> = {};
  for (const prop of node.properties) propertyMap[prop.name] = prop.value;
  into.push({
    path: node.path,
    name: node.name,
    className: node.className,
    parentPath,
    childCount: node.children.length,
    propertyMap,
  });
  for (const child of node.children) flattenNode(child, node.path, into);
}

export function buildWorkspaceDigitalTwin(snapshot: ExplorerSnapshot): WorkspaceDigitalTwin {
  const nodes: TwinNode[] = [];
  for (const root of snapshot.roots) flattenNode(root, null, nodes);

  const classCounts: Record<string, number> = {};
  const assetUsage = new Map<string, string[]>();
  const roots = new Set(snapshot.roots.map((root) => root.className));

  for (const node of nodes) {
    classCounts[node.className] = (classCounts[node.className] ?? 0) + 1;
    for (const [field, value] of Object.entries(node.propertyMap)) {
      if (!ASSET_ID_FIELDS.has(field)) continue;
      const normalized = value.trim();
      if (!normalized) continue;
      const paths = assetUsage.get(normalized) ?? [];
      paths.push(node.path);
      assetUsage.set(normalized, paths);
    }
  }

  const missingRoots = [...ROOT_EXPECTATIONS].filter((expected) => !roots.has(expected));
  const brokenModels = nodes
    .filter((node) => node.className === "Model" && node.childCount === 0)
    .map((node) => node.path);

  const missingAssets = nodes
    .filter((node) => {
      if (!(node.className === "MeshPart" || node.className === "Decal" || node.className === "Sound")) {
        return false;
      }
      return Object.entries(node.propertyMap).some(
        ([field, value]) => ASSET_ID_FIELDS.has(field) && value.trim().length === 0,
      );
    })
    .map((node) => node.path);

  const orphanedScripts = nodes
    .filter((node) => SCRIPT_CLASSES.has(node.className))
    .filter((node) => {
      const parent = node.parentPath;
      if (!parent) return true;
      return !SAFE_SCRIPT_PARENT_PATTERN.test(parent);
    })
    .map((node) => node.path);

  const duplicateAssets = [...assetUsage.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([assetId, paths]) => ({ assetId, count: paths.length, paths }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const performanceBottlenecks: string[] = [];
  if (nodes.length > 2_000) performanceBottlenecks.push(`High instance count: ${nodes.length}`);
  if ((classCounts.Script ?? 0) + (classCounts.LocalScript ?? 0) + (classCounts.ModuleScript ?? 0) > 400) {
    performanceBottlenecks.push("High script volume can increase startup and runtime overhead.");
  }
  if ((classCounts.ParticleEmitter ?? 0) > 120) {
    performanceBottlenecks.push("High particle emitter count may impact FPS on low-end devices.");
  }

  return {
    placeName: snapshot.placeName,
    capturedAt: snapshot.capturedAt,
    nodes,
    classCounts,
    health: {
      missingRoots,
      brokenModels,
      missingAssets,
      orphanedScripts,
      duplicateAssets,
      performanceBottlenecks,
    },
  };
}
