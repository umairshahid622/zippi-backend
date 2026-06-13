import crypto from "crypto";
import { prisma } from "../config/database.js";
import { signAccessToken, signRefreshToken } from "../lib/jwt.js";
import { sendOTPEmail } from "../lib/email.js";
import { AppError } from "../middlewares/error.middleware.js";
import { type UpdateProfileInput } from "../validators/auth.validator.js";

export class AuthService {
  // ── Generate a cryptographically secure 6-digit OTP ──
  private static generateOTP(): string {
    // crypto.randomInt is more secure than Math.random
    return crypto.randomInt(100000, 999999).toString();
  }

  // ── Hash the token before storing ────────────────────
  // Never store raw OTPs — hash them like passwords
  private static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private static async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    const payload = { userId: user.id, email: user.email };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Hash refresh token before storing
    const refreshTokenHash = AuthService.hashToken(refreshToken);

    // Delete old sessions for this user (optional — keep last 5)
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (sessions.length >= 5) {
      const oldestIds = sessions.slice(4).map((s) => s.id);
      await prisma.session.deleteMany({
        where: { id: { in: oldestIds } },
      });
    }

    // Store new session
    await prisma.session.create({
      data: {
        userId,
        refreshToken: refreshTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        ipAddress,
        userAgent,
      },
    });

    return { accessToken, refreshToken };
  }

  // ── Send magic link / OTP ─────────────────────────────
  static async sendMagicLink(email: string) {
    // Rate limit — max 3 OTPs per email per hour
    const recentTokens = await prisma.magicToken.count({
      where: {
        email,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // last 1 hour
        },
      },
    });

    // if (recentTokens >= 3) {
    //   throw new AppError('Too many requests. Try again in an hour.', 429)
    // }

    // Invalidate all previous unused tokens for this email
    await prisma.magicToken.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    // Generate OTP
    const otp = AuthService.generateOTP();
    const tokenHash = AuthService.hashToken(otp);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email },
      });
    }

    // Store hashed token with 15 min expiry
    await prisma.magicToken.create({
      data: {
        userId: user.id,
        email,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    // Send email
    await sendOTPEmail(email, otp);

    return { message: "OTP sent successfully" };
  }

  // ── Verify OTP ────────────────────────────────────────
  static async verifyOTP(email: string, otp: string) {
    const tokenHash = AuthService.hashToken(otp);

    // Find the token
    const magicToken = await prisma.magicToken.findFirst({
      where: {
        email,
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() }, // not expired
      },
      include: { user: true },
    });

    if (!magicToken) {
      throw new AppError("Invalid or expired code", 400);
    }

    // Mark token as used — one time use only
    await prisma.magicToken.update({
      where: { id: magicToken.id },
      data: { used: true },
    });

    // Update user online status
    await prisma.user.update({
      where: { id: magicToken.userId! },
      data: { isOnline: true, lastSeenAt: new Date() },
    });

    // Issue JWT
    const token = signAccessToken({
      userId: magicToken.user!.id,
      email: magicToken.user!.email,
    });

    // Is this a new user? (no name set yet)
    const isNewUser = !magicToken.user!.fullName;

    return {
      token,
      isNewUser,
      user: {
        id: magicToken.user!.id,
        email: magicToken.user!.email,
        fullName: magicToken.user!.fullName,
        avatarUrl: magicToken.user!.avatarUrl,
        handle: magicToken.user!.handle,
      },
    };
  }

  // ── Handle OAuth (Google + GitHub) ────────────────────
  static async handleOAuth(payload: {
    provider: string;
    providerId: string;
    email: string;
    fullName: string;
    avatarUrl: string;
  }) {
    // Check if OAuth account already exists
    const existingOAuth = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: payload.provider,
          providerId: payload.providerId,
        },
      },
      include: { user: true },
    });

    if (existingOAuth) {
      // Returning user — just issue token
      const token = signAccessToken({
        userId: existingOAuth.user.id,
        email: existingOAuth.user.email,
      });

      return {
        token,
        isNewUser: false,
        user: existingOAuth.user,
      };
    }

    // New OAuth user — check if email already exists
    let user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      // Brand new user
      user = await prisma.user.create({
        data: {
          email: payload.email,
          fullName: payload.fullName,
          avatarUrl: payload.avatarUrl,
        },
      });
    }

    // Link OAuth account to user
    await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: payload.provider,
        providerId: payload.providerId,
      },
    });

    const token = signAccessToken({
      userId: user.id,
      email: user.email,
    });

    return {
      token,
      isNewUser: !user.fullName,
      user,
    };
  }

  // ── Update profile (onboarding step) ─────────────────
  static async updateProfile(userId: string, data: UpdateProfileInput) {
    // Check handle uniqueness if provided
    if (data.handle) {
      const existing = await prisma.user.findUnique({
        where: { handle: data.handle },
      });

      if (existing && existing.id !== userId) {
        throw new AppError("Handle already taken", 409);
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName ?? null,
        avatarUrl: data.avatarUrl ?? null,
        handle: data.handle ?? null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        handle: true,
      },
    });

    return { user };
  }

  // ── Get current user ──────────────────────────────────
  static async getUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        handle: true,
        isOnline: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return { user };
  }

  // ── Logout ────────────────────────────────────────────
  static async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: false,
        lastSeenAt: new Date(),
      },
    });

    return { message: "Logged out successfully" };
  }
}
