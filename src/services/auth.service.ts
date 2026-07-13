import crypto from "crypto";
import { prisma } from "../config/database.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";
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

    const recentSessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true },
    });

    const keepIds = recentSessions.map((s) => s.id);

    await prisma.$transaction([
      prisma.session.deleteMany({
        where: {
          userId,
          id: { notIn: keepIds },
        },
      }),
      prisma.session.create({
        data: {
          userId,
          refreshToken: refreshTokenHash,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      }),
    ]);

    return { accessToken, refreshToken };
  }

  // ── Send magic link / OTP ─────────────────────────────
  static async sendMagicLink(email: string) {
      
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });
    
    const otp = AuthService.generateOTP();
    const tokenHash = AuthService.hashToken(otp);

    await prisma.$transaction([
      prisma.magicToken.updateMany({
        where: { email, used: false },
        data: { used: true },
      }),
      prisma.magicToken.create({
        data: {
          userId: user.id,
          email,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      }),
    ]);

    await sendOTPEmail(email, otp);

    return { message: "OTP sent successfully" };
  }

  // ── Verify OTP ────────────────────────────────────────
  static async verifyOTP(
    email: string,
    otp: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
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
    await prisma.$transaction([
      prisma.magicToken.update({
        where: { id: magicToken.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: magicToken.userId! },
        data: { isOnline: true, lastSeenAt: new Date() },
      }),
    ]);

    const { accessToken, refreshToken } = await AuthService.createSession(
      magicToken.user!.id,
      ipAddress,
      userAgent,
    );

    // Is this a new user? (no name set yet)
    const isNewUser = !magicToken.user!.fullName;

    return {
      token: accessToken,
      refreshToken: refreshToken,
      isNewUser: isNewUser,
      user: {
        id: magicToken.user!.id,
        email: magicToken.user!.email,
        fullName: magicToken.user!.fullName,
        avatarUrl: magicToken.user!.avatarUrl,
        handle: magicToken.user!.handle,
      },
    };
  }

  // ── Refresh access token ──────────────────────
  static async refreshAccessToken(refreshToken: string) {
    // Verify the JWT signature first
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) throw new AppError("Invalid refresh token", 401);

    // Check if session exists in DB
    const tokenHash = AuthService.hashToken(refreshToken);
    const session = await prisma.session.findUnique({
      where: { refreshToken: tokenHash },
      include: { user: true },
    });

    if (!session) throw new AppError("Session not found", 401);

    // Check if session expired
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new AppError("Session expired. Please login again.", 401);
    }

    // ✅ Rotate refresh token — issue new ones
    const newAccessToken = signAccessToken({
      userId: session.user.id,
      email: session.user.email,
    });
    const newRefreshToken = signRefreshToken({
      userId: session.user.id,
      email: session.user.email,
    });

    // Replace old refresh token with new one
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: AuthService.hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
        avatarUrl: session.user.avatarUrl,
        handle: session.user.handle,
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
    ipAddress?: string;
    userAgent?: string;
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
      const { accessToken, refreshToken } = await AuthService.createSession(
        existingOAuth.user.id,
        payload.ipAddress,
        payload.userAgent,
      );

      return {
        token: accessToken,
        refreshToken,
        isNewUser: false,
        user: existingOAuth.user,
      };
    }

    const oAuthAccount = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email: payload.email },
        update: {},
        create: {
          email: payload.email,
          fullName: payload.fullName,
          avatarUrl: payload.avatarUrl,
        },
      });

      const account = await tx.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: payload.provider,
          providerId: payload.providerId,
        },
      });

      return { ...account, user };
    });

    const { accessToken, refreshToken } = await AuthService.createSession(
      oAuthAccount.user.id,
      payload.ipAddress,
      payload.userAgent,
    );

    return {
      token: accessToken,
      refreshToken: refreshToken,
      isNewUser: !oAuthAccount.user.fullName,
      user: oAuthAccount.user,
    };

    // // New OAuth user — check if email already exists
    // let user = await prisma.user.findUnique({
    //   where: { email: payload.email },
    // });

    // if (!user) {
    //   // Brand new user
    //   user = await prisma.user.create({
    //     data: {
    //       email: payload.email,
    //       fullName: payload.fullName,
    //       avatarUrl: payload.avatarUrl,
    //     },
    //   });
    // }

    // // Link OAuth account to user
    // await prisma.oAuthAccount.create({
    //   data: {
    //     userId: user.id,
    //     provider: payload.provider,
    //     providerId: payload.providerId,
    //   },
    // });

    // const { accessToken, refreshToken } = await AuthService.createSession(
    //   user.id,
    //   payload.ipAddress,
    //   payload.userAgent,
    // );

    // return {
    //   token: accessToken,
    //   refreshToken,
    //   isNewUser: !user.fullName,
    //   user,
    // };
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

  // ── Logout — delete session ───────────────────
  static async logout(refreshToken: string, userId: string) {
    const tokenHash = AuthService.hashToken(refreshToken);

    await prisma.session.deleteMany({
      where: {
        userId,
        refreshToken: tokenHash,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeenAt: new Date() },
    });

    return { message: "Logged out successfully" };
  }

  // ── Logout all devices ────────────────────────
  static async logoutAllDevices(userId: string) {
    await prisma.session.deleteMany({ where: { userId } });
    return { message: "Logged out from all devices" };
  }
}
