import mongoose from 'mongoose';

const ROLES = ['FleetManager', 'Driver', 'SafetyOfficer', 'FinancialAnalyst'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
  },
  { timestamps: true }
);

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return { id: this._id.toString(), name: this.name, email: this.email, role: this.role };
};

export const ROLE_VALUES = ROLES;
export default mongoose.model('User', userSchema);
