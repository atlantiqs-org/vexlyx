import { z } from "zod";

/**
 * Validates a single forwarding destination address.
 */
export const AliasDestinationSchema = z.string().email("Must be a valid email address");

/**
 * Schema validating new alias creation requests. A catch-all alias omits
 * `localPart`; a regular forwarding alias requires it.
 */
export const CreateAliasSchema = z
  .object({
    localPart: z
      .string()
      .max(64, "Local part is too long")
      .regex(/^[a-z0-9][a-z0-9._-]*$/, "Only lowercase letters, numbers, dots, hyphens, and underscores allowed")
      .optional(),
    isCatchAll: z.boolean().default(false),
    domainId: z.string().min(1, "Domain is required"),
    destinations: z
      .array(AliasDestinationSchema)
      .min(1, "At least one destination is required")
      .max(20, "Too many destinations"),
  })
  .superRefine((data, ctx) => {
    if (data.isCatchAll && data.localPart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["localPart"],
        message: "Catch-all aliases cannot have a local part",
      });
    }
    if (!data.isCatchAll && !data.localPart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["localPart"],
        message: "Local part is required unless this is a catch-all alias",
      });
    }
  });

export type CreateAliasInput = z.infer<typeof CreateAliasSchema>;

/**
 * Schema validating alias destination updates.
 */
export const UpdateAliasDestinationsSchema = z.object({
  destinations: z
    .array(AliasDestinationSchema)
    .min(1, "At least one destination is required")
    .max(20, "Too many destinations"),
});

export type UpdateAliasDestinationsInput = z.infer<typeof UpdateAliasDestinationsSchema>;

/**
 * Schema for the alias list query filter.
 */
export const AliasListQuerySchema = z.object({
  domainId: z.string().optional(),
});

export type AliasListQuery = z.infer<typeof AliasListQuerySchema>;

/**
 * Schema representing an alias in API responses.
 */
export const AliasSchema = z.object({
  id: z.string(),
  source: z.string(),
  localPart: z.string().nullable(),
  domainId: z.string(),
  hostname: z.string(),
  destinations: z.array(z.string()),
  isCatchAll: z.boolean(),
  createdAt: z.string(),
});

export type AliasResponse = z.infer<typeof AliasSchema>;
