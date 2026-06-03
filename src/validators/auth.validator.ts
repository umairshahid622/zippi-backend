import { z } from 'zod'

export const sendMagicLinkSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
  }),
})

export const verifyOTPSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    otp: z
      .string()
      .length(6, 'OTP must be 6 digits')
      .regex(/^\d+$/, 'OTP must be numeric'),
  }),
})

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .min(2,  'Name must be at least 2 characters')
      .max(50, 'Name must be under 50 characters')
      .trim(),
    avatarUrl: z
      .string()
      .url('Invalid avatar URL')
      .optional(),
    handle: z
      .string()
      .min(2,  'Handle must be at least 2 characters')
      .max(30, 'Handle must be under 30 characters')
      .regex(/^[a-z0-9_]+$/, 'Handle can only contain lowercase letters, numbers and underscores')
      .optional(),
  }),
})

export type SendMagicLinkInput  = z.infer<typeof sendMagicLinkSchema>['body']
export type VerifyOTPInput      = z.infer<typeof verifyOTPSchema>['body']
export type UpdateProfileInput  = z.infer<typeof updateProfileSchema>['body']