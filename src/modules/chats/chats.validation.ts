import { z } from "zod";

export const createConversationSchema = z.object({
  type: z.enum(["DIRECT", "GROUP"]).default("DIRECT"),
  title: z.string().optional(),
  participantIds: z.array(z.string().min(1)).min(1)
});

export const sendMessageSchema = z.object({
  content: z.string().min(1),
  type: z.enum(["TEXT", "IMAGE", "FILE"]).optional(),
  attachment: z
    .object({
      url: z.string().url(),
      type: z.string(),
      size: z.number().optional()
    })
    .optional()
});

export const messageStatusSchema = z.object({
  status: z.enum(["SENT", "DELIVERED", "READ"])
});

export const participantsSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(1)
});
