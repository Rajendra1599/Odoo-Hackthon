import { Router } from 'express';
import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import Trip from '../models/Trip.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.use(requireAuth);

function fleetUtilizationPct(activeVehicles, totalNonRetired) {
  if (!totalNonRetired) return 0;
  return Math.round((activeVehicles / totalNonRetired) * 1000) / 10;
}

// GET /api/dashboard/summary?type=&status=&region=
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { type, status, region } = req.query;
    const vehicleFilter = {};
    if (type) vehicleFilter.type = type;
    if (status) vehicleFilter.status = status;
    if (region) vehicleFilter.region = region;

    const vehicles = await Vehicle.find(vehicleFilter);
    const nonRetired = vehicles.filter((v) => v.status !== 'Retired');

    const activeVehicles = vehicles.filter((v) => v.status === 'On Trip').length;
    const availableVehicles = vehicles.filter((v) => v.status === 'Available').length;
    const vehiclesInMaintenance = vehicles.filter((v) => v.status === 'In Shop').length;

    const activeTrips = await Trip.countDocuments({ status: 'Dispatched' });
    const pendingTrips = await Trip.countDocuments({ status: 'Draft' });
    const driversOnDuty = await Driver.countDocuments({ status: 'On Trip' });

    res.json({
      activeVehicles,
      availableVehicles,
      vehiclesInMaintenance,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      fleetUtilizationPct: fleetUtilizationPct(activeVehicles, nonRetired.length),
    });
  })
);

// GET /api/dashboard/utilization-trend -> last 7 days
router.get(
  '/utilization-trend',
  asyncHandler(async (req, res) => {
    const totalVehicles = await Vehicle.countDocuments({ status: { $ne: 'Retired' } });
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const dispatchedThatDay = await Trip.countDocuments({
        dispatchedAt: { $gte: day, $lt: nextDay },
      });

      days.push({
        date: day.toISOString().slice(0, 10),
        utilizationPct: totalVehicles ? Math.round((dispatchedThatDay / totalVehicles) * 1000) / 10 : 0,
      });
    }
    res.json(days);
  })
);

// GET /api/dashboard/recent-trips
router.get(
  '/recent-trips',
  asyncHandler(async (req, res) => {
    const trips = await Trip.find().populate('vehicle').populate('driver').sort({ createdAt: -1 }).limit(8);
    res.json(trips.map((t) => t.toPublicJSON()));
  })
);

export default router;
