/**
 * Storage Provider Interface (for extensibility)
 * Any custom storage solution should implement these methods.
 */
class StorageProvider {
  async init() {
    throw new Error("init() not implemented");
  }
  async getNotesForPage(pageUrl) {
    throw new Error("getNotesForPage() not implemented");
  }
  async getAllNotes() {
    throw new Error("getAllNotes() not implemented");
  }
  async saveNote(note) {
    throw new Error("saveNote() not implemented");
  }
  async deleteNote(id) {
    throw new Error("deleteNote() not implemented");
  }
  async clearPageNotes(pageUrl) {
    throw new Error("clearPageNotes() not implemented");
  }
  async clearAllNotes() {
    throw new Error("clearAllNotes() not implemented");
  }
  async importData(data) {
    throw new Error("importData() not implemented");
  }
}

/**
 * Default storage provider using IndexedDB.
 */
class IndexedDBStorageProvider extends StorageProvider {
  constructor(dbName = "StickyNotesDB", storeName = "notes") {
    super();
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject("Error opening IndexedDB");
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "id" });
          store.createIndex("pageUrl", "pageUrl", { unique: false });
        }
      };
    });
  }

  async getStore(mode) {
    if (!this.db) await this.init();
    return this.db
      .transaction(this.storeName, mode)
      .objectStore(this.storeName);
  }

  async getNotesForPage(pageUrl) {
    const store = await this.getStore("readonly");
    const index = store.index("pageUrl");
    return new Promise((resolve, reject) => {
      const request = index.getAll(pageUrl);
      request.onerror = () => reject("Error fetching notes for page");
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAllNotes() {
    const store = await this.getStore("readonly");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject("Error fetching all notes");
      request.onsuccess = () => resolve(request.result);
    });
  }

  async saveNote(note) {
    const store = await this.getStore("readwrite");
    return new Promise((resolve, reject) => {
      const request = store.put(note);
      request.onerror = () => reject("Error saving note");
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteNote(id) {
    const store = await this.getStore("readwrite");
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onerror = () => reject("Error deleting note");
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clearPageNotes(pageUrl) {
    const notes = await this.getNotesForPage(pageUrl);
    const store = await this.getStore("readwrite");
    return Promise.all(
      notes.map(
        (note) =>
          new Promise((resolve, reject) => {
            const request = store.delete(note.id);
            request.onerror = reject;
            request.onsuccess = resolve;
          }),
      ),
    );
  }

  async clearAllNotes() {
    const store = await this.getStore("readwrite");
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject("Error clearing all notes");
      request.onsuccess = () => resolve(request.result);
    });
  }

  async importData(data) {
    await this.clearAllNotes();
    const store = await this.getStore("readwrite");
    return Promise.all(
      data.map(
        (note) =>
          new Promise((resolve, reject) => {
            const request = store.add(note);
            request.onerror = reject;
            request.onsuccess = resolve;
          }),
      ),
    );
  }
}

// 新增: 远程API存储实现
class RemoteAPIStorageProvider extends StorageProvider {
  constructor(baseUrl, authToken = null) {
    super();
    this.baseUrl = baseUrl;
    this.headers = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      this.headers["Authorization"] = `Bearer ${authToken}`;
    }
  }

  async init() {
    // 对于API，init可以用来检查API连接性
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: this.headers,
      });
      if (!response.ok) throw new Error("API health check failed");
      console.log("Remote API storage initialized and healthy.");
      return Promise.resolve();
    } catch (error) {
      console.error("Failed to initialize remote API storage:", error);
      return Promise.reject(error);
    }
  }

  async _fetch(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: this.headers,
    });
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${errorData.message}`,
      );
    }
    if (response.status === 204) {
      // No Content
      return null;
    }
    return response.json();
  }

  getNotesForPage(pageUrl) {
    // API端点示例: GET /api/notes?pageUrl=/my-page
    return this._fetch(`/notes?pageUrl=${encodeURIComponent(pageUrl)}`);
  }

  getAllNotes() {
    // API端点示例: GET /api/notes
    return this._fetch("/notes");
  }

  saveNote(note) {
    if (note.id.startsWith("note-")) {
      // 假设新便签ID以此开头
      // API端点示例: POST /api/notes
      return this._fetch("/notes", {
        method: "POST",
        body: JSON.stringify(note),
      });
    } else {
      // API端点示例: PUT /api/notes/some-db-id
      return this._fetch(`/notes/${note.id}`, {
        method: "PUT",
        body: JSON.stringify(note),
      });
    }
  }

  deleteNote(id) {
    // API端点示例: DELETE /api/notes/some-db-id
    return this._fetch(`/notes/${id}`, { method: "DELETE" });
  }

  clearPageNotes(pageUrl) {
    // API端点示例: DELETE /api/notes?pageUrl=/my-page
    return this._fetch(`/notes?pageUrl=${encodeURIComponent(pageUrl)}`, {
      method: "DELETE",
    });
  }

  clearAllNotes() {
    // API端点示例: DELETE /api/notes
    return this._fetch("/notes", { method: "DELETE" });
  }

  importData(data) {
    // API端点示例: POST /api/notes/import
    return this._fetch("/notes/import", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export { StorageProvider, IndexedDBStorageProvider, RemoteAPIStorageProvider };
