import { Router } from 'express';
import Vehicle from '../models/Vehicle.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();
router.use(requireAuth);

// GET /api/vehicles?search=&status=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { regNumber: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }
    const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });
    res.json(vehicles.map((v) => v.toPublicJSON()));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) throw new HttpError(404, 'Vehicle not found.');
    res.json(vehicle.toPublicJSON());
  })
);

router.post(
  '/',
  requireRole('FleetManager'),
  asyncHandler(async (req, res) => {
    const { regNumber, name, type, maxLoadKg, odometer, acquisitionCost, status, region } = req.body || {};
    if (!regNumber || !String(regNumber).trim()) throw new HttpError(400, 'Registration number is required.', 'regNumber');
    if (!(Number(maxLoadKg) > 0)) throw new HttpError(400, 'Max load must be greater than 0.', 'maxLoadKg');

    const existing = await Vehicle.findOne({ regNumber: regNumber.trim().toUpperCase() });
    if (existing) throw new HttpError(409, 'A vehicle with that registration number already exists.', 'regNumber');

    const vehicle = await Vehicle.create({
      regNumber,
      name,
      type,
      maxLoadKg: Number(maxLoadKg),
      odometer: Number(odometer) || 0,
      acquisitionCost: Number(acquisitionCost) || 0,
      status: status === 'Retired' ? 'Retired' : 'Available',
      region: region || 'North',
    });
    res.status(201).json(vehicle.toPublicJSON());
  })
);

router.put(
  '/:id',
  requireRole('FleetManager'),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) throw new HttpError(404, 'Vehicle not found.');

    const { regNumber, name, type, maxLoadKg, odometer, acquisitionCost, status, region } = req.body || {};

    if (regNumber && regNumber.trim().toUpperCase() !== vehicle.regNumber) {
      const dup = await Vehicle.findOne({ regNumber: regNumber.trim().toUpperCase() });
      if (dup) throw new HttpError(409, 'A vehicle with that registration number already exists.', 'regNumber');
      vehicle.regNumber = regNumber;
    }
    if (name !== undefined) vehicle.name = name;
    if (type !== undefined) vehicle.type = type;
    if (maxLoadKg !== undefined) {
      if (!(Number(maxLoadKg) > 0)) throw new HttpError(400, 'Max load must be greater than 0.', 'maxLoadKg');
      vehicle.maxLoadKg = Number(maxLoadKg);
    }
    if (odometer !== undefined) vehicle.odometer = Number(odometer) || 0;
    if (acquisitionCost !== undefined) vehicle.acquisitionCost = Number(acquisitionCost) || 0;
    if (region !== undefined) vehicle.region = region;
    // Frontend only lets the user set Available/Retired directly; On Trip / In Shop are system-managed.
    if (status === 'Available' || status === 'Retired') vehicle.status = status;

    await vehicle.save();
    res.json(vehicle.toPublicJSON());
  })
);

router.delete(
  '/:id',
  requireRole('FleetManager'),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) throw new HttpError(404, 'Vehicle not found.');
    if (vehicle.status === 'On Trip' || vehicle.status === 'In Shop') {
      throw new HttpError(400, 'Cannot delete a vehicle that is currently on a trip or in the shop.');
    }
    await vehicle.deleteOne();
    res.status(204).end();
  })
);

export default router;
