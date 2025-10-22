import express from "express";
import cors from "cors";
import config from "./config.js";
import { FileStorage } from "./storage/FileStorage.js";
import { SqliteStorage } from "./storage/SqliteStorage.js";
// ===================================================================
// INITIALIZE EXPRESS APP
// ===================================================================
const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());

// ===================================================================
// INITIALIZE STORAGE
// ===================================================================
let storage;

async function initializeStorage() {
  try {
    if (config.storageType === "sqlite") {
      storage = new SqliteStorage(
        config.dataBasePath,
        config.sqliteStorage.dbFile,
      );
    } else {
      storage = new FileStorage(
        config.dataBasePath,
        config.fileStorage.notesDir,
        config.fileStorage.indexFile,
      );
    }

    await storage.init();
    console.log(`Storage initialized: ${config.storageType}`);
  } catch (error) {
    console.error("Failed to initialize storage:", error);
    process.exit(1);
  }
}

// ===================================================================
// AUTHENTICATION MIDDLEWARE (Optional)
// ===================================================================
function authMiddleware(req, res, next) {
  if (!config.auth.enabled) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: true,
      message: "Unauthorized: Missing or invalid token",
    });
  }

  const token = authHeader.substring(7);
  if (token !== config.auth.bearerToken) {
    return res.status(401).json({
      error: true,
      message: "Unauthorized: Invalid token",
    });
  }

  next();
}

// ===================================================================
// ERROR HANDLER
// ===================================================================
function errorHandler(res, error, statusCode = 500) {
  console.error("Error:", error);
  res.status(statusCode).json({
    error: true,
    message: error.message || "Internal server error",
  });
}

// ===================================================================
// ROUTES
// ===================================================================

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    storage: config.storageType,
    timestamp: new Date().toISOString(),
  });
});

// Get notes (all or filtered by pageUrl)
app.get("/api/notes", authMiddleware, async (req, res) => {
  try {
    const { pageUrl } = req.query;
    let notes;

    if (pageUrl) {
      notes = await storage.getNotesForPage(pageUrl);
    } else {
      notes = await storage.getAllNotes();
    }

    res.json(notes);
  } catch (error) {
    errorHandler(res, error);
  }
});

// Create or update a note
app.post("/api/notes", authMiddleware, async (req, res) => {
  try {
    const noteData = req.body;

    if (!noteData || !noteData.id || !noteData.pageUrl) {
      return res.status(400).json({
        error: true,
        message: "Bad Request: Missing required fields (id, pageUrl)",
      });
    }

    const savedNote = await storage.saveNote(noteData);
    res.status(201).json(savedNote);
  } catch (error) {
    errorHandler(res, error);
  }
});

// Update a specific note (alternative endpoint)
app.put("/api/notes/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const noteData = { ...req.body, id };

    if (!noteData.pageUrl) {
      return res.status(400).json({
        error: true,
        message: "Bad Request: Missing required field (pageUrl)",
      });
    }

    const savedNote = await storage.saveNote(noteData);
    res.json(savedNote);
  } catch (error) {
    errorHandler(res, error);
  }
});

// Update a note (alternative PUT endpoint)
app.put("/api/notes", authMiddleware, async (req, res) => {
  try {
    const noteData = req.body;

    if (!noteData || !noteData.id || !noteData.pageUrl) {
      return res.status(400).json({
        error: true,
        message: "Bad Request: Missing required fields (id, pageUrl)",
      });
    }

    const savedNote = await storage.saveNote(noteData);
    res.json(savedNote);
  } catch (error) {
    errorHandler(res, error);
  }
});

// Delete a specific note
app.delete("/api/notes/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { pageUrl } = req.query;

    // For file storage, pageUrl is required
    if (config.storageType === "file" && !pageUrl) {
      return res.status(400).json({
        error: true,
        message:
          "Bad Request: pageUrl query parameter is required for file storage",
      });
    }

    await storage.deleteNote(id, pageUrl);
    res.status(204).send();
  } catch (error) {
    errorHandler(res, error);
  }
});

// Clear notes (all or for a specific page)
app.delete("/api/notes", authMiddleware, async (req, res) => {
  try {
    const { pageUrl } = req.query;

    if (pageUrl) {
      await storage.clearPageNotes(pageUrl);
    } else {
      await storage.clearAllNotes();
    }

    res.status(204).send();
  } catch (error) {
    errorHandler(res, error);
  }
});

// Import data
app.post("/api/notes/import", authMiddleware, async (req, res) => {
  try {
    const data = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({
        error: true,
        message: "Bad Request: Import data must be an array",
      });
    }

    await storage.importData(data);
    res.status(201).json({
      message: "Import successful.",
      count: data.length,
    });
  } catch (error) {
    errorHandler(res, error);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: "Not Found",
  });
});

// ===================================================================
// START SERVER
// ===================================================================
async function startServer() {
  await initializeStorage();

  app.listen(config.port, config.host, () => {
    console.log("=====================================");
    console.log("Sticky Notes API Server");
    console.log("=====================================");
    console.log(`Server running at: http://${config.host}:${config.port}`);
    console.log(`Storage type: ${config.storageType}`);
    console.log(`Data path: ${config.dataBasePath}`);
    console.log(
      `Authentication: ${config.auth.enabled ? "Enabled" : "Disabled"}`,
    );
    console.log("=====================================");
  });
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  if (storage && typeof storage.close === "function") {
    storage.close();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down gracefully...");
  if (storage && typeof storage.close === "function") {
    storage.close();
  }
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
