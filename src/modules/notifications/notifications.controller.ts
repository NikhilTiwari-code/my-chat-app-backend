import { Request, Response } from "express";
import { listNotifications, markNotificationRead } from "./notifications.service";

export const listNotificationsHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const limit = Number(req.query.limit ?? 50);
  const cursor = req.query.cursor as string | undefined;
  const notifications = await listNotifications(req.user.id, limit, cursor);
  return res.json({ notifications });
};

export const markNotificationReadHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const notification = await markNotificationRead(req.params.id, req.user.id);
  return res.json({ notification });
};
