import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useAgents } from "@/hooks/useAgents";
import { useConnectedProviders } from "@/hooks/useProviders";
import {
  type AutonomyMode,
  type PermissionDecisionRecord,
  DEFAULT_AUTONOMY_SETTINGS,
} from "@/types/autonomy";
import {
  ANALYTICS_NOTICE_VERSION,
  setDetailedAnalyticsEnabled as setDetailedAnalyticsCollection,
} from "@/lib/analytics";
import { type AppConfig, loadConfig, patchConfig } from "@/lib/config";
import { qk } from "@/lib/queryKeys";
import { splitModelKey } from "@/lib/splitModelKey";

function cloneDefaultAutonomySettings(): AppConfig["autonomy"] {
  return {
    ...DEFAULT_AUTONOMY_SETTINGS,
    safetyPolicy: { ...DEFAULT_AUTONOMY_SETTINGS.safetyPolicy },
    permissionMatrix: [...DEFAULT_AUTONOMY_SETTINGS.permissionMatrix],
    monitorSignals: [...DEFAULT_AUTONOMY_SETTINGS.monitorSignals],
    qualityThresholds: { ...DEFAULT_AUTONOMY_SETTINGS.qualityThresholds },
  };
}

interface PreferencesContextValue {
  selectedModel: string | null;
  selectedAgent: string | null;
  selectedVariant: string | null;
  hiddenModels: Set<string>;
  detailedAnalyticsEnabled: boolean;
  autonomyMode: AutonomyMode;
  autonomySettings: AppConfig["autonomy"];
  setSelectedModel: (modelID: string) => void;
  setSelectedAgent: (name: string) => void;
  setSelectedVariant: (variant: string | null) => void;
  toggleModelVisibility: (modelKey: string) => void;
  setDetailedAnalyticsEnabled: (enabled: boolean) => void;
  setAutonomyMode: (mode: AutonomyMode) => void;
  updatePermissionMatrix: (updater: (current: PermissionDecisionRecord[]) => PermissionDecisionRecord[]) => void;
  setDontAskOwnershipAgain: (enabled: boolean) => void;
  setWorkspaceScopeKey: (scopeKey: string) => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used within a PreferencesProvider");
  return context;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { data: configData } = useQuery<AppConfig>({
    queryKey: qk.config,
    queryFn: loadConfig,
  });

  const [selectedModel, setSelectedModelState] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgentState] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariantState] = useState<string | null>(null);
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());
  const [detailedAnalyticsEnabled, setDetailedAnalyticsEnabledState] = useState(false);
  const [autonomySettings, setAutonomySettingsState] = useState<AppConfig["autonomy"]>(
    cloneDefaultAutonomySettings,
  );
  const detailedAnalyticsEnabledRef = useRef(false);
  const autonomySettingsRef = useRef<AppConfig["autonomy"]>(cloneDefaultAutonomySettings());

  const connectedProviders = useConnectedProviders();

  const setDetailedAnalyticsEnabled = useCallback((enabled: boolean) => {
    const previous = detailedAnalyticsEnabledRef.current;
    detailedAnalyticsEnabledRef.current = enabled;
    setDetailedAnalyticsEnabledState(enabled);
    setDetailedAnalyticsCollection(enabled);
    patchConfig({ detailedAnalytics: enabled ? "enabled" : "disabled" }).catch(() => {
      detailedAnalyticsEnabledRef.current = previous;
      setDetailedAnalyticsEnabledState(previous);
      setDetailedAnalyticsCollection(previous);
    });
  }, []);

  // Initialize from config data when it arrives and notify once about opt-out metrics.
  useEffect(() => {
    if (!configData) return;
    setHiddenModels(new Set(configData.hiddenModels));
    const loadedAutonomy = configData.autonomy ?? cloneDefaultAutonomySettings();
    autonomySettingsRef.current = loadedAutonomy;
    setAutonomySettingsState(loadedAutonomy);

    // Model usage metrics moved from opt-in to opt-out. Choices recorded under the
    // old consent prompt (including clickaways) do not carry over: metrics start
    // enabled and the one-time notice points at the Settings toggle.
    if (configData.analyticsNoticeVersion < ANALYTICS_NOTICE_VERSION) {
      detailedAnalyticsEnabledRef.current = true;
      setDetailedAnalyticsEnabledState(true);
      setDetailedAnalyticsCollection(true);
      toast("BloxBot collects anonymized usage metrics", {
        id: "analytics-optout-notice",
        className: "analytics-consent-toast",
        description:
          "Provider, model, and aggregate token metrics are tied to an anonymous device identifier. Prompts, responses, and files are never collected. Turn this off any time in Settings → Privacy.",
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: "Got it",
          onClick: () => {},
        },
        cancel: {
          label: "Disable",
          onClick: () => setDetailedAnalyticsEnabled(false),
        },
      });
      // Persist only after the notice is on screen, so a failure to show it
      // leaves the version behind and the notice fires again next launch.
      patchConfig({
        detailedAnalytics: "enabled",
        analyticsNoticeVersion: ANALYTICS_NOTICE_VERSION,
      }).catch(() => {});
      return;
    }

    const detailedEnabled = configData.detailedAnalytics !== "disabled";
    detailedAnalyticsEnabledRef.current = detailedEnabled;
    setDetailedAnalyticsEnabledState(detailedEnabled);
    setDetailedAnalyticsCollection(detailedEnabled);
  }, [configData, setDetailedAnalyticsEnabled]);

  // Restore a valid last-used model and clear selections whose provider disconnected.
  useEffect(() => {
    if (!configData) return;
    if (selectedModel && !connectedProviders.includes(splitModelKey(selectedModel)[0])) {
      setSelectedModelState(null);
      setSelectedVariantState(null);
      return;
    }
    if (
      !selectedModel &&
      configData.lastModel &&
      connectedProviders.includes(splitModelKey(configData.lastModel)[0])
    ) {
      setSelectedModelState(configData.lastModel);
    }
  }, [configData, connectedProviders, selectedModel]);

  // Auto-select first agent
  const agents = useAgents();
  useEffect(() => {
    if (agents.length === 0 || selectedAgent) return;
    const primary = agents.find((a) => a.mode === "primary" && !a.hidden);
    if (primary) setSelectedAgentState(primary.name);
  }, [agents, selectedAgent]);

  const setSelectedModel = useCallback((modelID: string) => {
    setSelectedModelState(modelID);
    patchConfig({ lastModel: modelID }).catch(() => {});
  }, []);

  const setSelectedAgent = useCallback((name: string) => {
    setSelectedAgentState(name);
  }, []);

  const setSelectedVariant = useCallback((variant: string | null) => {
    setSelectedVariantState(variant);
  }, []);

  const toggleModelVisibility = useCallback(
    (modelKey: string) => {
      const next = new Set(hiddenModels);
      if (next.has(modelKey)) {
        next.delete(modelKey);
      } else {
        next.add(modelKey);
      }
      setHiddenModels(next);
      patchConfig({ hiddenModels: [...next] }).catch(() => {});
    },
    [hiddenModels],
  );

  const patchAutonomy = useCallback((next: AppConfig["autonomy"]) => {
    const previous = autonomySettingsRef.current;
    autonomySettingsRef.current = next;
    setAutonomySettingsState(next);
    patchConfig({ autonomy: next }).catch(() => {
      autonomySettingsRef.current = previous;
      setAutonomySettingsState(previous);
    });
  }, []);

  const setAutonomyMode = useCallback(
    (mode: AutonomyMode) => {
      const previous = autonomySettingsRef.current;
      const next = { ...previous, mode };
      patchAutonomy(next);
    },
    [patchAutonomy],
  );

  const updatePermissionMatrix = useCallback(
    (updater: (current: PermissionDecisionRecord[]) => PermissionDecisionRecord[]) => {
      const previous = autonomySettingsRef.current;
      const next = {
        ...previous,
        permissionMatrix: updater(previous.permissionMatrix),
      };
      patchAutonomy(next);
    },
    [patchAutonomy],
  );

  const setDontAskOwnershipAgain = useCallback(
    (enabled: boolean) => {
      const previous = autonomySettingsRef.current;
      patchAutonomy({ ...previous, dontAskOwnershipAgain: enabled });
    },
    [patchAutonomy],
  );

  const setWorkspaceScopeKey = useCallback(
    (scopeKey: string) => {
      const previous = autonomySettingsRef.current;
      patchAutonomy({ ...previous, workspaceScopeKey: scopeKey });
    },
    [patchAutonomy],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      selectedModel,
      selectedAgent,
      selectedVariant,
      hiddenModels,
      detailedAnalyticsEnabled,
      autonomyMode: autonomySettings.mode,
      autonomySettings,
      setSelectedModel,
      setSelectedAgent,
      setSelectedVariant,
      toggleModelVisibility,
      setDetailedAnalyticsEnabled,
      setAutonomyMode,
      updatePermissionMatrix,
      setDontAskOwnershipAgain,
      setWorkspaceScopeKey,
    }),
    [
      selectedModel,
      selectedAgent,
      selectedVariant,
      hiddenModels,
      detailedAnalyticsEnabled,
      autonomySettings,
      setSelectedModel,
      setSelectedAgent,
      setSelectedVariant,
      toggleModelVisibility,
      setDetailedAnalyticsEnabled,
      setAutonomyMode,
      updatePermissionMatrix,
      setDontAskOwnershipAgain,
      setWorkspaceScopeKey,
    ],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
