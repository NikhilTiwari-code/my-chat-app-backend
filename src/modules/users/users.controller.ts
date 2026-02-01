import { Request, Response } from "express";
import { getUserById, searchUsers, updateUserAvatar, updateUserProfile, updateUserStatus } from "./users.service";
import { updateAvatarSchema, updateProfileSchema } from "./users.validation";

export const getMe = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ user });
};

export const searchUsersHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const query = String(req.query.q ?? "").trim();
  if (!query) {
    return res.json({ users: [] });
  }

  const limit = Number(req.query.limit ?? 20);
  const users = await searchUsers(query, limit);
  return res.json({ users });
};

export const updateStatusHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const status = typeof req.body?.status === "string" ? req.body.status : null;
  const updated = await updateUserStatus(req.user.id, status);
  return res.json({ status: updated });
};

export const updateProfileHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const data = updateProfileSchema.parse(req.body);
  const user = await updateUserProfile(req.user.id, data);
  return res.json({ user });
};

export const updateAvatarHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const data = updateAvatarSchema.parse(req.body);
  const user = await updateUserAvatar(req.user.id, data.avatarUrl);
  return res.json({ user });
};
