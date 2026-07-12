import { Router } from 'express';
import Maintenance from '../models/Maintenance.js';
import Vehicle from '../models/Vehicle.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();
router.use(requireAuth);

// GET /api/maintenance?status=Open|Closed
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const records = await Maintenance.find(filter).populate('vehicle').sort({ openedAt: -1 });
    res.json(records.map((r) => r.toPublicJSON()));
  })
);

// POST /api/maintenance -> marks vehicle In Shop immediately
router.post(
  '/',
  requireRole('FleetManager'),
  asyncHandler(async (req, res) => {
    const { vehicleId, type, cost } = req.body || {};
    if (!vehicleId) throw new HttpError(400, 'Select a vehicle.', 'vehicleId');
    if (!(Number(cost) >= 0)) throw new HttpError(400, 'Enter a valid cost.', 'cost');

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) throw new HttpError(404, 'Vehicle not found.');
    if (vehicle.status === 'On Trip') throw new HttpError(400, 'Cannot open maintenance while the vehicle is on a trip.');

    const record = await Maintenance.create({
      vehicle: vehicle._id,
      type,
      cost: Number(cost) || 0,
      status: 'Open',
      openedAt: new Date(),
    });

    vehicle.status = 'In Shop';
    await vehicle.save();

    const populated = await record.populate('vehicle');
    res.status(201).json(populated.toPublicJSON());
  })
);

// PATCH /api/maintenance/:id/close -> restores vehicle to Available unless other open records exist
router.patch(
  '/:id/close',
  requireRole('FleetManager'),
  asyncHandler(async (req, res) => {
    const record = await Maintenance.findById(req.params.id).populate('vehicle');
    if (!record) throw new HttpError(404, 'Maintenance record not found.');
    if (record.status !== 'Open') throw new HttpError(400, 'This record is already closed.');

    record.status = 'Closed';
    record.closedAt = new Date();
    await record.save();

    const otherOpen = await Maintenance.countDocuments({
      vehicle: record.vehicle._id,
      status: 'Open',
      _id: { $ne: record._id },
    });
    if (otherOpen === 0 && record.vehicle.status === 'In Shop') {
      record.vehicle.status = 'Available';
      await record.vehicle.save();
    }

    res.json(record.toPublicJSON());
  })
);

export default router;
