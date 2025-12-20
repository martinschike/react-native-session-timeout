import { Request } from "express";
import { UserDocument } from "../models/user.model";

declare global {
  namespace Express {
    interface User extends UserDocument {}
    interface Request {
      sessionId?: string;
    }
  }
}
