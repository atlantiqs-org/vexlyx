import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums (mirrors Prisma DomainStatus)
// ---------------------------------------------------------------------------

export const DomainStatusSchema = z.enum(["PENDING", "ACTIVE", "ERROR"]);
export type DomainStatus = z.infer<typeof DomainStatusSchema>;

// ---------------------------------------------------------------------------
// Hostname validator
// ---------------------------------------------------------------------------

/**
 * Validates a Fully Qualified Domain Name (FQDN) according to RFC 1123.
 * Accepts standard domains and subdomains (e.g. example.com, app.example.com, test.co.uk).
 * Forbids protocols, paths, ports, IP addresses, and invalid characters.
 */
export const HostnameSchema = z
  .string()
  .min(3, "Hostname must be at least 3 characters")
  .max(253, "Hostname cannot exceed 253 characters")
  .toLowerCase()
  .trim()
  .refine((val) => !val.includes("://"), {
    message: "Do not include http:// or https:// in hostname",
  })
  .refine((val) => !val.includes("/") && !val.includes(":") && !val.includes(" "), {
    message: "Hostname cannot contain slashes, ports, or whitespace",
  })
  .refine(
    (val) => {
      // Regex for valid domain labels separated by dots
      const fqdnRegex =
        /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
      return fqdnRegex.test(val);
    },
    {
      message: "Must be a valid domain or subdomain (e.g. example.com or app.example.com)",
    },
  );

// ---------------------------------------------------------------------------
// Create Domain
// ---------------------------------------------------------------------------

export const CreateDomainSchema = z.object({
  hostname: HostnameSchema,
  projectId: z.string().min(1, "Project ID is required").optional().nullable(),
});

export type CreateDomainInput = z.infer<typeof CreateDomainSchema>;

// ---------------------------------------------------------------------------
// List Query
// ---------------------------------------------------------------------------

export const DomainListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  projectId: z.string().optional(),
  status: DomainStatusSchema.optional(),
  search: z.string().max(100).optional(),
});

export type DomainListQuery = z.infer<typeof DomainListQuerySchema>;

// ---------------------------------------------------------------------------
// Verification instructions & result types
// ---------------------------------------------------------------------------

export interface DomainVerificationInstructions {
  recordType: "TXT";
  recordName: string;
  recordValue: string;
}

export interface DomainVerificationResult {
  verified: boolean;
  status: DomainStatus;
  message: string;
  expectedRecord: DomainVerificationInstructions;
  detectedRecords?: string[];
}

export interface DomainResponse {
  id: string;
  hostname: string;
  status: DomainStatus;
  sslEnabled: boolean;
  userId: string;
  projectId: string | null;
  verificationToken: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  project?: {
    id: string;
    name: string;
    type: string;
    status: string;
  } | null;
  verificationInstructions?: DomainVerificationInstructions;
}
