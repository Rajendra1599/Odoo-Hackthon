import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    type: { type: String, enum: ['Toll', 'Other'], required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

expenseSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    vehicleId: this.vehicle?._id ? this.vehicle._id.toString() : this.vehicle?.toString(),
    vehicleRegNumber: this.vehicle?.regNumber,
    type: this.type,
    amount: this.amount,
    date: this.date,
  };
};

export default mongoose.model('Expense', expenseSchema);
