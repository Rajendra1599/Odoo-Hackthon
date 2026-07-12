import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://bhuyanrajendra598_db_user:5IMyeq3kfA7Gug0o@cluster0.bzel5ka.mongodb.net/?appName=Cluster0';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`[db] connected -> ${uri}`);
}
