import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * File Storage Provider
 * Stores notes in separate JSON files per page, with an index.json to track all files
 */
export class FileStorage {
  constructor(basePath, notesDir = 'notes_files/', indexFile = 'index.json') {
    this.basePath = basePath;
    this.notesDir = path.join(basePath, notesDir);
    this.indexPath = path.join(basePath, indexFile);
  }

  /**
   * Initialize storage - create directories if they don't exist
   */
  async init() {
    try {
      await fs.mkdir(this.notesDir, { recursive: true });

      // Create index file if it doesn't exist
      if (!existsSync(this.indexPath)) {
        await this._saveIndex({});
      }

      console.log('File storage initialized at:', this.notesDir);
      return true;
    } catch (error) {
      console.error('Failed to initialize file storage:', error);
      throw error;
    }
  }

  /**
   * Get file path for a specific page URL
   */
  _getFilePath(pageUrl) {
    const base64 = Buffer.from(pageUrl || '').toString('base64');
    const filename = base64.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(this.notesDir, `${filename}.json`);
  }

  /**
   * Load the index file
   */
  async _loadIndex() {
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {};
      }
      console.error('Failed to load index:', error);
      return {};
    }
  }

  /**
   * Save the index file
   */
  async _saveIndex(index) {
    try {
      await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to save index:', error);
      throw error;
    }
  }

  /**
   * Add a page to the index
   */
  async _indexAdd(pageUrl) {
    const base64 = Buffer.from(pageUrl).toString('base64');
    const filename = base64.replace(/[^a-zA-Z0-9_-]/g, '');
    const index = await this._loadIndex();
    index[filename] = true;
    await this._saveIndex(index);
  }

  /**
   * Remove a page from the index
   */
  async _indexRemove(pageUrl) {
    const base64 = Buffer.from(pageUrl).toString('base64');
    const filename = base64.replace(/[^a-zA-Z0-9_-]/g, '');
    const index = await this._loadIndex();
    delete index[filename];
    await this._saveIndex(index);
  }

  /**
   * Read notes data for a specific page
   */
  async _readPageData(pageUrl) {
    try {
      const filepath = this._getFilePath(pageUrl);
      const data = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      console.error('Failed to read page data:', error);
      return [];
    }
  }

  /**
   * Write notes data for a specific page
   */
  async _writePageData(pageUrl, notes) {
    try {
      const filepath = this._getFilePath(pageUrl);
      await fs.writeFile(filepath, JSON.stringify(notes, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to write page data:', error);
      throw error;
    }
  }

  /**
   * Get all notes for a specific page
   */
  async getNotesForPage(pageUrl) {
    return await this._readPageData(pageUrl);
  }

  /**
   * Get all notes from all pages
   */
  async getAllNotes() {
    const allNotes = [];
    const index = await this._loadIndex();

    for (const filename of Object.keys(index)) {
      try {
        const filepath = path.join(this.notesDir, `${filename}.json`);
        const data = await fs.readFile(filepath, 'utf-8');
        const notes = JSON.parse(data);
        allNotes.push(...notes);
      } catch (error) {
        console.error(`Failed to read file ${filename}:`, error);
      }
    }

    return allNotes;
  }

  /**
   * Save a note (create or update)
   */
  async saveNote(note) {
    if (!note || !note.id || !note.pageUrl) {
      throw new Error('Note must have id and pageUrl');
    }

    const notes = await this._readPageData(note.pageUrl);
    const existingIndex = notes.findIndex(n => n.id === note.id);

    if (existingIndex >= 0) {
      notes[existingIndex] = note;
    } else {
      notes.push(note);
    }

    await this._writePageData(note.pageUrl, notes);
    await this._indexAdd(note.pageUrl);

    return note;
  }

  /**
   * Delete a note by ID
   */
  async deleteNote(id, pageUrl) {
    if (!pageUrl) {
      throw new Error('pageUrl is required for file storage deletion');
    }

    const notes = await this._readPageData(pageUrl);
    const filteredNotes = notes.filter(n => n.id !== id);

    if (filteredNotes.length === 0) {
      // Remove file if no notes left
      const filepath = this._getFilePath(pageUrl);
      try {
        await fs.unlink(filepath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
      await this._indexRemove(pageUrl);
    } else {
      await this._writePageData(pageUrl, filteredNotes);
    }

    return true;
  }

  /**
   * Clear all notes for a specific page
   */
  async clearPageNotes(pageUrl) {
    const filepath = this._getFilePath(pageUrl);
    try {
      await fs.unlink(filepath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    await this._indexRemove(pageUrl);
    return true;
  }

  /**
   * Clear all notes from all pages
   */
  async clearAllNotes() {
    const index = await this._loadIndex();

    for (const filename of Object.keys(index)) {
      const filepath = path.join(this.notesDir, `${filename}.json`);
      try {
        await fs.unlink(filepath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Failed to delete ${filename}:`, error);
        }
      }
    }

    await this._saveIndex({});
    return true;
  }

  /**
   * Import data (clear existing and import new)
   */
  async importData(data) {
    if (!Array.isArray(data)) {
      throw new Error('Import data must be an array');
    }

    // Clear existing data
    await this.clearAllNotes();

    // Group notes by pageUrl
    const pageGroups = {};
    for (const note of data) {
      if (!note.pageUrl) continue;
      if (!pageGroups[note.pageUrl]) {
        pageGroups[note.pageUrl] = [];
      }
      pageGroups[note.pageUrl].push(note);
    }

    // Write each page's notes
    for (const [pageUrl, notes] of Object.entries(pageGroups)) {
      await this._writePageData(pageUrl, notes);
      await this._indexAdd(pageUrl);
    }

    return true;
  }
}

export default FileStorage;
