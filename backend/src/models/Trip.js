import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    cargoWeightKg: { type: Number, required: true, min: 0 },
    plannedDistanceKm: { type: Number, required: true, min: 0 },
    finalOdometer: { type: Number, default: null },
    fuelConsumedL: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Dispatched', 'Completed', 'Cancelled'],
      default: 'Draft',
    },
    dispatchedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tripSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    source: this.source,
    destination: this.destination,
    vehicleId: this.vehicle?._id ? this.vehicle._id.toString() : this.vehicle?.toString(),
    vehicleRegNumber: this.vehicle?.regNumber,
    driverId: this.driver?._id ? this.driver._id.toString() : this.driver?.toString(),
    driverName: this.driver?.name,
    cargoWeightKg: this.cargoWeightKg,
    plannedDistanceKm: this.plannedDistanceKm,
    finalOdometer: this.finalOdometer,
    fuelConsumedL: this.fuelConsumedL,
    status: this.status,
    createdAt: this.createdAt,
    dispatchedAt: this.dispatchedAt,
    completedAt: this.completedAt,
    cancelledAt: this.cancelledAt,
  };
};

export default mongoose.model('Trip', tripSchema);
