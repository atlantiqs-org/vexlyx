import { z } from "zod";
export {
  GitHubPushPayloadSchema,
  GitHubPingPayloadSchema,
} from "@vexlyx/shared";
export type {
  GitHubPushPayload,
  GitHubPingPayload,
  GitHubWebhookResponse,
  RotateWebhookSecretResponse,
} from "@vexlyx/shared";

export const GitHubWebhookQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
});

export type GitHubWebhookQuery = z.infer<typeof GitHubWebhookQuerySchema>;

export const GitHubWebhookParamsSchema = z.object({
  projectId: z.string().min(1).optional(),
});

export type GitHubWebhookParams = z.infer<typeof GitHubWebhookParamsSchema>;
