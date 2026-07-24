// src/middlewares/error.middleware.ts
import type { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'

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

  // ── Known, intentional app errors — safe to show as-is ──
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      status:  err.statusCode,
    })
    return
  }

  // ── Prisma validation errors (bad field names, wrong types, etc.) ──
  // These expose schema internals — NEVER forward err.message to client
  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error('Prisma validation error:', err.message)   // ✅ log full detail server-side
    res.status(400).json({
      message: 'Invalid request data. Please check your input and try again.',
      status:  400,
    })
    return
  }

  // ── Prisma known request errors (unique constraint, not found, etc.) ──
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('Prisma request error:', err.code, err.message)

    switch (err.code) {
      case 'P2002':   // unique constraint violation
        res.status(409).json({
          message: 'This value already exists. Please use a different one.',
          status:  409,
        })
        return

      case 'P2025':   // record not found (e.g. update/delete on missing row)
        res.status(404).json({
          message: 'The requested resource was not found.',
          status:  404,
        })
        return

      case 'P2003':   // foreign key constraint failed
        res.status(400).json({
          message: 'This action references data that no longer exists.',
          status:  400,
        })
        return

      default:
        res.status(400).json({
          message: 'Something went wrong processing your request.',
          status:  400,
        })
        return
    }
  }

  // ── Everything else — truly unexpected errors ──
  console.error('Unhandled error:', err)   // ✅ full stack trace, server-side only
  res.status(500).json({
    message: process.env.NODE_ENV === 'development'
      ? err.message              // only show real message in dev
      : 'Internal server error. Please try again later.',
  })
}