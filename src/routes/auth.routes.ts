import { Router }          from 'express'
import { AuthController }  from '../controllers/auth.controller.js'
import { authMiddleware }  from '../middlewares/auth.middleware.js'
import { validate }        from '../middlewares/validate.middleware.js'
import {
  sendMagicLinkSchema,
  verifyOTPSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js'

const router = Router()

// ── Passwordless ──────────────────────────────
// POST /api/auth/magic-link  → send OTP to email
router.post(
  '/magic-link',
  validate(sendMagicLinkSchema),
  AuthController.sendMagicLink
)

// POST /api/auth/verify  → verify OTP + issue JWT
router.post(
  '/verify',
  validate(verifyOTPSchema),
  AuthController.verifyOTP
)

// ── OAuth ─────────────────────────────────────
// GET /api/auth/google  → redirect to Google
router.get('/google', AuthController.googleAuth)

// GET /api/auth/google/callback  → Google redirects here
router.get('/google/callback', AuthController.googleCallback)

// GET /api/auth/github  → redirect to GitHub
router.get('/github', AuthController.githubAuth)

// GET /api/auth/github/callback  → GitHub redirects here
router.get('/github/callback', AuthController.githubCallback)

// ── Protected routes ──────────────────────────
// PATCH /api/auth/profile  → update name + avatar (onboarding)
router.patch(
  '/profile',
  authMiddleware,
  validate(updateProfileSchema),
  AuthController.updateProfile
)

// GET /api/auth/me  → get current user
router.get(
  '/me',
  authMiddleware,
  AuthController.getMe
)

// POST /api/auth/logout  → invalidate session
router.post(
  '/logout',
  authMiddleware,
  AuthController.logout
)

export default router