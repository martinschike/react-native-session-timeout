import {
  ExtractJwt,
  Strategy as JwtStrategy,
  StrategyOptionsWithRequest,
} from "passport-jwt";

import passport, { PassportStatic } from "passport";
import { UnauthorizedException } from "../src/utils/catch-errors";
import { ErrorCode } from "../src/enums/error-code-enum";
import { Env } from "../src/config/env.config";
import { findUserByIdService } from "../src/services/user.service";

interface JwtPayload {
  userId: string;
  sessionId: string;
}

const options: StrategyOptionsWithRequest = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => {
      const accessToken = req.cookies.accessToken;
      if (!accessToken) {
        throw new UnauthorizedException(
          "Unauthorized access token",
          ErrorCode.AUTH_TOKEN_NOT_FOUND
        );
      }
      return accessToken;
    },
  ]),
  secretOrKey: Env.JWT_SECRET,
  audience: ["user"],
  algorithms: ["HS256"],
  passReqToCallback: true,
};

export const setupJwtStrategy = (passport: PassportStatic) => {
  passport.use(
    new JwtStrategy(options, async (req, payload: JwtPayload, done) => {
      try {
        const user = await findUserByIdService(payload.userId);
        if (!user) {
          return done(null, false);
        }
        req.sessionId = payload.sessionId;
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    })
  );
};

export const authenticateJWT = passport.authenticate("jwt", { session: false });
