import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './src/db.js';
import { notFound, errorHandler } from './src/utils/http.js';

import authRoutes from './src/routes/auth.js';
import vehicleRoutes from './src/routes/vehicles.js';
import driverRoutes from './src/routes/drivers.js';
import tripRoutes from './src/routes/trips.js';
import maintenanceRoutes from './src/routes/maintenance.js';
import fuelExpenseRoutes from './src/routes/fuelExpense.js';
import dashboardRoutes from './src/routes/dashboard.js';
import reportRoutes from './src/routes/reports.js';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      // allow non-browser tools (curl/Postman) which send no origin header
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api', fuelExpenseRoutes); // exposes /api/fuel-logs and /api/expenses*
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] TransitOps API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[server] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
