import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth";
import { uploadMedia } from "./media.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

export const mediaRouter = Router();

mediaRouter.use(authMiddleware);
mediaRouter.post("/upload", upload.single("file"), uploadMedia);
