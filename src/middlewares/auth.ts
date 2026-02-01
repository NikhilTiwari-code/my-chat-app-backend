import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
