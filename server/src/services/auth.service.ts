import { ErrorCode } from "../enums/error-code-enum";
import { VerificationEnum } from "../enums/verification-code-enum";
import SessionModel from "../models/session.model";
import UserModel from "../models/user.model";
import VerificationCodeModel from "../models/verification.model";
import {
  BadRequestException,
  HttpException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from "../utils/catch-errors";
import {
  ONE_DAY_IN_MS,
  anHourFromNow,
  calculateExpirationDate,
  fortyFiveMinutesFromNow,
  threeMinutesAgo,
} from "../utils/date-time";
import {
  LoginSchemaType,
  RegisterSchemaType,
  ResetPasswordSchemaType,
} from "../validators/auth.validator";
import { config } from "dotenv";
import { Env } from "../config/env.config";
import {
  RefreshTPayload,
  refreshTokenSignOptions,
  signJwtToken,
  verifyJwtToken,
} from "../utils/jwt";
import { sendEmail } from "../config/mailer";
import {
  passwordResetTemplate,
  verifyEmailTemplate,
} from "../template/template";
import { HTTPSTATUS } from "../config/http.config";
import { hashValue } from "../utils/bcrypt";

export const registerService = async (registerDto: RegisterSchemaType) => {
  const { name, email, password } = registerDto;

  const existingUser = await UserModel.exists({
    email,
  });

  if (existingUser) {
    throw new BadRequestException(
      "User with this email already exists",
      ErrorCode.AUTH_EMAIL_ALREADY_EXISTS
    );
  }

  const newUser = await UserModel.create({
    name,
    email,
    password,
  });

  const userId = newUser._id;

  const verification = await VerificationCodeModel.create({
    userId,
    type: VerificationEnum.EMAIL_VERIFICATION,
    expiresAt: fortyFiveMinutesFromNow(),
  });

  // Sending verification email link
  const verificationUrl = `${Env.FRONTEND_ORIGIN}/confirm-account?code=${verification.code}`;
  await sendEmail({
    to: newUser.email,
    ...verifyEmailTemplate(verificationUrl),
  });

  return {
    user: newUser,
  };
};

export const loginService = async (loginDto: LoginSchemaType) => {
  const { email, password, userAgent } = loginDto;

  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new BadRequestException(
      "Invalid email or password",
      ErrorCode.AUTH_USER_NOT_FOUND
    );
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new BadRequestException(
      "Invalid email or password",
      ErrorCode.AUTH_USER_NOT_FOUND
    );
  }

  // Check if the user enabled 2fa, return user = null

  const session = await SessionModel.create({
    userId: user._id,
    userAgent,
  });

  const accessToken = signJwtToken({
    userId: user._id,
    sessionId: session._id,
  });

  const refreshToken = signJwtToken(
    {
      sessionId: session._id,
    },
    refreshTokenSignOptions
  );

  return {
    user,
    accessToken,
    refreshToken,
    mfaRequired: false,
  };
};

export const refreshTokenService = async (refreshToken: string) => {
  const { payload } = verifyJwtToken<RefreshTPayload>(refreshToken, {
    secret: refreshTokenSignOptions.secret,
  });

  if (!payload) {
    throw new UnauthorizedException("Invalid refresh token");
  }

  const session = await SessionModel.findById(payload.sessionId);
  const now = Date.now();

  if (!session) {
    throw new UnauthorizedException("Session does not exist");
  }

  if (session.expiredAt.getTime() <= now) {
    throw new UnauthorizedException("Session expired");
  }

  const sessionRequireRefresh =
    session.expiredAt.getTime() - now <= ONE_DAY_IN_MS;

  if (sessionRequireRefresh) {
    session.expiredAt = calculateExpirationDate(Env.JWT_REFRESH_EXPIRES_IN);
    await session.save();
  }

  const newRefreshToken = sessionRequireRefresh
    ? signJwtToken(
        {
          sessionId: session._id,
        },
        refreshTokenSignOptions
      )
    : undefined;

  const accessToken = signJwtToken({
    userId: session.userId,
    sessionId: session._id,
  });

  return {
    accessToken,
    newRefreshToken,
  };
};

export const verifyEmailService = async (code: string) => {
  const validCode = await VerificationCodeModel.findOne({
    code: code,
    type: VerificationEnum.EMAIL_VERIFICATION,
    expiresAt: { $gt: new Date() },
  });

  if (!validCode) {
    throw new BadRequestException("Invalid or expired verification code");
  }

  const updatedUser = await UserModel.findByIdAndUpdate(
    validCode.userId,
    {
      isEmailVerified: true,
    },
    { new: true }
  );

  if (!updatedUser) {
    throw new BadRequestException(
      "Unable to verify email address",
      ErrorCode.VALIDATION_ERROR
    );
  }

  await validCode.deleteOne();

  return {
    user: updatedUser,
  };
};

export const forgotPasswordService = async (email: string) => {
  const user = await UserModel.findOne({
    email: email,
  });

  if (!user) {
    throw new NotFoundException("User not found");
  }

  //check mail rate limit is 2 emails per 3 or 10 min
  const timeAgo = threeMinutesAgo();
  const maxAttempts = 2;

  const count = await VerificationCodeModel.countDocuments({
    userId: user._id,
    type: VerificationEnum.PASSWORD_RESET,
    createdAt: { $gt: timeAgo },
  });

  if (count >= maxAttempts) {
    throw new HttpException(
      "Too many request, try again later",
      HTTPSTATUS.TOO_MANY_REQUESTS,
      ErrorCode.AUTH_TOO_MANY_ATTEMPTS
    );
  }

  const expiresAt = anHourFromNow();
  const validCode = await VerificationCodeModel.create({
    userId: user._id,
    type: VerificationEnum.PASSWORD_RESET,
    expiresAt,
  });

  const resetLink = `${Env.FRONTEND_ORIGIN}/reset-password?code=${
    validCode.code
  }&exp=${expiresAt.getTime()}`;

  const { data, error } = await sendEmail({
    to: user.email,
    ...passwordResetTemplate(resetLink),
  });

  if (!data?.id) {
    throw new InternalServerException(`${error?.name} ${error?.message}`);
  }

  return {
    url: resetLink,
    emailId: data.id,
  };
};

export const resetPasswordService = async ({
  password,
  verificationCode,
}: ResetPasswordSchemaType) => {
  const validCode = await VerificationCodeModel.findOne({
    code: verificationCode,
    type: VerificationEnum.PASSWORD_RESET,
    expiresAt: { $gt: new Date() },
  });

  if (!validCode) {
    throw new NotFoundException("Invalid or expired verification code");
  }

  const hashedPassword = await hashValue(password);

  const updatedUser = await UserModel.findByIdAndUpdate(validCode.userId, {
    password: hashedPassword,
  });

  if (!updatedUser) {
    throw new BadRequestException("Failed to reset password!");
  }

  await validCode.deleteOne();

  await SessionModel.deleteMany({
    userId: updatedUser._id,
  });

  return {
    user: updatedUser,
  };
};

export const logoutService = async (sessionId: string) => {
  return await SessionModel.findByIdAndDelete(sessionId);
};
