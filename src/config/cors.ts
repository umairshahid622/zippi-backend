import type { CorsOptions } from 'cors'
import { env }         from './env.js'

// ── Allowed origins ───────────────────────────
const allowedOrigins: string[] = [
  // Local development
  'http://localhost:5173',   // Vite dev server (React)
  'http://localhost:5174',   // Vite alt port
  'http://localhost:3000',   // Sometimes used for React
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
]

// Add production URL when you deploy later
if (env.NODE_ENV === 'production' && env.CLIENT_URL) {
  allowedOrigins.push(env.CLIENT_URL)
}

// ── CORS config ───────────────────────────────
export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin
    // (mobile apps, Postman, curl, server-to-server)
    if (!origin) {
      callback(null, true)
      return
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS blocked: ${origin} is not allowed`))
    }
  },

  // ── Allowed methods ──
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // ── Allowed headers ──
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],

  // ── Exposed headers ──
  // Headers the browser can access from response
  exposedHeaders: [
    'X-Total-Count',    // for pagination
    'X-Page',
    'X-Per-Page',
  ],

  // Allow cookies and Authorization headers
  credentials: true,

  // Cache preflight response for 24 hours
  // Browser won't send OPTIONS request every time
  maxAge: 86400,
}