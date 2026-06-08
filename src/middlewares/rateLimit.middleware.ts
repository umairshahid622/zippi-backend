import rateLimit from 'express-rate-limit'

// ── Install ───────────────────────────────────
// npm install express-rate-limit

// ── General API rate limit ────────────────────
// Applied to all routes globally
export const generalLimiter = rateLimit({
  windowMs:          15 * 60 * 1000,  // 15 minutes
  max:               100,              // 100 requests per 15 min per IP
  message: {
    message: 'Too many requests. Please try again later.',
    status:  429,
  },
  standardHeaders:   true,   // Return rate limit info in headers
  legacyHeaders:     false,
})

// ── Magic link rate limit ─────────────────────
// Strict — prevents OTP spam
export const magicLinkLimiter = rateLimit({
  windowMs:          60 * 60 * 1000,  // 1 hour
  max:               3,               // 3 OTP requests per hour per IP
  message: {
    message: 'Too many login attempts. Try again in an hour.',
    status:  429,
  },
  standardHeaders:   true,
  legacyHeaders:     false,
})

// ── OTP verify rate limit ─────────────────────
// Prevents brute forcing the 6-digit code
export const verifyOTPLimiter = rateLimit({
  windowMs:          15 * 60 * 1000,  // 15 minutes
  max:               5,               // 5 attempts per 15 min per IP
  message: {
    message: 'Too many verification attempts. Please request a new code.',
    status:  429,
  },
  standardHeaders:   true,
  legacyHeaders:     false,
})

// ── Auth general limit ────────────────────────
// Applied to all /api/auth routes
export const authLimiter = rateLimit({
  windowMs:          15 * 60 * 1000,  // 15 minutes
  max:               20,              // 20 auth requests per 15 min
  message: {
    message: 'Too many auth requests. Please slow down.',
    status:  429,
  },
  standardHeaders:   true,
  legacyHeaders:     false,
})

// ── Upload rate limit ─────────────────────────
// Prevents file upload abuse
export const uploadLimiter = rateLimit({
  windowMs:          60 * 60 * 1000,  // 1 hour
  max:               50,              // 50 uploads per hour per IP
  message: {
    message: 'Upload limit reached. Try again in an hour.',
    status:  429,
  },
  standardHeaders:   true,
  legacyHeaders:     false,
})