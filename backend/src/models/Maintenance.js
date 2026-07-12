import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    type: { type: String, enum: ['Oil Change', 'Tire', 'Brake', 'Inspection', 'Other'], required: true },
    cost: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

maintenanceSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    vehicleId: this.vehicle?._id ? this.vehicle._id.toString() : this.vehicle?.toString(),
    vehicleRegNumber: this.vehicle?.regNumber,
    type: this.type,
    cost: this.cost,
    status: this.status,
    openedAt: this.openedAt,
    closedAt: this.closedAt,
  };
};

export default mongoose.model('Maintenance', maintenanceSchema);
