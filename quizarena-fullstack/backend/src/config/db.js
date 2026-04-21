import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️  MONGODB_URI not set — running without persistence.");
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log("🗄️  MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.warn("   Continuing without persistence — sample questions will be used.");
  }
}
