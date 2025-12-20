import { z } from "zod";

export const emailSchema = z.string().trim().email().min(1).max(255);

export const passwordSchema = z.string().trim().min(6).max(255);

export const verificationCodeSchema = z.string().trim().min(1).max(255);

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  userAgent: z.string().optional(),
});

export const verificationEmailSchema = z.object({
  code: verificationCodeSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  verificationCode: verificationCodeSchema,
});

export type RegisterSchemaType = z.infer<typeof registerSchema>;
export type LoginSchemaType = z.infer<typeof loginSchema>;
export type VerificationEmailSchemaType = z.infer<
  typeof verificationEmailSchema
>;
export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;
