import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { magicLinkLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  sendMagicLinkSchema,
  verifyOTPSchema,
  updateProfileSchema,
} from "../validators/auth.validator.js";

const router = Router();

/**
 * @openapi
 * /auth/magic-link:
 *   post:
 *     summary: Send a magic-link OTP to an email address
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Magic link sent successfully
 */
// ── Passwordless ──────────────────────────────
// POST /api/auth/magic-link  → send OTP to email
router.post(
  "/magic-link",
  magicLinkLimiter,
  validate(sendMagicLinkSchema),
  AuthController.sendMagicLink,
);

/**
 * @openapi
 * /auth/verify:
 *   post:
 *     summary: Verify a one-time password and issue a JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 length: 6
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */
// POST /api/auth/verify  → verify OTP + issue JWT
router.post("/verify", validate(verifyOTPSchema), AuthController.verifyOTP);

/**
 * @openapi
 * /auth/google:
 *   get:
 *     summary: Start Google OAuth login
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth provider
 */
// GET /api/auth/google  → redirect to Google
router.get("/google", AuthController.googleAuth);

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect back to the client after authentication
 */
// GET /api/auth/google/callback  → Google redirects here
router.get("/google/callback", AuthController.googleCallback);

/**
 * @openapi
 * /auth/github:
 *   get:
 *     summary: Start GitHub OAuth login
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to GitHub OAuth provider
 */
// GET /api/auth/github  → redirect to GitHub
router.get("/github", AuthController.githubAuth);

/**
 * @openapi
 * /auth/github/callback:
 *   get:
 *     summary: Handle GitHub OAuth callback
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect back to the client after authentication
 */
// GET /api/auth/github/callback  → GitHub redirects here
router.get("/github/callback", AuthController.githubCallback);

/**
 * @openapi
 * /auth/profile:
 *   patch:
 *     summary: Update the current user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
// ── Protected routes ──────────────────────────
// PATCH /api/auth/profile  → update name + avatar (onboarding)
router.patch(
  "/profile",
  authMiddleware,
  validate(updateProfileSchema),
  AuthController.updateProfile,
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user returned successfully
 */
// GET /api/auth/me  → get current user
router.get("/me", authMiddleware, AuthController.getUser);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh an access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 */
//POST /api/auth/refresh  → refresh access token
router.post("/refresh", AuthController.refreshToken);

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     summary: Log out all devices for the current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices
 */
// POST /api/auth/logout-all
router.post("/logout-all", authMiddleware, AuthController.logoutAllDevices);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Log out the current device
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
// POST /api/auth/logout  → invalidate session
router.post("/logout", authMiddleware, AuthController.logout);

export default router;
