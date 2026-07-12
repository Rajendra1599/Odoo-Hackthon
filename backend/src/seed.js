import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from './db.js';
import mongoose from 'mongoose';
import User from './models/User.js';
import Vehicle from './models/Vehicle.js';
import Driver from './models/Driver.js';

const DEMO_USERS = [
  { name: 'Fleet Manager', email: 'fleetmanager@transitops.dev', password: 'password123', role: 'FleetManager' },
  { name: 'Demo Driver', email: 'driver@transitops.dev', password: 'password123', role: 'Driver' },
  { name: 'Safety Officer', email: 'safety@transitops.dev', password: 'password123', role: 'SafetyOfficer' },
  { name: 'Financial Analyst', email: 'finance@transitops.dev', password: 'password123', role: 'FinancialAnalyst' },
];

const DEMO_VEHICLES = [
  { regNumber: 'OD-01-AB-1234', name: 'Tata Ace', type: 'Truck', maxLoadKg: 3000, odometer: 15000, acquisitionCost: 900000, region: 'North' },
  { regNumber: 'OD-02-CD-5678', name: 'Mahindra Bolero Pickup', type: 'Van', maxLoadKg: 1500, odometer: 8000, acquisitionCost: 700000, region: 'South' },
  { regNumber: 'OD-03-EF-9012', name: 'Bajaj RE Cargo', type: 'Bike', maxLoadKg: 400, odometer: 21000, acquisitionCost: 250000, region: 'East' },
];

const DEMO_DRIVERS = [
  { name: 'Ravi Kumar', licenseNumber: 'OD1220230001', licenseCategory: 'HMV', licenseExpiry: new Date(Date.now() + 400 * 86400000), contactNumber: '9800000001', safetyScore: 88 },
  { name: 'Suresh Patra', licenseNumber: 'OD1220230002', licenseCategory: 'LMV', licenseExpiry: new Date(Date.now() + 15 * 86400000), contactNumber: '9800000002', safetyScore: 72 },
];

async function seed() {
  await connectDB();

  for (const u of DEMO_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`[seed] user already exists: ${u.email}`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({ name: u.name, email: u.email, passwordHash, role: u.role });
    console.log(`[seed] created user: ${u.email} / ${u.password} (${u.role})`);
  }

  for (const v of DEMO_VEHICLES) {
    const existing = await Vehicle.findOne({ regNumber: v.regNumber });
    if (existing) continue;
    await Vehicle.create(v);
    console.log(`[seed] created vehicle: ${v.regNumber}`);
  }

  for (const d of DEMO_DRIVERS) {
    const existing = await Driver.findOne({ licenseNumber: d.licenseNumber });
    if (existing) continue;
    await Driver.create(d);
    console.log(`[seed] created driver: ${d.name}`);
  }

  console.log('\n[seed] Done. Demo logins:');
  DEMO_USERS.forEach((u) => console.log(`  ${u.role.padEnd(16)} ${u.email} / ${u.password}`));

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
