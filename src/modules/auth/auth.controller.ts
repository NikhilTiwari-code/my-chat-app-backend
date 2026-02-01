import { Request, Response } from "express";
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from "./auth.validation";
import { loginUser, logoutUser, refreshTokens, registerUser } from "./auth.service";

export const register = async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);
  const result = await registerUser(data.email, data.username, data.password);
  res.status(201).json({
    user: { id: result.user.id, email: result.user.email, username: result.user.username },
    accessToken: result.accessToken,
    refreshToken: result.refreshToken
  });
};

export const login = async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);
  const result = await loginUser(data.identifier, data.password);
  res.json({
    user: { id: result.user.id, email: result.user.email, username: result.user.username },
    accessToken: result.accessToken,
    refreshToken: result.refreshToken
  });
};

export const refresh = async (req: Request, res: Response) => {
  const data = refreshSchema.parse(req.body);
  const result = await refreshTokens(data.refreshToken);
  res.json(result);
};

export const logout = async (req: Request, res: Response) => {
  const data = logoutSchema.parse(req.body);
  const result = await logoutUser(data.refreshToken);
  res.json(result);
};
