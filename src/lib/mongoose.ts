import mongoose from \"mongoose\";

if (!process.env.MONGODB_URI) {
  throw new Error(\"Please define the MONGODB_URI environment variable inside .env.local\");
}

const MONGODB_URI: string = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global is used here to maintain a cached connection across hot reloads
// in development. This prevents connections growing exponentially
// during API Route usage.
let cached: MongooseCache = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log(\"✅ Connected to MongoDB\");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Health check function
export async function checkDBConnection(): Promise<boolean> {
  try {
    await connectDB();
    const state = mongoose.connection.readyState;
    return state === 1; // 1 = connected
  } catch (error) {
    console.error(\"❌ Database connection failed:\", error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log(\"🔌 Disconnected from MongoDB\");
  } catch (error) {
    console.error(\"❌ Error disconnecting from MongoDB:\", error);
  }
}

export default connectDB;