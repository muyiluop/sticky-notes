// ===================================================================
// CONFIGURATION
// ===================================================================

export const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  host: process.env.HOST || "0.0.0.0",

  // Storage configuration
  // Options: 'file' or 'sqlite'
  storageType: process.env.STORAGE_TYPE || "file",

  // Data storage paths
  dataBasePath: process.env.DATA_BASE_PATH || "./data/",

  // File storage specific
  fileStorage: {
    notesDir: "notes_files/",
    indexFile: "index.json",
  },

  // SQLite storage specific
  sqliteStorage: {
    dbFile: "notes.db",
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },

  // Authentication (optional)
  auth: {
    enabled: process.env.AUTH_ENABLED === "true",
    bearerToken: process.env.AUTH_TOKEN || "",
  },
};
console.log("env", process.env.AUTH_ENABLED);
export default config;
