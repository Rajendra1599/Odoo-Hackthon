import { Router } from 'express';
import FuelLog from '../models/FuelLog.js';
import Expense from '../models/Expense.js';
import Maintenance from '../models/Maintenance.js';
import Vehicle from '../models/Vehicle.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();
router.use(requireAuth);

// ---------- Fuel logs ----------
router.get(
  '/fuel-logs',
  asyncHandler(async (req, res) => {
    const logs = await FuelLog.find().populate('vehicle').sort({ date: -1 });
    res.json(logs.map((l) => l.toPublicJSON()));
  })
);

router.post(
  '/fuel-logs',
  requireRole('FleetManager', 'FinancialAnalyst'),
  asyncHandler(async (req, res) => {
    const { vehicleId, liters, cost, date } = req.body || {};
    if (!vehicleId) throw new HttpError(400, 'Select a vehicle.', 'vehicleId');
    if (!(Number(liters) > 0)) throw new HttpError(400, 'Liters must be greater than 0.', 'liters');
    if (!(Number(cost) >= 0)) throw new HttpError(400, 'Enter a valid cost.', 'cost');

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) throw new HttpError(404, 'Vehicle not found.');

    const log = await FuelLog.create({
      vehicle: vehicle._id,
      liters: Number(liters),
      cost: Number(cost),
      date: date ? new Date(date) : new Date(),
    });
    const populated = await log.populate('vehicle');
    res.status(201).json(populated.toPublicJSON());
  })
);

// ---------- Expenses ----------
router.get(
  '/expenses',
  asyncHandler(async (req, res) => {
    const expenses = await Expense.find().populate('vehicle').sort({ date: -1 });
    res.json(expenses.map((e) => e.toPublicJSON()));
  })
);

router.post(
  '/expenses',
  requireRole('FleetManager', 'FinancialAnalyst'),
  asyncHandler(async (req, res) => {
    const { vehicleId, type, amount, date } = req.body || {};
    if (!vehicleId) throw new HttpError(400, 'Select a vehicle.', 'vehicleId');
    if (!(Number(amount) >= 0)) throw new HttpError(400, 'Enter a valid amount.', 'amount');

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) throw new HttpError(404, 'Vehicle not found.');

    const expense = await Expense.create({
      vehicle: vehicle._id,
      type: type === 'Toll' ? 'Toll' : 'Other',
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
    });
    const populated = await expense.populate('vehicle');
    res.status(201).json(populated.toPublicJSON());
  })
);

// GET /api/expenses/summary -> total operational cost per vehicle (fuel + expenses + maintenance)
router.get(
  '/expenses/summary',
  asyncHandler(async (req, res) => {
    const vehicles = await Vehicle.find();

    const [fuelTotals, expenseTotals, maintenanceTotals] = await Promise.all([
      FuelLog.aggregate([{ $group: { _id: '$vehicle', total: { $sum: '$cost' } } }]),
      Expense.aggregate([{ $group: { _id: '$vehicle', total: { $sum: '$amount' } } }]),
      Maintenance.aggregate([{ $group: { _id: '$vehicle', total: { $sum: '$cost' } } }]),
    ]);

    const toMap = (rows) => new Map(rows.map((r) => [r._id.toString(), r.total]));
    const fuelMap = toMap(fuelTotals);
    const expenseMap = toMap(expenseTotals);
    const maintenanceMap = toMap(maintenanceTotals);

    const summary = vehicles
      .map((v) => {
        const id = v._id.toString();
        const fuelCost = fuelMap.get(id) || 0;
        const otherExpenseCost = expenseMap.get(id) || 0;
        const maintenanceCost = maintenanceMap.get(id) || 0;
        return {
          vehicleId: id,
          regNumber: v.regNumber,
          fuelCost,
          otherExpenseCost,
          maintenanceCost,
          totalOperationalCost: fuelCost + otherExpenseCost + maintenanceCost,
        };
      })
      .filter((s) => s.totalOperationalCost > 0)
      .sort((a, b) => b.totalOperationalCost - a.totalOperationalCost);

    res.json(summary);
  })
);

export default router;
