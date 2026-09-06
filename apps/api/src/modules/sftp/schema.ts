import { z } from "zod";

export const SftpProvisionBodySchema = z.object({});

export const SftpAddKeyBodySchema = z.object({
  publicKey: z
    .string()
    .min(20)
    .refine(
      (k) => k.startsWith("ssh-") || k.startsWith("ecdsa-") || k.startsWith("sk-"),
      { message: "Must be a valid SSH public key" },
    ),
});

export type SftpAddKeyBody = z.infer<typeof SftpAddKeyBodySchema>;
