import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './models/index.js';
import stationRoutes from './routes/stationRoutes.js';
import tripRoutes from './routes/tripRoutes.js';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/stations', stationRoutes);
app.use('/api/trips', tripRoutes);



const PORT = process.env.PORT || 5000;

// To sync the database
sequelize.sync({ alter: true }).then(() => {
  console.log('✅ Database connected and tables synced');
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Unable to connect to the database:', err);
});