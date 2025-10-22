import Database from 'better-sqlite3';
import path from 'path';
import { existsSync } from 'fs';

/**
 * SQLite Storage Provider
 * Stores notes in a SQLite database
 */
export class SqliteStorage {
  constructor(basePath, dbFile = 'notes.db') {
    this.dbPath = path.join(basePath, dbFile);
    this.db = null;
  }

  /**
   * Initialize storage - create database and table if they don't exist
   */
  async init() {
    try {
      const isNewDb = !existsSync(this.dbPath);

      this.db = new Database(this.dbPath);

      if (isNewDb) {
        this._createTable();
      }

      console.log('SQLite storage initialized at:', this.dbPath);
      return true;
    } catch (error) {
      console.error('Failed to initialize SQLite storage:', error);
      throw error;
    }
  }

  /**
   * Create the notes table
   */
  _createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        pageUrl TEXT NOT NULL,
        content TEXT,
        x REAL,
        y REAL,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_pageUrl ON notes(pageUrl)
    `;

    this.db.exec(createTableSQL);
    this.db.exec(createIndexSQL);
  }

  /**
   * Get all notes for a specific page
   */
  async getNotesForPage(pageUrl) {
    try {
      const stmt = this.db.prepare('SELECT * FROM notes WHERE pageUrl = ?');
      const notes = stmt.all(pageUrl);
      return notes;
    } catch (error) {
      console.error('Failed to get notes for page:', error);
      throw error;
    }
  }

  /**
   * Get all notes from all pages
   */
  async getAllNotes() {
    try {
      const stmt = this.db.prepare('SELECT * FROM notes');
      const notes = stmt.all();
      return notes;
    } catch (error) {
      console.error('Failed to get all notes:', error);
      throw error;
    }
  }

  /**
   * Save a note (create or update)
   */
  async saveNote(note) {
    if (!note || !note.id || !note.pageUrl) {
      throw new Error('Note must have id and pageUrl');
    }

    try {
      const upsertSQL = `
        INSERT INTO notes (id, pageUrl, content, x, y, color)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          pageUrl = excluded.pageUrl,
          content = excluded.content,
          x = excluded.x,
          y = excluded.y,
          color = excluded.color,
          updated_at = CURRENT_TIMESTAMP
      `;

      const stmt = this.db.prepare(upsertSQL);
      stmt.run(
        note.id,
        note.pageUrl,
        note.content || '',
        note.x || 0,
        note.y || 0,
        note.color || 'yellow'
      );

      return note;
    } catch (error) {
      console.error('Failed to save note:', error);
      throw error;
    }
  }

  /**
   * Delete a note by ID
   */
  async deleteNote(id, pageUrl = null) {
    try {
      const stmt = this.db.prepare('DELETE FROM notes WHERE id = ?');
      stmt.run(id);
      return true;
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  }

  /**
   * Clear all notes for a specific page
   */
  async clearPageNotes(pageUrl) {
    try {
      const stmt = this.db.prepare('DELETE FROM notes WHERE pageUrl = ?');
      stmt.run(pageUrl);
      return true;
    } catch (error) {
      console.error('Failed to clear page notes:', error);
      throw error;
    }
  }

  /**
   * Clear all notes from all pages
   */
  async clearAllNotes() {
    try {
      const stmt = this.db.prepare('DELETE FROM notes');
      stmt.run();
      return true;
    } catch (error) {
      console.error('Failed to clear all notes:', error);
      throw error;
    }
  }

  /**
   * Import data (clear existing and import new)
   */
  async importData(data) {
    if (!Array.isArray(data)) {
      throw new Error('Import data must be an array');
    }

    try {
      // Start transaction
      const transaction = this.db.transaction((notes) => {
        // Clear existing data
        this.db.prepare('DELETE FROM notes').run();

        // Insert new data
        const insertStmt = this.db.prepare(`
          INSERT INTO notes (id, pageUrl, content, x, y, color)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const note of notes) {
          if (!note.id || !note.pageUrl) continue;
          insertStmt.run(
            note.id,
            note.pageUrl,
            note.content || '',
            note.x || 0,
            note.y || 0,
            note.color || 'yellow'
          );
        }
      });

      transaction(data);
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default SqliteStorage;
