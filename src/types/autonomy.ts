import { Schema } from "effect";

const MutableStrings = Schema.mutable(Schema.Array(Schema.String));

export const AutonomyModeSchema = Schema.Literal("suggest", "semi_auto", "full_auto");
export type AutonomyMode = typeof AutonomyModeSchema.Type;

export const RiskActionSchema = Schema.Literal(
  "mass_edit",
  "delete",
  "publish_deploy",
  "ownership_license",
  "security_critical",
);
export type RiskAction = typeof RiskActionSchema.Type;

export const PermissionDecisionScopeSchema = Schema.Literal("session", "workplace", "always");
export type PermissionDecisionScope = typeof PermissionDecisionScopeSchema.Type;

export const PermissionDecisionSchema = Schema.Literal("allow", "deny");
export type PermissionDecision = typeof PermissionDecisionSchema.Type;

export const PermissionDecisionRecordSchema = Schema.mutable(
  Schema.Struct({
    permission: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(128)),
    pattern: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(1_024)),
    decision: PermissionDecisionSchema,
    scope: PermissionDecisionScopeSchema,
    sessionID: Schema.NullOr(Schema.String),
    scopeKey: Schema.NullOr(Schema.String),
    customInstruction: Schema.NullOr(Schema.String),
    createdAt: Schema.Number.pipe(Schema.int()),
  }),
);

export type PermissionDecisionRecord = typeof PermissionDecisionRecordSchema.Type;

export const SafetyPolicySchema = Schema.mutable(
  Schema.Struct({
    requireBackups: Schema.Boolean,
    requireRollbackPoints: Schema.Boolean,
    requireDocumentation: Schema.Boolean,
    requireValidation: Schema.Boolean,
    gateRiskyActions: Schema.Boolean,
    blockedRiskActions: Schema.mutable(Schema.Array(RiskActionSchema)),
  }),
);

export type SafetyPolicy = typeof SafetyPolicySchema.Type;

export const QualityThresholdsSchema = Schema.mutable(
  Schema.Struct({
    project: Schema.Number.pipe(Schema.between(0, 100)),
    optimization: Schema.Number.pipe(Schema.between(0, 100)),
    security: Schema.Number.pipe(Schema.between(0, 100)),
    readability: Schema.Number.pipe(Schema.between(0, 100)),
  }),
);

export type QualityThresholds = typeof QualityThresholdsSchema.Type;

export const AutonomySettingsSchema = Schema.mutable(
  Schema.Struct({
    mode: AutonomyModeSchema,
    safetyPolicy: SafetyPolicySchema,
    permissionMatrix: Schema.mutable(Schema.Array(PermissionDecisionRecordSchema)),
    dontAskOwnershipAgain: Schema.Boolean,
    workspaceScopeKey: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
    monitorSignals: MutableStrings,
    qualityThresholds: QualityThresholdsSchema,
  }),
);

export type AutonomySettings = typeof AutonomySettingsSchema.Type;

export const DEFAULT_SAFETY_POLICY: SafetyPolicy = {
  requireBackups: true,
  requireRollbackPoints: true,
  requireDocumentation: true,
  requireValidation: true,
  gateRiskyActions: true,
  blockedRiskActions: ["publish_deploy"],
};

export const DEFAULT_AUTONOMY_SETTINGS: AutonomySettings = {
  mode: "suggest",
  safetyPolicy: DEFAULT_SAFETY_POLICY,
  permissionMatrix: [],
  dontAskOwnershipAgain: false,
  workspaceScopeKey: "local-workspace",
  monitorSignals: ["output_errors", "asset_failures", "memory", "fps", "network"],
  qualityThresholds: {
    project: 75,
    optimization: 70,
    security: 85,
    readability: 70,
  },
};
