import { Router } from "express";
import {
  forgotPassword,
  loginUser,
  refreshToken,
  registerUser,
  resetPassword,
  verifyEmail,
} from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.post("/verify-email", verifyEmail);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);

authRouter.get("/refresh", refreshToken);

export default authRouter;
