import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import {
  CapabilitySchema,
  CreateSessionRequestSchema,
  MessageSchema,
  SendMessageRequestSchema,
  SessionEventSchema,
  SessionSummarySchema,
  type SessionEvent,
  type SessionSummary,
} from "@bloxbot/contracts";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const port = Number(process.env.PORT ?? 8787);

const capabilityResponse = {
  capabilities: CapabilitySchema.array().parse([
    "chat",
    "sessions",
    "provider-auth",
    "model-selection",
    "playtest-readonly",
    "studio-editing-desktop-only",
  ]),
};

const sessions = new Map<string, SessionSummary>();
const messagesBySession = new Map<string, Array<ReturnType<typeof MessageSchema.parse>>>();
const streamClients = new Map<string, Set<express.Response>>();

function nowIso() {
  return new Date().toISOString();
}

function publishEvent(event: SessionEvent) {
  const listeners = streamClients.get(event.sessionId);
  if (!listeners || listeners.size === 0) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const response of listeners) {
    response.write(payload);
  }
}

function createSession(title: string) {
  const createdAt = nowIso();
  const session = SessionSummarySchema.parse({
    id: randomUUID(),
    title,
    createdAt,
    updatedAt: createdAt,
  });
  sessions.set(session.id, session);
  messagesBySession.set(session.id, []);
  return session;
}

function createMessage(sessionId: string, role: "user" | "assistant", text: string) {
  const message = MessageSchema.parse({
    id: randomUUID(),
    sessionId,
    role,
    text,
    createdAt: nowIso(),
  });
  const existing = messagesBySession.get(sessionId) ?? [];
  existing.push(message);
  messagesBySession.set(sessionId, existing);
  return message;
}

function touchSession(sessionId: string) {
  const existing = sessions.get(sessionId);
  if (!existing) return null;
  const next = SessionSummarySchema.parse({
    ...existing,
    updatedAt: nowIso(),
  });
  sessions.set(sessionId, next);
  return next;
}

app.get("/health", (_request, response) => {
  response.json({ status: "ok", timestamp: nowIso() });
});

app.get("/api/capabilities", (_request, response) => {
  response.json(capabilityResponse);
});

app.get("/api/sessions", (_request, response) => {
  const list = [...sessions.values()].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
  response.json({ sessions: list });
});

app.post("/api/sessions", (request, response) => {
  const body = CreateSessionRequestSchema.parse(request.body);
  const session = createSession(body.title);
  response.status(201).json({ session });
});

app.get("/api/sessions/:sessionId/messages", (request, response) => {
  const { sessionId } = request.params;
  if (!sessions.has(sessionId)) {
    response.status(404).json({ error: "Session not found" });
    return;
  }
  response.json({ messages: messagesBySession.get(sessionId) ?? [] });
});

app.post("/api/sessions/:sessionId/messages", (request, response) => {
  const { sessionId } = request.params;
  if (!sessions.has(sessionId)) {
    response.status(404).json({ error: "Session not found" });
    return;
  }

  const body = SendMessageRequestSchema.parse(request.body);
  const userMessage = createMessage(sessionId, "user", body.text);
  const updated = touchSession(sessionId);
  if (updated) {
    publishEvent(
      SessionEventSchema.parse({
        event: "session.updated",
        sessionId,
        timestamp: nowIso(),
        payload: { session: updated },
      }),
    );
  }
  publishEvent(
    SessionEventSchema.parse({
      event: "message.created",
      sessionId,
      timestamp: nowIso(),
      payload: { message: userMessage },
    }),
  );

  const assistantMessage = createMessage(
    sessionId,
    "assistant",
    `Mobile companion backend received: ${body.text}`,
  );
  publishEvent(
    SessionEventSchema.parse({
      event: "message.created",
      sessionId,
      timestamp: nowIso(),
      payload: { message: assistantMessage },
    }),
  );
  response.status(201).json({ message: userMessage });
});

app.get("/api/sessions/:sessionId/events", (request, response) => {
  const { sessionId } = request.params;
  if (!sessions.has(sessionId)) {
    response.status(404).json({ error: "Session not found" });
    return;
  }

  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders();

  response.write(`event: ready\ndata: ${JSON.stringify({ sessionId })}\n\n`);

  const clients = streamClients.get(sessionId) ?? new Set<express.Response>();
  clients.add(response);
  streamClients.set(sessionId, clients);

  request.on("close", () => {
    const listeners = streamClients.get(sessionId);
    if (!listeners) return;
    listeners.delete(response);
    if (listeners.size === 0) streamClients.delete(sessionId);
  });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://127.0.0.1:${port}`);
});
