import { type Request, type Response, type NextFunction } from "express";
import { AuthService } from "../services/auth.service.js";
import { env } from "../config/env.js";

export class AuthController {
  // POST /api/auth/magic-link
  static sendMagicLink = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email } = req.body;
      const result = await AuthService.sendMagicLink(email);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/auth/verify
  static verifyOTP = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email, otp } = req.body;
      const result = await AuthService.verifyOTP(
        email,
        otp,
        req.ip,
        req.get("user-agent") ?? undefined,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/auth/refresh
  static refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ message: "Refresh token required" });
        return;
      }

      const result = await AuthService.refreshAccessToken(refreshToken);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/auth/google
  static googleAuth = (req: Request, res: Response): void => {
    const redirectUri = `${env.BASE_URL}:${env.PORT}/api/auth/google/callback`;
    console.log(redirectUri);
    
    
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
    });

    res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
  };

  // GET /api/auth/google/callback
  static googleCallback = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { code } = req.query;
      const redirectUri = `${env.BASE_URL}:${env.PORT}/api/auth/google/callback`;
      console.log('auth Call Back Called');
      
      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenRes.json();

      // Get user profile from Google
      const profileRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );

      const profile = await profileRes.json();

      const result = await AuthService.handleOAuth({
        provider: "google",
        providerId: profile.id,
        email: profile.email,
        fullName: profile.name,
        avatarUrl: profile.picture,
        ...(req.ip ? { ipAddress: req.ip } : {}),
        ...(req.get("user-agent") ? { userAgent: req.get("user-agent")! } : {}),
      });

      // Redirect to frontend with token
      res.redirect(
        `${env.CLIENT_URL}/auth/callback?token=${result.token}&refreshToken=${result.refreshToken}&isNewUser=${result.isNewUser}`,
      );
    } catch (err) {
      next(err);
    }
  };

  // GET /api/auth/github
  static githubAuth = (req: Request, res: Response): void => {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${req.protocol}://${req.get("host")}/api/auth/github/callback`,
      scope: "user:email",
    });

    res.redirect(
      `https://github.com/login/oauth/authorize?${params.toString()}`,
    );
  };

  // GET /api/auth/github/callback
  static githubCallback = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { code } = req.query;

      // Exchange code for access token
      const tokenRes = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            code,
          }),
        },
      );

      const tokens = await tokenRes.json();

      // Get user profile
      const profileRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      const profile = await profileRes.json();

      // GitHub may not return email — fetch separately
      let email = profile.email;
      if (!email) {
        const emailRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
        const emails = await emailRes.json();
        email = emails.find((e: any) => e.primary)?.email;
      }

      const result = await AuthService.handleOAuth({
        provider: "github",
        providerId: profile.id.toString(),
        email,
        fullName: profile.name || profile.login,
        avatarUrl: profile.avatar_url,
        ...(req.ip ? { ipAddress: req.ip } : {}),
        ...(req.get("user-agent") ? { userAgent: req.get("user-agent")! } : {}),
      });

      res.redirect(
        `${env.CLIENT_URL}/auth/callback?token=${result.token}&isNewUser=${result.isNewUser}`,
      );
    } catch (err) {
      next(err);
    }
  };

  // PATCH /api/auth/profile
  static updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await AuthService.updateProfile(req.user!.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/auth/me
  static getUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await AuthService.getUser(req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/auth/logout
  static logout = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.logout(refreshToken, req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/auth/logout-all
  static logoutAllDevices = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await AuthService.logoutAllDevices(req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
