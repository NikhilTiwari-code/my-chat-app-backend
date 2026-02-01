import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import { listNotificationsHandler, markNotificationReadHandler } from "./notifications.controller";

export const notificationsRouter = Router();

notificationsRouter.use(authMiddleware);

notificationsRouter.get("/", listNotificationsHandler);
notificationsRouter.post("/:id/read", markNotificationReadHandler);
