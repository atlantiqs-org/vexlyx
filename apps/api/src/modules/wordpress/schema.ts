import { z } from "zod";

export const ProjectIdParamSchema = z.object({
  id: z.string().min(1, "Project ID is required"),
});

export type ProjectIdParam = z.infer<typeof ProjectIdParamSchema>;

export const WordPressInstallSchema = z.object({
  dbName: z.string().max(100).default("wordpress"),
  dbUser: z.string().max(100).default("root"),
  dbPassword: z.string().max(255).default(""),
  dbHost: z.string().max(255).default("localhost"),
  dbPrefix: z.string().max(20).default("wp_"),
  downloadCore: z.boolean().default(true),
});

export type WordPressInstallInput = z.infer<typeof WordPressInstallSchema>;

export const WordPressUploadSchema = z.object({
  assetType: z.enum(["plugin", "theme"]),
  zipBase64: z.string().min(1, "ZIP file content as Base64 is required"),
});

export type WordPressUploadInput = z.infer<typeof WordPressUploadSchema>;

export const WordPressImportSchema = z.object({
  tarPath: z.string().min(1, "Uploaded tar.gz path is required"),
  dbName: z.string().max(100).default("wordpress"),
  dbUser: z.string().max(100).default("root"),
  dbPassword: z.string().max(255).default(""),
  dbHost: z.string().max(255).default("localhost"),
});

export type WordPressImportInput = z.infer<typeof WordPressImportSchema>;

