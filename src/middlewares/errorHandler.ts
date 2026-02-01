import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.errors.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });
  }

  const status = (err as any).status ?? 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
};
