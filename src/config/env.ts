import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV:            z.enum(['development', 'production', 'test']),
  PORT:                z.coerce.number().default(5000),
  DATABASE_URL:        z.url(),
  JWT_SECRET:          z.string().min(32),
  JWT_EXPIRES_IN:      z.string().default('7d'),
  RESEND_API_KEY:      z.string(),
  CLIENT_URL:          z.url(),
  CLOUDFLARE_R2_URL:   z.string(),
  GOOGLE_CLIENT_ID:    z.string(),
  GOOGLE_CLIENT_SECRET:z.string(),
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