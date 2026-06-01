import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import notificationRoutes from './routes/notification';
import monitorRoutes from './routes/monitor';
import { getHealth } from './controllers/monitor';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

app.use(cors({
  origin: '*', // Allows access from any development client
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Health Check API (Detailed)
app.get('/api/health', getHealth);

// Main API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/monitor', monitorRoutes);

// Light legacy health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Centralized Error Handling Middleware (must be registered last)
app.use(errorHandler);

export default app;
