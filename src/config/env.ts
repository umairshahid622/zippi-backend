import { z } from 'zod'

// src/config/env.ts
const envSchema = z.object({
  NODE_ENV:               z.enum(['development', 'production', 'test']).default('development'),
  PORT:                   z.coerce.number().default(5000),
  DATABASE_URL:           z.string(),
  BASE_URL:               z.string(),
  JWT_SECRET:             z.string().min(32),
  JWT_EXPIRES_IN:         z.string().default('1h'),
  JWT_REFRESH_SECRET:     z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  RESEND_API_KEY:         z.string().optional(),   // ← optional for local dev
  CLIENT_URL:             z.string().optional(),   // ← optional for local dev
  CLOUDFLARE_R2_URL:      z.string().optional(),   // ← optional for local dev
  GOOGLE_CLIENT_ID:       z.string(),
  GOOGLE_CLIENT_SECRET:   z.string().optional(),
})

// Throws at startup if any env var is missing — 
// better to crash early than fail silently in production
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data