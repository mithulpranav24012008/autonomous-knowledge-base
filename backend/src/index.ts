import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { apiRouter } from './routes/api.js';
import { connectDB } from './config/db.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);

async function startServer() {
  try {
    // Attempt MongoDB connection (non-fatal if local DB isn't running yet)
    try {
      await connectDB();
    } catch (err) {
      console.warn('⚠️ Server started without active MongoDB connection. (Ensure MONGODB_URI is reachable when accessing DB endpoints)');
    }

    app.listen(config.port, () => {
      console.log(`🚀 Express Backend running on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

startServer();
