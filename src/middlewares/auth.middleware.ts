import { type Request, type Response, type NextFunction } from 'express'
import { verifyAccessToken }              from '../lib/jwt.js'
import { prisma }                          from '../config/database.js'

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id:        string
        email:     string
        fullName:  string | null
        avatarUrl: string | null
        handle:    string | null
      }
    }
  }
}

export const authMiddleware = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' })
      return
    }

    const token = authHeader.split(' ')[1]

    // Verify JWT
    const payload = verifyAccessToken(token ?? "")
    if (!payload) {
      res.status(401).json({ message: 'Invalid or expired token' })
      return
    }

    // Fetch user from DB — ensures user still exists
    const user = await prisma.user.findUnique({
      where: {
        id:        payload.userId,
        deletedAt: null,
      },
      select: {
        id:        true,
        email:     true,
        fullName:  true,
        avatarUrl: true,
        handle:    true,
      },
    })

    if (!user) {
      res.status(401).json({ message: 'User not found' })
      return
    }

    // Attach user to request
    req.user = user
    next()
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized' })
  }
}