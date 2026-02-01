import { z } from "zod";

export const updateProfileSchema = z.object({
  status: z.string().min(1).max(120).optional(),
  username: z.string().min(3).max(32).optional()
});

export const updateAvatarSchema = z.object({
  avatarUrl: z.string().url()
});
