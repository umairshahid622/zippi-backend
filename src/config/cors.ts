import cors from 'cors';

const corsOptions = {
  // Replace with your actual frontend domain(s)
  origin: ['https://your-frontend-domain.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Needed if you use cookies or Authorization headers
  optionsSuccessStatus: 200 // Some legacy browsers (IE11) choke on 204
};

export const corsConfig = corsOptions;