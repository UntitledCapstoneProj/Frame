import z from "zod";

export const payloadSchema = z
  .object({
    url: z.string().url().optional().nullable(),
    description: z.string().optional().nullable(),
  })
  .refine((data) => data.url || data.description, {
    message: "Either url or description must be provided.",
    path: ["url", "description"],
  });

const titanInputSchema = z.object({
  inputImage: z.string().optional(),
  inputText: z.string().optional(),
});

export type TitanInputType = z.infer<typeof titanInputSchema>;
