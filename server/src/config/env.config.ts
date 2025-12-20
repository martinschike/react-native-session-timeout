import { getEnv } from "../utils/get-env";

type JwtDuration = `${number}${"s" | "m" | "h" | "d"}`;
const envConfig = () => ({
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: getEnv("PORT", "8000"),
  BASE_PATH: getEnv("BASE_PATH", "/api"),
  MONGO_URI: getEnv("MONGO_URI"),
  JWT_SECRET: getEnv("JWT_SECRET", "secret_jwt"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "15m") as JwtDuration,
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET", "secret_jwt_refresh"),
  JWT_REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", "7d") as JwtDuration,
  GEMINI_API_KEY: getEnv("GEMINI_API_KEY"),
  CLOUDINARY_CLOUD_NAME: getEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: getEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: getEnv("CLOUDINARY_API_SECRET"),
  RESEND_API_KEY: getEnv("RESEND_API_KEY"),
  MAILER_SENDER: getEnv("MAILER_SENDER"),
  FRONTEND_ORIGIN: getEnv("FRONTEND_ORIGIN", "localhost"),
});
export const Env = envConfig();
