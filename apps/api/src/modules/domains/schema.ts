import { z } from "zod";
import {
  CreateDomainSchema,
  DomainListQuerySchema,
  HostnameSchema,
  DomainStatusSchema,
} from "@vexlyx/shared";

export { CreateDomainSchema, DomainListQuerySchema, HostnameSchema, DomainStatusSchema };

export const DomainIdParamSchema = z.object({
  id: z.string().min(1, "Domain ID is required"),
});

export type DomainIdParam = z.infer<typeof DomainIdParamSchema>;

export const VerifyDomainQuerySchema = z.object({
  mockRecord: z.string().optional(),
  mock: z.enum(["true", "false"]).optional(),
});

export type VerifyDomainQuery = z.infer<typeof VerifyDomainQuerySchema>;
