import { Server, Socket } from 'socket.io'
import { prisma } from '../config/database.js'

export const registerPresenceHandlers = (io: Server, socket: Socket) => {

  // Mark user online on connection
  prisma.user.update({
    where: { id: socket.userId! },
    data:  { isOnline: true },
  }).then(() => {
    // Broadcast to everyone that this user is now online
    io.emit('presence:update', { userId: socket.userId, isOnline: true })
  })

  socket.on('disconnect', async () => {
    // Check if this user has OTHER active socket connections
    // (they might have multiple tabs/devices open)
    const sockets = await io.fetchSockets()
    const stillConnected = sockets.some(s => (s as any).userId === socket.userId)

    if (!stillConnected) {
      await prisma.user.update({
        where: { id: socket.userId! },
        data:  { isOnline: false, lastSeenAt: new Date() },
      })
      io.emit('presence:update', { userId: socket.userId, isOnline: false })
    }
  })
}