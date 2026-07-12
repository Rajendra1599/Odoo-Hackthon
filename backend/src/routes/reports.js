import { Router } from 'express';
import Vehicle from '../models/Vehicle.js';
import Trip from '../models/Trip.js';
import FuelLog from '../models/FuelLog.js';
import Maintenance from '../models/Maintenance.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole('FleetManager', 'FinancialAnalyst'));

function parseRange(query) {
  const to = query.to ? new Date(query.to) : new Date();
  to.setHours(23, 59, 59, 999);
  const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 86400000);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

// GET /api/reports/fuel-efficiency?from=&to=  -> km/liter per vehicle, from completed trips in range
router.get(
  '/fuel-efficiency',
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req.query);
    const trips = await Trip.find({
      status: 'Completed',
      completedAt: { $gte: from, $lte: to },
    }).populate('vehicle');

    const byVehicle = new Map();
    for (const t of trips) {
      if (!t.vehicle) continue;
      const id = t.vehicle._id.toString();
      const entry = byVehicle.get(id) || { regNumber: t.vehicle.regNumber, distanceKm: 0, fuelL: 0 };
      entry.distanceKm += t.plannedDistanceKm || 0;
      entry.fuelL += t.fuelConsumedL || 0;
      byVehicle.set(id, entry);
    }

    const result = Array.from(byVehicle.values())
      .filter((v) => v.fuelL > 0)
      .map((v) => ({ regNumber: v.regNumber, kmPerLiter: Math.round((v.distanceKm / v.fuelL) * 100) / 100 }));

    res.json(result);
  })
);

// GET /api/reports/utilization?from=&to= -> daily utilization % trend across the range
router.get(
  '/utilization',
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req.query);
    const totalVehicles = await Vehicle.countDocuments({ status: { $ne: 'Retired' } });

    const days = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dispatchedThatDay = await Trip.countDocuments({
        dispatchedAt: { $gte: dayStart, $lt: dayEnd },
      });

      days.push({
        date: dayStart.toISOString().slice(0, 10),
        utilizationPct: totalVehicles ? Math.round((dispatchedThatDay / totalVehicles) * 1000) / 10 : 0,
      });

      cursor.setDate(cursor.getDate() + 1);
    }
    res.json(days);
  })
);

// GET /api/reports/operational-cost?from=&to= -> fuel vs maintenance cost per vehicle in range
router.get(
  '/operational-cost',
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req.query);
    const vehicles = await Vehicle.find();

    const [fuelTotals, maintenanceTotals] = await Promise.all([
      FuelLog.aggregate([
        { $match: { date: { $gte: from, $lte: to } } },
        { $group: { _id: '$vehicle', total: { $sum: '$cost' } } },
      ]),
      Maintenance.aggregate([
        { $match: { openedAt: { $gte: from, $lte: to } } },
        { $group: { _id: '$vehicle', total: { $sum: '$cost' } } },
      ]),
    ]);

    const toMap = (rows) => new Map(rows.map((r) => [r._id.toString(), r.total]));
    const fuelMap = toMap(fuelTotals);
    const maintenanceMap = toMap(maintenanceTotals);

    const result = vehicles
      .map((v) => ({
        regNumber: v.regNumber,
        fuelCost: fuelMap.get(v._id.toString()) || 0,
        maintenanceCost: maintenanceMap.get(v._id.toString()) || 0,
      }))
      .filter((v) => v.fuelCost > 0 || v.maintenanceCost > 0);

    res.json(result);
  })
);

// GET /api/reports/roi?from=&to= -> placeholder until a revenue source is defined (see README known gap)
router.get(
  '/roi',
  asyncHandler(async (req, res) => {
    const vehicles = await Vehicle.find({ status: { $ne: 'Retired' } });
    res.json(vehicles.map((v) => ({ regNumber: v.regNumber, roiPct: 0 })));
  })
);

// GET /api/reports/export?format=csv&from=&to=
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req.query);
    const trips = await Trip.find({ createdAt: { $gte: from, $lte: to } }).populate('vehicle').populate('driver');

    const header = 'tripId,source,destination,vehicle,driver,cargoWeightKg,plannedDistanceKm,fuelConsumedL,status,createdAt';
    const rows = trips.map((t) =>
      [
        t._id,
        JSON.stringify(t.source),
        JSON.stringify(t.destination),
        t.vehicle?.regNumber || '',
        JSON.stringify(t.driver?.name || ''),
        t.cargoWeightKg,
        t.plannedDistanceKm,
        t.fuelConsumedL,
        t.status,
        t.createdAt.toISOString(),
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transitops_report.csv"');
    res.send(csv);
  })
);

export default router;
