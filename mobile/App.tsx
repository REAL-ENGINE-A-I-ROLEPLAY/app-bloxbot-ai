import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  MessageSchema,
  SessionSummarySchema,
  type Message,
  type SessionSummary,
} from "@bloxbot/contracts";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787";

type AppTab = "sessions" | "chat" | "settings";
type ProviderChoice = "opencode" | "anthropic" | "openai" | "google";
type AgentChoice = "primary" | "planner" | "builder";

async function apiGet<T>(url: string, parse: (input: unknown) => T): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return parse(await response.json());
}

async function apiPost<T>(
  url: string,
  body: Record<string, unknown>,
  parse: (input: unknown) => T,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return parse(await response.json());
}

export default function App() {
  const [tab, setTab] = useState<AppTab>("sessions");
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionTitleInput, setSessionTitleInput] = useState("");
  const [composerText, setComposerText] = useState("");
  const [provider, setProvider] = useState<ProviderChoice>("opencode");
  const [agent, setAgent] = useState<AgentChoice>("primary");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiGet(`${apiBaseUrl}/api/sessions`, (input) => {
        const value = input as { sessions?: unknown[] };
        return SessionSummarySchema.array().parse(value.sessions ?? []);
      });
      setSessions(payload);
      if (!activeSessionId && payload.length > 0) {
        setActiveSessionId(payload[0]?.id ?? null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, apiBaseUrl]);

  const loadMessages = useCallback(async () => {
    if (!activeSessionId) return;
    setError(null);
    try {
      const payload = await apiGet(`${apiBaseUrl}/api/sessions/${activeSessionId}/messages`, (input) => {
        const value = input as { messages?: unknown[] };
        return MessageSchema.array().parse(value.messages ?? []);
      });
      setMessages(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load messages");
    }
  }, [activeSessionId, apiBaseUrl]);

  const handleCreateSession = useCallback(async () => {
    if (!sessionTitleInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await apiPost(
        `${apiBaseUrl}/api/sessions`,
        { title: sessionTitleInput.trim() },
        (input) => {
          const value = input as { session?: unknown };
          return SessionSummarySchema.parse(value.session);
        },
      );
      setSessionTitleInput("");
      setSessions((current) => [payload, ...current]);
      setActiveSessionId(payload.id);
      setTab("chat");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, sessionTitleInput]);

  const handleSendMessage = useCallback(async () => {
    if (!activeSessionId || !composerText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost(
        `${apiBaseUrl}/api/sessions/${activeSessionId}/messages`,
        {
          text: composerText.trim(),
          provider,
          agent,
        },
        (input) => input,
      );
      setComposerText("");
      await loadMessages();
      await loadSessions();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, agent, apiBaseUrl, composerText, loadMessages, loadSessions, provider]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <Text style={styles.title}>BloxBot Mobile Companion</Text>
        <Text style={styles.subtitle}>
          iOS/Android session control with desktop handoff for Studio-only actions.
        </Text>

        <View style={styles.tabRow}>
          {(["sessions", "chat", "settings"] as AppTab[]).map((item) => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={[styles.tabButton, tab === item ? styles.tabButtonActive : null]}
            >
              <Text style={styles.tabText}>{item.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {tab === "sessions" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Create Session</Text>
            <TextInput
              value={sessionTitleInput}
              onChangeText={setSessionTitleInput}
              placeholder="New session title"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <Pressable
              onPress={() => void handleCreateSession()}
              disabled={loading}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>{loading ? "Working..." : "Create Session"}</Text>
            </Pressable>

            <Text style={styles.panelTitle}>Session List</Text>
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setActiveSessionId(item.id);
                    setTab("chat");
                  }}
                  style={[
                    styles.sessionCard,
                    activeSessionId === item.id ? styles.sessionCardActive : null,
                  ]}
                >
                  <Text style={styles.sessionTitle}>{item.title}</Text>
                  <Text style={styles.sessionMeta}>
                    Updated {new Date(item.updatedAt).toLocaleString()}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        {tab === "chat" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>
              {activeSession ? `Chat: ${activeSession.title}` : "Select a session first"}
            </Text>
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.messageBubble,
                    item.role === "user" ? styles.messageUser : styles.messageAssistant,
                  ]}
                >
                  <Text style={styles.messageRole}>{item.role.toUpperCase()}</Text>
                  <Text style={styles.messageText}>{item.text}</Text>
                </View>
              )}
            />
            <TextInput
              value={composerText}
              onChangeText={setComposerText}
              placeholder="Type your message"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
            <Pressable
              onPress={() => void handleSendMessage()}
              disabled={!activeSessionId || loading}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>{loading ? "Working..." : "Send"}</Text>
            </Pressable>
          </View>
        ) : null}

        {tab === "settings" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Connection</Text>
            <TextInput
              value={apiBaseUrl}
              onChangeText={setApiBaseUrl}
              placeholder={DEFAULT_API_BASE_URL}
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />

            <Text style={styles.panelTitle}>Provider</Text>
            <View style={styles.choiceRow}>
              {(["opencode", "anthropic", "openai", "google"] as ProviderChoice[]).map((choice) => (
                <Pressable
                  key={choice}
                  onPress={() => setProvider(choice)}
                  style={[styles.choiceButton, provider === choice ? styles.choiceButtonActive : null]}
                >
                  <Text style={styles.choiceText}>{choice}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.panelTitle}>Agent</Text>
            <View style={styles.choiceRow}>
              {(["primary", "planner", "builder"] as AgentChoice[]).map((choice) => (
                <Pressable
                  key={choice}
                  onPress={() => setAgent(choice)}
                  style={[styles.choiceButton, agent === choice ? styles.choiceButtonActive : null]}
                >
                  <Text style={styles.choiceText}>{choice}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.desktopNotice}>
              <Text style={styles.desktopNoticeTitle}>Desktop required for Studio edits</Text>
              <Text style={styles.desktopNoticeText}>
                Mobile supports chat, sessions, and planning. Direct Roblox Studio mutation stays on
                desktop.
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: "#020617",
    gap: 10,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 12,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#2563EB",
  },
  tabText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600",
  },
  panel: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  panelTitle: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    backgroundColor: "#111827",
    color: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionText: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  sessionCard: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    backgroundColor: "#111827",
    padding: 10,
    marginBottom: 8,
  },
  sessionCardActive: {
    borderColor: "#2563EB",
  },
  sessionTitle: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  sessionMeta: {
    color: "#94A3B8",
    fontSize: 11,
  },
  messageBubble: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  messageUser: {
    backgroundColor: "#1D4ED8",
  },
  messageAssistant: {
    backgroundColor: "#1E293B",
  },
  messageRole: {
    color: "#BFDBFE",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  messageText: {
    color: "#F8FAFC",
    fontSize: 13,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceButton: {
    backgroundColor: "#1E293B",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  choiceButtonActive: {
    backgroundColor: "#2563EB",
  },
  choiceText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "500",
  },
  desktopNotice: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#111827",
    padding: 10,
    gap: 4,
  },
  desktopNoticeTitle: {
    color: "#F8FAFC",
    fontWeight: "700",
  },
  desktopNoticeText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  errorText: {
    color: "#F87171",
    fontSize: 12,
  },
});
