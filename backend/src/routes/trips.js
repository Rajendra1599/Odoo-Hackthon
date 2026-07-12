import { Router } from 'express';
import Trip from '../models/Trip.js';
import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();
router.use(requireAuth);

// GET /api/trips?status=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const trips = await Trip.find(filter).populate('vehicle').populate('driver').sort({ createdAt: -1 });
    res.json(trips.map((t) => t.toPublicJSON()));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const trip = await Trip.findById(req.params.id).populate('vehicle').populate('driver');
    if (!trip) throw new HttpError(404, 'Trip not found.');
    res.json(trip.toPublicJSON());
  })
);

// POST /api/trips  -> created as Draft, no state changes to vehicle/driver yet
router.post(
  '/',
  requireRole('FleetManager', 'Driver'),
  asyncHandler(async (req, res) => {
    const { source, destination, vehicleId, driverId, cargoWeightKg, plannedDistanceKm } = req.body || {};
    if (!source || !String(source).trim()) throw new HttpError(400, 'Source is required.', 'source');
    if (!destination || !String(destination).trim()) throw new HttpError(400, 'Destination is required.', 'destination');
    if (!vehicleId) throw new HttpError(400, 'Select a vehicle.', 'vehicleId');
    if (!driverId) throw new HttpError(400, 'Select a driver.', 'driverId');
    if (!(Number(plannedDistanceKm) > 0)) throw new HttpError(400, 'Enter a planned distance.', 'plannedDistanceKm');
    if (!(Number(cargoWeightKg) > 0)) throw new HttpError(400, 'Cargo weight is required.', 'cargoWeightKg');

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) throw new HttpError(404, 'Vehicle not found.');
    if (Number(cargoWeightKg) > vehicle.maxLoadKg) {
      throw new HttpError(400, `Cargo weight exceeds vehicle capacity (${vehicle.maxLoadKg} kg).`, 'cargoWeightKg');
    }

    const driver = await Driver.findById(driverId);
    if (!driver) throw new HttpError(404, 'Driver not found.');
    if (driver.licenseExpiry && driver.licenseExpiry.getTime() < Date.now()) {
      throw new HttpError(400, 'This driver\u2019s license has expired.', 'driverId');
    }

    const trip = await Trip.create({
      source,
      destination,
      vehicle: vehicle._id,
      driver: driver._id,
      cargoWeightKg: Number(cargoWeightKg),
      plannedDistanceKm: Number(plannedDistanceKm),
      status: 'Draft',
    });

    const populated = await trip.populate(['vehicle', 'driver']);
    res.status(201).json(populated.toPublicJSON());
  })
);

// PATCH /api/trips/:id/dispatch -> marks vehicle + driver On Trip
router.patch(
  '/:id/dispatch',
  requireRole('FleetManager', 'Driver'),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findById(req.params.id).populate('vehicle').populate('driver');
    if (!trip) throw new HttpError(404, 'Trip not found.');
    if (trip.status !== 'Draft') throw new HttpError(400, 'Only draft trips can be dispatched.');

    if (trip.vehicle.status !== 'Available') throw new HttpError(400, 'Vehicle is no longer available.');
    if (trip.driver.status !== 'Available') throw new HttpError(400, 'Driver is no longer available.');

    trip.status = 'Dispatched';
    trip.dispatchedAt = new Date();
    await trip.save();

    trip.vehicle.status = 'On Trip';
    await trip.vehicle.save();
    trip.driver.status = 'On Trip';
    await trip.driver.save();

    res.json(trip.toPublicJSON());
  })
);

// PATCH /api/trips/:id/complete -> restores Available, records final odometer + fuel
router.patch(
  '/:id/complete',
  requireRole('FleetManager', 'Driver'),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findById(req.params.id).populate('vehicle').populate('driver');
    if (!trip) throw new HttpError(404, 'Trip not found.');
    if (trip.status !== 'Dispatched') throw new HttpError(400, 'Only dispatched trips can be completed.');

    const { finalOdometer, fuelConsumedL } = req.body || {};
    if (finalOdometer === undefined || finalOdometer === null || Number.isNaN(Number(finalOdometer))) {
      throw new HttpError(400, 'Final odometer is required.', 'finalOdometer');
    }

    trip.status = 'Completed';
    trip.completedAt = new Date();
    trip.finalOdometer = Number(finalOdometer);
    trip.fuelConsumedL = Number(fuelConsumedL) || 0;
    await trip.save();

    trip.vehicle.status = 'Available';
    if (Number(finalOdometer) > trip.vehicle.odometer) trip.vehicle.odometer = Number(finalOdometer);
    await trip.vehicle.save();

    trip.driver.status = 'Available';
    await trip.driver.save();

    res.json(trip.toPublicJSON());
  })
);

// PATCH /api/trips/:id/cancel -> restores Available if it had been dispatched
router.patch(
  '/:id/cancel',
  requireRole('FleetManager', 'Driver'),
  asyncHandler(async (req, res) => {
    const trip = await Trip.findById(req.params.id).populate('vehicle').populate('driver');
    if (!trip) throw new HttpError(404, 'Trip not found.');
    if (!['Draft', 'Dispatched'].includes(trip.status)) {
      throw new HttpError(400, 'Only draft or dispatched trips can be cancelled.');
    }

    const wasDispatched = trip.status === 'Dispatched';
    trip.status = 'Cancelled';
    trip.cancelledAt = new Date();
    await trip.save();

    if (wasDispatched) {
      trip.vehicle.status = 'Available';
      await trip.vehicle.save();
      trip.driver.status = 'Available';
      await trip.driver.save();
    }

    res.json(trip.toPublicJSON());
  })
);

export default router;
