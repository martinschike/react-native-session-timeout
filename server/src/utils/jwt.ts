import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import { UserDocument } from "../models/user.model";
import { SessionDocument } from "../models/session.model";
import { Env } from "../config/env.config";

export type AccessTPayload = {
  userId: UserDocument["_id"];
  sessionId: SessionDocument["_id"];
};

export type RefreshTPayload = {
  sessionId: SessionDocument["_id"];
};

type SignOptsAndSecret = SignOptions & {
  secret: string;
};

type VerifyOptsAndSecret = VerifyOptions & {
  secret: string;
};

// SignOptions allows string[]
const signDefaults: SignOptions = {
  audience: ["user"],
};

// VerifyOptions requires a non-empty tuple
const verifyDefaults: VerifyOptions = {
  audience: ["user"] as [string, ...string[]],
};

export const accessTokenSignOptions: SignOptsAndSecret = {
  expiresIn: Env.JWT_EXPIRES_IN,
  secret: Env.JWT_SECRET,
};

export const refreshTokenSignOptions: SignOptsAndSecret = {
  expiresIn: Env.JWT_REFRESH_EXPIRES_IN,
  secret: Env.JWT_REFRESH_SECRET,
};

export const signJwtToken = (
  payload: AccessTPayload | RefreshTPayload,
  options: SignOptsAndSecret = accessTokenSignOptions
): string => {
  const { secret, ...opts } = options;

  return jwt.sign(payload, secret, {
    ...signDefaults,
    ...opts,
  });
};

export const verifyJwtToken = <TPayload extends object = AccessTPayload>(
  token: string,
  options: Partial<VerifyOptsAndSecret> = {}
): { payload?: TPayload; error?: string } => {
  try {
    const { secret = Env.JWT_SECRET, ...opts } = options;

    const payload = jwt.verify(token, secret, {
      ...verifyDefaults,
      ...opts,
    }) as unknown as TPayload;

    return { payload };
  } catch (err) {
    return { error: (err as Error).message };
  }
};
