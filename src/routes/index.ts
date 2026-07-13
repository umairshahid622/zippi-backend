import { type Application } from 'express'
import authRoutes      from './auth.routes.js'
import workspaceRoutes from './workspace.routes.js'
// import channelRoutes   from './channel.routes'
// import messageRoutes   from './message.routes'
// import taskRoutes      from './task.routes'
// import fileRoutes      from './file.routes'

export const registerRoutes = (app: Application): void => {
  app.use('/api/auth',       authRoutes)
  app.use('/api/workspaces', workspaceRoutes)
//   app.use('/api/channels',   channelRoutes)
//   app.use('/api/messages',   messageRoutes)
//   app.use('/api/tasks',      taskRoutes)
//   app.use('/api/files',      fileRoutes)

  // Health check
  app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // 404 handler
  app.use((_, res) => {
    res.status(404).json({ message: 'Route not found' })
  })
}
