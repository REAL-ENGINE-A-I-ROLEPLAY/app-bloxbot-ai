import { z } from "zod";

export const CapabilitySchema = z.enum([
  "chat",
  "sessions",
  "provider-auth",
  "model-selection",
  "playtest-readonly",
  "studio-editing-desktop-only",
]);

export type Capability = z.infer<typeof CapabilitySchema>;

export const SessionSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SessionSummary = z.infer<typeof SessionSummarySchema>;

export const MessageRoleSchema = z.enum(["user", "assistant", "system"]);

export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  role: MessageRoleSchema,
  text: z.string(),
  createdAt: z.string().datetime(),
});

export type Message = z.infer<typeof MessageSchema>;

export const SessionEventSchema = z.object({
  event: z.enum(["session.updated", "message.created"]),
  sessionId: z.string().min(1),
  timestamp: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type SessionEvent = z.infer<typeof SessionEventSchema>;

export const CreateSessionRequestSchema = z.object({
  title: z.string().min(1).max(120),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const SendMessageRequestSchema = z.object({
  text: z.string().min(1).max(8_000),
});

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
