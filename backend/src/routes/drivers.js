import { Router } from 'express';
import Driver from '../models/Driver.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();
router.use(requireAuth);

// GET /api/drivers?search=&status=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { licenseNumber: { $regex: search, $options: 'i' } },
      ];
    }
    const drivers = await Driver.find(filter).sort({ createdAt: -1 });
    res.json(drivers.map((d) => d.toPublicJSON()));
  })
);

// GET /api/drivers/expiring?days=30
router.get(
  '/expiring',
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const drivers = await Driver.find({ licenseExpiry: { $lte: cutoff } }).sort({ licenseExpiry: 1 });
    res.json(drivers.map((d) => d.toPublicJSON()));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const driver = await Driver.findById(req.params.id);
    if (!driver) throw new HttpError(404, 'Driver not found.');
    res.json(driver.toPublicJSON());
  })
);

router.post(
  '/',
  requireRole('FleetManager', 'SafetyOfficer'),
  asyncHandler(async (req, res) => {
    const { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, safetyScore, status } = req.body || {};
    if (!name || !String(name).trim()) throw new HttpError(400, 'Name is required.', 'name');
    if (!licenseNumber || !String(licenseNumber).trim()) throw new HttpError(400, 'License number is required.', 'licenseNumber');
    if (!licenseExpiry) throw new HttpError(400, 'License expiry date is required.', 'licenseExpiry');
    const score = Number(safetyScore);
    if (Number.isNaN(score) || score < 0 || score > 100) throw new HttpError(400, 'Score must be between 0 and 100.', 'safetyScore');

    const existing = await Driver.findOne({ licenseNumber: licenseNumber.trim().toUpperCase() });
    if (existing) throw new HttpError(409, 'A driver with that license number already exists.', 'licenseNumber');

    const driver = await Driver.create({
      name,
      licenseNumber,
      licenseCategory,
      licenseExpiry: new Date(licenseExpiry),
      contactNumber,
      safetyScore: score,
      status: ['Available', 'Off Duty', 'Suspended'].includes(status) ? status : 'Available',
    });
    res.status(201).json(driver.toPublicJSON());
  })
);

router.put(
  '/:id',
  requireRole('FleetManager', 'SafetyOfficer'),
  asyncHandler(async (req, res) => {
    const driver = await Driver.findById(req.params.id);
    if (!driver) throw new HttpError(404, 'Driver not found.');

    const { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, safetyScore, status } = req.body || {};

    if (licenseNumber && licenseNumber.trim().toUpperCase() !== driver.licenseNumber) {
      const dup = await Driver.findOne({ licenseNumber: licenseNumber.trim().toUpperCase() });
      if (dup) throw new HttpError(409, 'A driver with that license number already exists.', 'licenseNumber');
      driver.licenseNumber = licenseNumber;
    }
    if (name !== undefined) driver.name = name;
    if (licenseCategory !== undefined) driver.licenseCategory = licenseCategory;
    if (licenseExpiry !== undefined) driver.licenseExpiry = new Date(licenseExpiry);
    if (contactNumber !== undefined) driver.contactNumber = contactNumber;
    if (safetyScore !== undefined) {
      const score = Number(safetyScore);
      if (Number.isNaN(score) || score < 0 || score > 100) throw new HttpError(400, 'Score must be between 0 and 100.', 'safetyScore');
      driver.safetyScore = score;
    }
    // "On Trip" is system-managed; only allow the other three from this endpoint.
    if (['Available', 'Off Duty', 'Suspended'].includes(status)) driver.status = status;

    await driver.save();
    res.json(driver.toPublicJSON());
  })
);

router.delete(
  '/:id',
  requireRole('FleetManager', 'SafetyOfficer'),
  asyncHandler(async (req, res) => {
    const driver = await Driver.findById(req.params.id);
    if (!driver) throw new HttpError(404, 'Driver not found.');
    if (driver.status === 'On Trip') throw new HttpError(400, 'Cannot remove a driver who is currently on a trip.');
    await driver.deleteOne();
    res.status(204).end();
  })
);

export default router;
