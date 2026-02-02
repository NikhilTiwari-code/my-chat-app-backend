import { Router } from "express";
import {
	getMe,
	getAllUsers,
	searchUsersHandler,
	updateAvatarHandler,
	updateProfileHandler,
	updateStatusHandler
} from "./users.controller";
import { authMiddleware } from "../../middlewares/auth";

export const usersRouter = Router();

usersRouter.get("/me", authMiddleware, getMe);
usersRouter.get("/all", authMiddleware, getAllUsers);
usersRouter.get("/search", authMiddleware, searchUsersHandler);
usersRouter.post("/status", authMiddleware, updateStatusHandler);
usersRouter.patch("/profile", authMiddleware, updateProfileHandler);
usersRouter.post("/avatar", authMiddleware, updateAvatarHandler);
