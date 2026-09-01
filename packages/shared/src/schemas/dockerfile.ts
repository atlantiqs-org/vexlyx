import { z } from "zod";

// ---------------------------------------------------------------------------
// Save / Update Dockerfile & .dockerignore schema
// ---------------------------------------------------------------------------

export const SaveDockerfileSchema = z.object({
  dockerfile: z.string().max(100000, "Dockerfile must be 100KB or smaller").optional(),
  dockerignore: z.string().max(50000, ".dockerignore must be 50KB or smaller").optional(),
  syncPort: z.boolean().default(false),
  port: z.number().int().min(1).max(65535).optional(),
});

export type SaveDockerfileInput = z.infer<typeof SaveDockerfileSchema>;

// ---------------------------------------------------------------------------
// Template info schema
// ---------------------------------------------------------------------------

export interface DockerfileTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  dockerfile: string;
  dockerignore: string;
  defaultPort: number;
}

// ---------------------------------------------------------------------------
// Dockerfile status & configuration metadata
// ---------------------------------------------------------------------------

export interface DockerfileStatus {
  hasDockerfile: boolean;
  hasDockerignore: boolean;
  filename: string;
  dockerfile: string;
  dockerignore: string;
  exposedPorts: number[];
  healthCheck: string | null;
  baseImage: string | null;
  entrypoint: string | null;
  cmd: string | null;
}
