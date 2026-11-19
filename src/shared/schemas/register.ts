import { z } from "@hono/zod-openapi";

// The companies of open business registers, as the scrapper's registers tool keeps them in the store
// and the processor's directory reads them (companies FR-6, FR-7). Never a person: the tool leaves
// sole traders and withheld records out before writing.
export const REGISTERS = ["brreg", "sirene", "diba"] as const;
export const RegisterId = z.enum(REGISTERS);
export type RegisterId = z.infer<typeof RegisterId>;

export const RegisterCompany = z.strictObject({
  // The register's own number for the company.
  id: z.string().min(1),
  name: z.string().trim().min(1),
  // ISO 3166-1 alpha-2, lower case.
  country: z.string().regex(/^[a-z]{2}$/),
  town: z.string(),
  // The NUTS 3 unit its municipality is in ("" when the LAU table does not place it).
  nuts: z.string(),
  // Its NACE (or national) activity code, digits only.
  nace: z.string(),
  // The people it employs at least, when the register says.
  people: z.int().positive().optional(),
  website: z.string().optional(),
});
export type RegisterCompany = z.infer<typeof RegisterCompany>;

export const RegisterFile = z.strictObject({
  version: z.literal(1),
  register: RegisterId,
  savedAt: z.iso.datetime(),
  licence: z.string().min(1),
  credit: z.string().min(1),
  companies: z.array(RegisterCompany),
});
export type RegisterFile = z.infer<typeof RegisterFile>;
