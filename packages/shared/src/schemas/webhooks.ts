import { z } from "zod";

// ---------------------------------------------------------------------------
// GitHub Webhook Payload Schemas
// ---------------------------------------------------------------------------

export const GitHubCommitAuthorSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  username: z.string().optional(),
});

export const GitHubCommitSchema = z.object({
  id: z.string(),
  message: z.string(),
  timestamp: z.string().optional(),
  url: z.string().optional(),
  author: GitHubCommitAuthorSchema.optional(),
  committer: GitHubCommitAuthorSchema.optional(),
  added: z.array(z.string()).optional(),
  removed: z.array(z.string()).optional(),
  modified: z.array(z.string()).optional(),
});

export const GitHubRepositorySchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  full_name: z.string().optional(),
  html_url: z.string().optional(),
  clone_url: z.string().optional(),
  default_branch: z.string().optional(),
});

export const GitHubPushPayloadSchema = z.object({
  ref: z.string(),
  before: z.string().optional(),
  after: z.string().optional(),
  repository: GitHubRepositorySchema.optional(),
  pusher: z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
  sender: z
    .object({
      login: z.string().optional(),
      avatar_url: z.string().optional(),
    })
    .optional(),
  head_commit: GitHubCommitSchema.nullable().optional(),
  commits: z.array(GitHubCommitSchema).optional(),
});

export type GitHubPushPayload = z.infer<typeof GitHubPushPayloadSchema>;

export const GitHubPingPayloadSchema = z.object({
  zen: z.string().optional(),
  hook_id: z.number().optional(),
  hook: z
    .object({
      type: z.string().optional(),
      id: z.number().optional(),
      active: z.boolean().optional(),
      events: z.array(z.string()).optional(),
    })
    .optional(),
  repository: GitHubRepositorySchema.optional(),
});

export type GitHubPingPayload = z.infer<typeof GitHubPingPayloadSchema>;

// ---------------------------------------------------------------------------
// Webhook Response Types
// ---------------------------------------------------------------------------

export interface GitHubWebhookResponse {
  success: boolean;
  message: string;
  deploymentId?: string;
  ignored?: boolean;
  reason?: string;
}

export interface RotateWebhookSecretResponse {
  webhookSecret: string;
  webhookUrl: string;
}
