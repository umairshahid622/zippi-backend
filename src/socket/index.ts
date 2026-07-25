import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { env } from '../config/env.js'
import { verifyAccessToken } from '../lib/jwt.js'
import { prisma } from '../config/database.js'
import { registerChatHandlers } from './chat.socket.js'
import { registerPresenceHandlers } from './presence.socket.js'

// Extend the Socket type to carry authenticated user info
declare module 'socket.io' {
  interface Socket {
    userId?: string
    user?: {
      id:        string
      fullName:  string | null
      avatarUrl: string | null
    }
  }
}

let io: SocketIOServer

export const setupSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin:      env.CLIENT_URL ?? 'http://localhost:5173',
      credentials: true,
    },
  })

  // ── Authentication middleware for every socket connection ──
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined

      if (!token) {
        return next(new Error('No auth token provided'))
      }

      const payload = verifyAccessToken(token)
      if (!payload) {
        return next(new Error('Invalid or expired token'))
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId, deletedAt: null },
        select: { id: true, fullName: true, avatarUrl: true },
      })

      if (!user) {
        return next(new Error('User not found'))
      }

      socket.userId = user.id
      socket.user   = user
      next()
    } catch (err) {
      next(new Error('Authentication failed'))
    }
  })

  // ── On connection ──────────────────────────────
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Socket connected: ${socket.user?.fullName} (${socket.userId})`)

    registerChatHandlers(io, socket)
    registerPresenceHandlers(io, socket)

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.user?.fullName}`)
    })
  })

  return io
}

// Export getter so services/controllers can emit events too
export const getIO = (): SocketIOServer => {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}