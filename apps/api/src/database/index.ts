// Re-export the database connection from the new connection system
// The database will be initialized by the main application
// Export getDatabase as default so it can be called to get the DB instance
import { getDatabase } from "./connection";

// Export a default that returns the database instance when called
// This maintains backward compatibility with old imports like: import db from '../database'
export default getDatabase;

// Also export as named export 'db' for convenience
export const db = getDatabase();

