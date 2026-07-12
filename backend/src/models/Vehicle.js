import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    regNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, trim: true, default: '' },
    type: { type: String, enum: ['Truck', 'Van', 'Bike', 'Trailer'], required: true },
    maxLoadKg: { type: Number, required: true, min: 1 },
    odometer: { type: Number, default: 0, min: 0 },
    acquisitionCost: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Available', 'On Trip', 'In Shop', 'Retired'],
      default: 'Available',
    },
    region: { type: String, enum: ['North', 'South', 'East', 'West'], default: 'North' },
  },
  { timestamps: true }
);

vehicleSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    regNumber: this.regNumber,
    name: this.name,
    type: this.type,
    maxLoadKg: this.maxLoadKg,
    odometer: this.odometer,
    acquisitionCost: this.acquisitionCost,
    status: this.status,
    region: this.region,
  };
};

export default mongoose.model('Vehicle', vehicleSchema);
