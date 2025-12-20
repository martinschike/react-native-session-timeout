import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import {
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verificationEmailSchema,
} from "../validators/auth.validator";
import {
  forgotPasswordService,
  loginService,
  logoutService,
  refreshTokenService,
  registerService,
  resetPasswordService,
  verifyEmailService,
} from "../services/auth.service";
import {
  clearAuthenticationCookies,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthenticationCookies,
} from "../utils/cookie";
import {
  NotFoundException,
  UnauthorizedException,
} from "../utils/catch-errors";

export const registerUser = asyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const body = registerSchema.parse(req.body);

    const { user } = await registerService(body);

    return res.status(HTTPSTATUS.CREATED).json({
      message: "User registered successfully",
      user,
    });
  }
);

export const loginUser = asyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const userAgent = req.headers["user-agent"];
    const body = loginSchema.parse({
      ...req.body,
      userAgent,
    });

    const { user, accessToken, refreshToken, mfaRequired } =
      await loginService(body);

    return setAuthenticationCookies({
      res,
      accessToken,
      refreshToken,
    })
      .status(HTTPSTATUS.OK)
      .json({
        message: "User logged in successfully",
        mfaRequired,
        user,
      });
  }
);

export const refreshToken = asyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const refreshToken = req.cookies.refreshToken as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }

    const { accessToken, newRefreshToken } =
      await refreshTokenService(refreshToken);

    if (newRefreshToken) {
      res.cookie(
        "refreshToken",
        newRefreshToken,
        getRefreshTokenCookieOptions()
      );
    }

    return res
      .status(HTTPSTATUS.OK)
      .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
      .json({
        message: "Refresh access token successfully",
      });
  }
);

export const verifyEmail = asyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { code } = verificationEmailSchema.parse(req.body);

    await verifyEmailService(code);

    return res.status(HTTPSTATUS.OK).json({
      message: "Email verified successfully",
    });
  }
);

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const email = emailSchema.parse(req.body.email);
    await forgotPasswordService(email);

    return res.status(HTTPSTATUS.OK).json({
      message: "Password reset email sent",
    });
  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const body = resetPasswordSchema.parse(req.body);

    await resetPasswordService(body);

    return clearAuthenticationCookies(res).status(HTTPSTATUS.OK).json({
      message: "Reset Password successfully",
    });

    return res.status(HTTPSTATUS.OK).json({
      message: "Password reset success",
    });
  }
);

export const logout = asyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const sessionId = req.sessionId;
    if (!sessionId) {
      throw new NotFoundException("Session is invalid.");
    }
    await logoutService(sessionId);
    return clearAuthenticationCookies(res).status(HTTPSTATUS.OK).json({
      message: "User logout successfully",
    });
  }
);
