import { z } from 'zod';

export const ApiErrorPayloadSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string(),
  }),
});

export type ApiErrorPayload = z.infer<typeof ApiErrorPayloadSchema>;

export const ApiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z
      .object({
        nextCursor: z.string().nullable().optional(),
        totalCount: z.number().optional(),
      })
      .optional(),
  });
