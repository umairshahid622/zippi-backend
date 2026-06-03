import { type Request, type Response, type NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errorMiddleware = (
  err:  Error,
  req:  Request,
  res:  Response,
  next: NextFunction
): void => {
  // Known app error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      status:  err.statusCode,
    })
    return
  }

  // Prisma unique constraint violation
  if ((err as any).code === 'P2002') {
    res.status(409).json({ message: 'Already exists' })
    return
  }

  // Unknown error — don't leak details in production
  console.error('Unhandled error:', err)
  res.status(500).json({
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Internal server error',
  })
}