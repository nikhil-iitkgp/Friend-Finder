// Compatibility file to export database connection functions
// This file ensures API routes can import from @/lib/db

export { default as connectDB } from './mongoose';
export { checkDBConnection, disconnectDB } from './mongoose';

// Re-export the main connection function for backwards compatibility
export { default as connectToDatabase } from './mongoose';