# Sticky Notes - Node.js API Server

A complete Node.js backend implementation for the Sticky Notes web component. Provides RESTful API endpoints with support for both file-based and SQLite storage.

## 📋 Features

- 🚀 **Express.js** - Fast and minimal web framework
- 💾 **Dual Storage** - File-based or SQLite storage options
- 🔐 **Optional Authentication** - Bearer token authentication support
- 🌐 **CORS Support** - Configurable cross-origin resource sharing
- 🔄 **Auto-reload** - Development mode with auto-restart on file changes
- 📦 **Zero Config** - Works out of the box with sensible defaults
- 🛡️ **Error Handling** - Comprehensive error handling and logging

## 🔧 Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or pnpm

### Install Dependencies

```bash
cd src/server/nodejs
npm install
# or
pnpm install
```

## 🚀 Quick Start

### 1. Basic Setup (File Storage)

```bash
# Start server with default configuration
npm start
```

Server will start at `http://localhost:3000` with file-based storage in `./data/notes_files/`.

### 2. Using Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start server
npm start
```

### 3. Development Mode

```bash
# Auto-restart on file changes (Node.js 18+)
npm run dev
```

## ⚙️ Configuration

Configuration can be done via environment variables or by editing `config.js`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `STORAGE_TYPE` | `file` | Storage type: `file` or `sqlite` |
| `DATA_BASE_PATH` | `./data` | Base path for data storage |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |
| `AUTH_ENABLED` | `false` | Enable bearer token authentication |
| `AUTH_TOKEN` | `""` | Bearer token for authentication |

### Storage Configuration

#### File Storage (Default)

```env
STORAGE_TYPE=file
DATA_BASE_PATH=./data
```

**Directory Structure:**
```
data/
├── index.json              # Index of all page files
└── notes_files/
    ├── <base64-hash>.json  # Notes for page 1
    ├── <base64-hash>.json  # Notes for page 2
    └── ...
```

#### SQLite Storage

```env
STORAGE_TYPE=sqlite
DATA_BASE_PATH=./data
```

**Database Structure:**
- Database file: `./data/notes.db`
- Table: `notes` with columns: `id`, `pageUrl`, `content`, `x`, `y`, `color`, `created_at`, `updated_at`

### Authentication

Enable authentication for production environments:

```env
AUTH_ENABLED=true
AUTH_TOKEN=your-very-secret-token-here
```

Client requests must include the authorization header:
```
Authorization: Bearer your-very-secret-token-here
```

### CORS Configuration

```env
# Allow all origins (development)
CORS_ORIGIN=*

# Allow specific origins (production)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

## 📡 API Endpoints

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "storage": "file",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### Get Notes

```http
GET /api/notes?pageUrl=/my-page
```

**Query Parameters:**
- `pageUrl` (optional) - Filter notes by page URL

**Response:**
```json
[
  {
    "id": "note-123",
    "pageUrl": "/my-page",
    "content": "My note content",
    "x": 100,
    "y": 200,
    "color": "yellow"
  }
]
```

### Create/Update Note

```http
POST /api/notes
Content-Type: application/json

{
  "id": "note-123",
  "pageUrl": "/my-page",
  "content": "My note content",
  "x": 100,
  "y": 200,
  "color": "yellow"
}
```

**Response:** `201 Created`
```json
{
  "id": "note-123",
  "pageUrl": "/my-page",
  "content": "My note content",
  "x": 100,
  "y": 200,
  "color": "yellow"
}
```

### Update Specific Note

```http
PUT /api/notes/:id
Content-Type: application/json

{
  "pageUrl": "/my-page",
  "content": "Updated content",
  "x": 150,
  "y": 250,
  "color": "blue"
}
```

**Response:** `200 OK`

### Delete Note

```http
DELETE /api/notes/:id?pageUrl=/my-page
```

**Query Parameters:**
- `pageUrl` - Required for file storage, optional for SQLite

**Response:** `204 No Content`

### Clear Notes

```http
DELETE /api/notes?pageUrl=/my-page
```

**Query Parameters:**
- `pageUrl` (optional) - If provided, clear only that page's notes. Otherwise, clear all.

**Response:** `204 No Content`

### Import Data

```http
POST /api/notes/import
Content-Type: application/json

[
  {
    "id": "note-1",
    "pageUrl": "/page1",
    "content": "Note 1",
    "x": 100,
    "y": 100,
    "color": "yellow"
  },
  {
    "id": "note-2",
    "pageUrl": "/page2",
    "content": "Note 2",
    "x": 200,
    "y": 200,
    "color": "blue"
  }
]
```

**Response:** `201 Created`
```json
{
  "message": "Import successful.",
  "count": 2
}
```

## 🔒 Security Best Practices

### Production Deployment

1. **Enable Authentication**
   ```env
   AUTH_ENABLED=true
   AUTH_TOKEN=<generate-strong-random-token>
   ```

2. **Configure CORS**
   ```env
   CORS_ORIGIN=https://yourdomain.com
   ```

3. **Use HTTPS**
   - Deploy behind a reverse proxy (nginx, Apache)
   - Use SSL/TLS certificates

4. **Set Proper Permissions**
   ```bash
   # Ensure data directory has proper permissions
   chmod 750 ./data
   chown node:node ./data
   ```

5. **Use Process Manager**
   ```bash
   # Use PM2 or similar for production
   npm install -g pm2
   pm2 start server.js --name sticky-notes-api
   ```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

CMD ["node", "server.js"]
```

### Build and Run

```bash
docker build -t sticky-notes-api .
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e STORAGE_TYPE=file \
  -e AUTH_ENABLED=true \
  -e AUTH_TOKEN=your-secret-token \
  --name sticky-notes-api \
  sticky-notes-api
```

## 🚀 Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name sticky-notes-api

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

### Using systemd

Create `/etc/systemd/system/sticky-notes.service`:

```ini
[Unit]
Description=Sticky Notes API Server
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/opt/sticky-notes-api
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=STORAGE_TYPE=file

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable sticky-notes
sudo systemctl start sticky-notes
sudo systemctl status sticky-notes
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🧪 Testing

### Using curl

```bash
# Health check
curl http://localhost:3000/api/health

# Get all notes
curl http://localhost:3000/api/notes

# Create note
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-1",
    "pageUrl": "/test",
    "content": "Test note",
    "x": 100,
    "y": 100,
    "color": "yellow"
  }'

# With authentication
curl http://localhost:3000/api/notes \
  -H "Authorization: Bearer your-token-here"
```

### Using Postman

Import the following collection or create requests manually:
- Base URL: `http://localhost:3000`
- Authorization: Bearer Token (if enabled)

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Change port in .env or use environment variable
PORT=3001 npm start
```

### Permission Denied on Data Directory

```bash
# Create and set permissions
mkdir -p data/notes_files
chmod 755 data
```

### SQLite Database Locked

- Ensure no other process is accessing the database
- Check file permissions
- Consider using WAL mode for better concurrency

### CORS Errors

- Check `CORS_ORIGIN` configuration
- Ensure client sends correct origin header
- Test with `CORS_ORIGIN=*` first, then restrict

## 📊 Storage Comparison

| Feature | File Storage | SQLite Storage |
|---------|--------------|----------------|
| Setup Complexity | Simple | Simple |
| Dependencies | None | better-sqlite3 |
| Performance | Good for small datasets | Better for large datasets |
| Concurrency | Limited | Good |
| Query Capabilities | Basic | Advanced (SQL) |
| Backup | Copy files | Database dump |
| Recommended For | Development, small deployments | Production, large deployments |

## 🔄 Migration Between Storage Types

### File to SQLite

```bash
# Export from file storage
curl http://localhost:3000/api/notes > backup.json

# Change storage type
STORAGE_TYPE=sqlite

# Import to SQLite
curl -X POST http://localhost:3000/api/notes/import \
  -H "Content-Type: application/json" \
  -d @backup.json
```

### SQLite to File

Same process, just reverse the storage types.

## 📚 Project Structure

```
nodejs/
├── server.js              # Main server file
├── config.js              # Configuration
├── package.json           # Dependencies
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore file
├── README.md             # This file
├── storage/
│   ├── FileStorage.js    # File storage implementation
│   └── SqliteStorage.js  # SQLite storage implementation
└── data/                 # Data directory (created on first run)
    ├── index.json        # File storage index
    ├── notes_files/      # File storage directory
    └── notes.db          # SQLite database
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - See root LICENSE file

## 🔗 Related

- [Main Project README](../../../README.md)
- [Lua/OpenResty Implementation](../lua/notes_api.lua)
- [API Interface Documentation](../../../docs/notes_api_interface.md)

## 💬 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review API interface documentation

---

**Made with ❤️ by zyang**