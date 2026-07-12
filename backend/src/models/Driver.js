import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    licenseCategory: { type: String, enum: ['LMV', 'HMV', 'Trailer', 'Motorcycle'], required: true },
    licenseExpiry: { type: Date, required: true },
    contactNumber: { type: String, trim: true, default: '' },
    safetyScore: { type: Number, min: 0, max: 100, default: 80 },
    status: {
      type: String,
      enum: ['Available', 'On Trip', 'Off Duty', 'Suspended'],
      default: 'Available',
    },
  },
  { timestamps: true }
);

driverSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    licenseNumber: this.licenseNumber,
    licenseCategory: this.licenseCategory,
    licenseExpiry: this.licenseExpiry,
    contactNumber: this.contactNumber,
    safetyScore: this.safetyScore,
    status: this.status,
  };
};

export default mongoose.model('Driver', driverSchema);
