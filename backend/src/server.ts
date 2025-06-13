import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/database';
import { errorHandler } from './middleware/errorhandler';
import inspectionRoutes from './routes/inspection.routes';
import mechanicRoutes from './routes/mechanic.routes';
import authRoutes from './routes/auth.routes';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app: Application = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/mechanics', mechanicRoutes);

// Error handling
app.use(errorHandler);

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-inspection', (inspectionId) => {
    socket.join(`inspection-${inspectionId}`);
  });
  
  socket.on('inspection-update', (data) => {
    io.to(`inspection-${data.inspectionId}`).emit('inspection-updated', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});