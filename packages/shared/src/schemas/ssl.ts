import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums (mirrors Prisma CertType and CertStatus)
// ---------------------------------------------------------------------------

export const CertTypeSchema = z.enum(["LETS_ENCRYPT", "CUSTOM", "SELF_SIGNED"]);
export type CertType = z.infer<typeof CertTypeSchema>;

export const CertStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "EXPIRING_SOON",
  "EXPIRED",
  "ERROR",
]);
export type CertStatus = z.infer<typeof CertStatusSchema>;

// ---------------------------------------------------------------------------
// Certificate Upload Schema
// ---------------------------------------------------------------------------

export const UploadCertificateSchema = z.object({
  certificate: z
    .string()
    .min(10, "Certificate content is required")
    .refine(
      (val) => val.includes("BEGIN CERTIFICATE") && val.includes("END CERTIFICATE"),
      {
        message: "Invalid PEM format: Must contain 'BEGIN CERTIFICATE' and 'END CERTIFICATE'",
      },
    ),
  privateKey: z
    .string()
    .min(10, "Private key content is required")
    .refine(
      (val) => val.includes("BEGIN") && val.includes("KEY") && val.includes("END"),
      {
        message: "Invalid PEM format: Must contain a valid private key header (e.g. 'BEGIN PRIVATE KEY' or 'BEGIN RSA PRIVATE KEY')",
      },
    ),
  forceHttps: z.boolean().default(true),
});

export type UploadCertificateInput = z.infer<typeof UploadCertificateSchema>;

// ---------------------------------------------------------------------------
// SSL Provisioning & Settings Schemas
// ---------------------------------------------------------------------------

export const ProvisionSslSchema = z.object({
  type: CertTypeSchema.default("LETS_ENCRYPT"),
  forceHttps: z.boolean().default(true),
  autoRenew: z.boolean().default(true),
});

export type ProvisionSslInput = z.infer<typeof ProvisionSslSchema>;

export const UpdateSslSettingsSchema = z.object({
  forceHttps: z.boolean().optional(),
  autoRenew: z.boolean().optional(),
});

export type UpdateSslSettingsInput = z.infer<typeof UpdateSslSettingsSchema>;

// ---------------------------------------------------------------------------
// Response Types
// ---------------------------------------------------------------------------

export interface CertificateResponse {
  id: string;
  domainId: string;
  type: CertType;
  status: CertStatus;
  issuer: string | null;
  commonName: string;
  sans: string[];
  validFrom: string | Date | null;
  validTo: string | Date | null;
  daysRemaining: number | null;
  autoRenew: boolean;
  forceHttps: boolean;
  serialNumber: string | null;
  errorMessage: string | null;
  lastCheckedAt: string | Date | null;
  lastRenewedAt: string | Date | null;
  isExpiringSoon: boolean;
  isExpired: boolean;
}
