import { z } from "@hono/zod-openapi";

export const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
export const VALID_TYPES = ["image/jpeg", "image/png"];

export const errorResponseSchema = z.object({
  error: z.string(),
});

export const baseDocumentSchema = z.object({
  url: z.string().url({ message: "Invalid URL format" }).optional().nullable(),
  desc: z.string().optional().nullable(),
});
export type BaseDocumentType = z.infer<typeof baseDocumentSchema>;

export class ImageValidationError extends Error {}
