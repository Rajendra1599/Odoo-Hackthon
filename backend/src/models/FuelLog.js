import mongoose from 'mongoose';

const fuelLogSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    liters: { type: Number, required: true, min: 0.01 },
    cost: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

fuelLogSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    vehicleId: this.vehicle?._id ? this.vehicle._id.toString() : this.vehicle?.toString(),
    vehicleRegNumber: this.vehicle?.regNumber,
    liters: this.liters,
    cost: this.cost,
    date: this.date,
  };
};

export default mongoose.model('FuelLog', fuelLogSchema);
