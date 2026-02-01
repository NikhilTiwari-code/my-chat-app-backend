import { Router } from "express";
import { healthRouter } from "./health";
import { authRouter } from "../modules/auth/auth.routes";
import { usersRouter } from "../modules/users/users.routes";
import { chatsRouter } from "../modules/chats/chats.routes";
import { notificationsRouter } from "../modules/notifications/notifications.routes";
import { mediaRouter } from "../modules/media/media.routes";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/chats", chatsRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/media", mediaRouter);
