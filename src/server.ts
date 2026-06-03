import 'dotenv/config'
import { createServer } from 'http'
import { createApp }    from './app.js'
// import { setupSocket }  from './socket.js'
import { env }          from './config/env.js'

const app        = createApp()
const httpServer = createServer(app)

// Socket.io attaches to the same HTTP server
// setupSocket(httpServer)

httpServer.listen(env.PORT, () => {
  console.log(`🚀 Zippi server running on port ${env.PORT}`)
  console.log(`📡 WebSocket server ready`)
})
