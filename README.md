# 📝 Sticky Notes Web Component

[English](#english) | [中文](#中文)

---

## 中文

一个功能强大的 Web Components 便签组件，支持本地存储（IndexedDB）和远程 API 存储。可以轻松集成到任何网站中，为用户提供页面级的便签功能。

### ✨ 特性

- 🎯 **Web Components 标准** - 可在任何现代浏览器和框架中使用
- 💾 **双存储模式** - 支持 IndexedDB 本地存储和远程 API 存储
- 🎨 **多色彩主题** - 5种预设颜色（黄色、蓝色、绿色、粉色、紫色）
- 📍 **自由拖拽** - 可在页面任意位置创建和移动便签
- 📄 **页面隔离** - 每个页面的便签独立存储和显示
- 🔄 **数据导入导出** - 支持便签数据的备份和迁移
- 🎭 **显示控制** - 可隐藏/显示所有便签
- 🚀 **SPA 友好** - 自动监听路由变化，适配单页应用
- 🔌 **OpenResty 后端** - 提供完整的 Lua API 实现（支持文件和 SQLite 存储）

### 📦 安装

#### 通过 npm/pnpm

```bash
npm install @muyiluop/sticky-notes
# 或
pnpm add @muyiluop/sticky-notes
```

#### 通过 CDN

```html
<script type="module" src="https://unpkg.com/@muyiluop/sticky-notes/dist/sticky-notes.js"></script>
```

#### 本地构建

```bash
# 克隆项目
git clone https://github.com/muyiluop/sticky-notes.git
cd sticky-notes

# 安装依赖
pnpm install

# 构建
pnpm build

# 开发模式
pnpm dev
```

### 🚀 快速开始

#### 1. 使用 IndexedDB 本地存储（默认）

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>我的网站</title>
</head>
<body>
  <!-- 你的页面内容 -->
  <h1>欢迎访问我的网站</h1>

  <!-- 添加便签组件 -->
  <sticky-notes></sticky-notes>

  <!-- 引入组件脚本 -->
  <script type="module" src="./dist/sticky-notes.js"></script>
</body>
</html>
```

#### 2. 使用远程 API 存储

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>我的网站</title>
</head>
<body>
  <h1>欢迎访问我的网站</h1>

  <!-- 配置远程存储 -->
  <sticky-notes
    storage-type="remote"
    api-base-url="https://your-api.com/api"
    api-auth-token="your-optional-token">
  </sticky-notes>

  <script type="module" src="./dist/sticky-notes.js"></script>
</body>
</html>
```

### 🎮 使用说明

1. **打开控制面板** - 点击页面右侧的圆形按钮
2. **创建便签** - 点击"新建便签"按钮
3. **编辑内容** - 直接在便签上输入文字
4. **移动便签** - 拖动便签头部可移动位置
5. **更改颜色** - 点击便签上的调色板图标选择颜色
6. **删除便签** - 点击便签上的删除图标
7. **导出数据** - 在控制面板中点击"导出数据"
8. **导入数据** - 在控制面板中点击"导入数据"并选择 JSON 文件
9. **清空便签** - 可选择清空当前页面或所有页面的便签

### 📝 组件属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `storage-type` | `string` | `"indexeddb"` | 存储类型：`"indexeddb"` 或 `"remote"` |
| `api-base-url` | `string` | - | 远程 API 的基础 URL（使用 remote 存储时必填） |
| `api-auth-token` | `string` | - | API 认证令牌（可选） |

### 🔌 后端 API 部署

项目提供了两种后端实现供选择：

#### 选项 1: Node.js 服务器（推荐）

完整的 Express.js 实现，易于部署和开发。

**前置要求：**
- Node.js 18.0.0 或更高版本

**快速开始：**

```bash
cd src/server/nodejs
npm install
npm start
```

服务器将在 `http://localhost:3000` 启动。

详细文档请参考：[Node.js Server README](./src/server/nodejs/README.md)

**特性：**
- ✅ 零配置开箱即用
- ✅ 支持文件和 SQLite 存储
- ✅ 可选的 Bearer Token 认证
- ✅ 完整的 CORS 支持
- ✅ 开发模式自动重启

#### 选项 2: OpenResty/Lua 服务器

高性能的 Lua 实现，适合已有 OpenResty 环境的部署。

**特性：**
- ✅ 极致性能和低延迟
- ✅ 支持文件和 SQLite 存储
- ✅ 可选的 Bearer Token 认证
- ✅ 低内存占用
- ✅ 与 Nginx 配置无缝集成

#### 前置要求

- OpenResty 1.19.3.1 或更高版本
- Lua 5.1+
- `lua-cjson` 模块（OpenResty 自带）
- （可选）`resty.sqlite` 模块（如果使用 SQLite 存储）

#### 快速部署

1. **复制 Lua 脚本**

```bash
cp src/server/lua/notes_api.lua /usr/local/openresty/nginx/lua/
```

2. **配置 nginx.conf**

```nginx
http {
    # ... 其他配置 ...

    server {
        listen 80;
        server_name your-domain.com;

        location /api/ {
            default_type application/json;
            content_by_lua_file lua/notes_api.lua;
        }
    }
}
```

3. **创建数据目录**

```bash
# 对于文件存储（默认）
mkdir -p /usr/local/openresty/nginx/db/notes_files
chown -R nobody:nobody /usr/local/openresty/nginx/db
chmod -R 750 /usr/local/openresty/nginx/db

# 对于 SQLite 存储，确保数据库文件路径可写
touch /usr/local/openresty/nginx/db/notes.db
chown nobody:nobody /usr/local/openresty/nginx/db/notes.db
```

4. **配置存储方式和认证**

编辑 `notes_api.lua` 文件头部：

```lua
-- 选择存储方式: "file" 或 "sqlite"
local storage_type = "file"

-- 数据存储的根路径
local data_base_path = "/usr/local/openresty/nginx/db/"

-- 认证配置（生产环境建议启用）
local auth_enabled = false  -- 设置为 true 启用认证
local auth_token = "your-secret-token-change-this"  -- 设置强密码
```

5. **重启 OpenResty**

```bash
openresty -s reload
```

#### API 接口文档

详细的 API 接口说明请参考 [docs/notes_api_interface.md](./docs/notes_api_interface.md)

**接口概览：**

- `GET /api/health` - 健康检查
- `GET /api/notes?pageUrl=xxx` - 获取便签（可选按页面过滤）
- `POST /api/notes` - 创建/更新便签
- `PUT /api/notes/:id` - 更新特定便签
- `DELETE /api/notes/:id?pageUrl=xxx` - 删除便签
- `DELETE /api/notes?pageUrl=xxx` - 清空便签（可选按页面过滤）
- `POST /api/notes/import` - 批量导入便签

#### 存储方式对比

| 特性 | 文件存储 | SQLite 存储 |
|------|----------|-------------|
| 依赖 | 无 | 需要 `resty.sqlite` 模块 |
| 性能 | 中等 | 较高 |
| 并发 | 有限制（文件锁） | 支持更好 |
| 查询 | 基于文件扫描 | 支持 SQL 查询 |
| 适用场景 | 小规模部署 | 生产环境/大规模部署 |

### 🛠️ 开发

#### 项目结构

```
sticky-notes/
├── src/
│   ├── StickyNotes.js       # 主组件
│   ├── StorageProvider.js   # 存储提供者（IndexedDB & Remote API）
│   ├── icons.js             # SVG 图标库
│   └── server/              # 后端实现
│       ├── nodejs/          # Node.js 服务器
│       │   ├── server.js    # Express 服务器
│       │   ├── config.js    # 配置文件
│       │   ├── storage/     # 存储提供者
│       │   └── README.md    # Node.js 文档
│       └── lua/             # OpenResty 实现
│           └── notes_api.lua # Lua API 脚本
├── types/
│   └── sticky-notes.d.ts    # TypeScript 类型定义
├── docs/
│   └── notes_api_interface.md  # API 接口文档
├── index.html               # 本地存储演示页面
├── index-remote.html        # 远程存储演示页面
├── vite.config.js           # Vite 构建配置
└── package.json
```

#### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问 http://localhost:5173
```

#### 构建生产版本

```bash
pnpm build
```

构建产物：
- `dist/sticky-notes.js` - ES Module 格式
- `dist/sticky-notes.umd.cjs` - UMD 格式（兼容旧浏览器）
- `types/sticky-notes.d.ts` - TypeScript 类型定义

### 🎨 自定义样式

组件使用 CSS 变量，可以通过覆盖这些变量来自定义样式：

```css
sticky-notes {
  --note-bg-yellow: #fffbe6;
  --note-bg-blue: #e7f3ff;
  --note-bg-green: #e3fcef;
  --note-bg-pink: #ffeff7;
  --note-bg-purple: #f3e7ff;
  --panel-bg: #ffffff;
  --panel-text: #333;
  --primary-color: #007aff;
  --danger-color: #ff3b30;
}
```

### 🔐 安全建议

1. **API 认证** - 生产环境中务必启用 API 认证
2. **CORS 配置** - 正确配置跨域资源共享
3. **输入验证** - API 端需验证用户输入
4. **权限控制** - 根据需求实现用户级权限隔离
5. **HTTPS** - 生产环境使用 HTTPS 协议

### 📄 许可证

MIT License

### 👨‍💻 作者

muyiluop

### 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## English

A powerful Web Components-based sticky notes component with support for both local storage (IndexedDB) and remote API storage. Easily integrate into any website to provide page-level note-taking functionality.

### ✨ Features

- 🎯 **Web Components Standard** - Works with any modern browser and framework
- 💾 **Dual Storage Modes** - Supports IndexedDB local storage and remote API storage
- 🎨 **Multiple Color Themes** - 5 preset colors (yellow, blue, green, pink, purple)
- 📍 **Free Dragging** - Create and move notes anywhere on the page
- 📄 **Page Isolation** - Notes are stored and displayed independently per page
- 🔄 **Import/Export** - Backup and migrate note data
- 🎭 **Display Control** - Hide/show all notes
- 🚀 **SPA Friendly** - Automatically detects route changes for single-page applications
- 🔌 **OpenResty Backend** - Complete Lua API implementation (supports file and SQLite storage)

### 📦 Installation

#### Via npm/pnpm

```bash
npm install @muyiluop/sticky-notes
# or
pnpm add @muyiluop/sticky-notes
```

#### Via CDN

```html
<script type="module" src="https://unpkg.com/@muyiluop/sticky-notes/dist/sticky-notes.js"></script>
```

#### Local Build

```bash
# Clone repository
git clone https://github.com/muyiluop/sticky-notes.git
cd sticky-notes

# Install dependencies
pnpm install

# Build
pnpm build

# Development mode
pnpm dev
```

### 🚀 Quick Start

#### 1. Using IndexedDB Local Storage (Default)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Website</title>
</head>
<body>
  <!-- Your page content -->
  <h1>Welcome to My Website</h1>

  <!-- Add sticky notes component -->
  <sticky-notes></sticky-notes>

  <!-- Include component script -->
  <script type="module" src="./dist/sticky-notes.js"></script>
</body>
</html>
```

#### 2. Using Remote API Storage

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Website</title>
</head>
<body>
  <h1>Welcome to My Website</h1>

  <!-- Configure remote storage -->
  <sticky-notes
    storage-type="remote"
    api-base-url="https://your-api.com/api"
    api-auth-token="your-optional-token">
  </sticky-notes>

  <script type="module" src="./dist/sticky-notes.js"></script>
</body>
</html>
```

### 🎮 Usage Guide

1. **Open Control Panel** - Click the circular button on the right side
2. **Create Note** - Click "New Note" button
3. **Edit Content** - Type directly in the note
4. **Move Note** - Drag the note header to reposition
5. **Change Color** - Click the palette icon on the note
6. **Delete Note** - Click the delete icon on the note
7. **Export Data** - Click "Export Data" in the control panel
8. **Import Data** - Click "Import Data" and select a JSON file
9. **Clear Notes** - Choose to clear notes for current page or all pages

### 📝 Component Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `storage-type` | `string` | `"indexeddb"` | Storage type: `"indexeddb"` or `"remote"` |
| `api-base-url` | `string` | - | Base URL for remote API (required when using remote storage) |
| `api-auth-token` | `string` | - | API authentication token (optional) |

### 🔌 Backend API Deployment

The project provides two backend implementation options:

#### Option 1: Node.js Server (Recommended)

Complete Express.js implementation, easy to deploy and develop.

**Prerequisites:**
- Node.js 18.0.0 or higher

**Quick Start:**

```bash
cd src/server/nodejs
npm install
npm start
```

Server will start at `http://localhost:3000`.

For detailed documentation, see: [Node.js Server README](./src/server/nodejs/README.md)

**Features:**
- ✅ Zero-config out of the box
- ✅ File and SQLite storage support
- ✅ Optional Bearer Token authentication
- ✅ Full CORS support
- ✅ Development mode with auto-restart

#### Option 2: OpenResty/Lua Server

High-performance Lua implementation for existing OpenResty environments.

**Features:**
- ✅ Extreme performance and low latency
- ✅ File and SQLite storage support
- ✅ Optional Bearer Token authentication
- ✅ Low memory footprint
- ✅ Seamless Nginx configuration integration

#### Prerequisites

- OpenResty 1.19.3.1 or higher
- Lua 5.1+
- `lua-cjson` module (included with OpenResty)
- (Optional) `resty.sqlite` module (for SQLite storage)

#### Quick Deployment

1. **Copy Lua Script**

```bash
cp src/server/lua/notes_api.lua /usr/local/openresty/nginx/lua/
```

2. **Configure nginx.conf**

```nginx
http {
    # ... other configurations ...

    server {
        listen 80;
        server_name your-domain.com;

        location /api/ {
            default_type application/json;
            content_by_lua_file lua/notes_api.lua;
        }
    }
}
```

3. **Create Data Directory**

```bash
# For file storage (default)
mkdir -p /usr/local/openresty/nginx/db/notes_files
chown -R nobody:nobody /usr/local/openresty/nginx/db
chmod -R 750 /usr/local/openresty/nginx/db

# For SQLite storage, ensure database file path is writable
touch /usr/local/openresty/nginx/db/notes.db
chown nobody:nobody /usr/local/openresty/nginx/db/notes.db
```

4. **Configure Storage Type and Authentication**

Edit the header of `notes_api.lua`:

```lua
-- Choose storage type: "file" or "sqlite"
local storage_type = "file"

-- Data storage root path
local data_base_path = "/usr/local/openresty/nginx/db/"

-- Authentication configuration (recommended for production)
local auth_enabled = false  -- Set to true to enable authentication
local auth_token = "your-secret-token-change-this"  -- Set a strong token
```

5. **Restart OpenResty**

```bash
openresty -s reload
```

#### API Documentation

For detailed API interface documentation, see [docs/notes_api_interface.md](./docs/notes_api_interface.md)

**API Overview:**

- `GET /api/health` - Health check
- `GET /api/notes?pageUrl=xxx` - Get notes (optional page filter)
- `POST /api/notes` - Create/update note
- `PUT /api/notes/:id` - Update specific note
- `DELETE /api/notes/:id?pageUrl=xxx` - Delete note
- `DELETE /api/notes?pageUrl=xxx` - Clear notes (optional page filter)
- `POST /api/notes/import` - Batch import notes

#### Storage Comparison

| Feature | File Storage | SQLite Storage |
|---------|--------------|----------------|
| Dependencies | None | Requires `resty.sqlite` |
| Performance | Medium | Higher |
| Concurrency | Limited (file locks) | Better support |
| Query | File scanning | SQL queries |
| Use Case | Small deployments | Production/large scale |

### 🛠️ Development

#### Project Structure

```
sticky-notes/
├── src/
│   ├── StickyNotes.js       # Main component
│   ├── StorageProvider.js   # Storage providers (IndexedDB & Remote API)
│   ├── icons.js             # SVG icon library
│   └── server/              # Backend implementations
│       ├── nodejs/          # Node.js server
│       │   ├── server.js    # Express server
│       │   ├── config.js    # Configuration
│       │   ├── storage/     # Storage providers
│       │   └── README.md    # Node.js documentation
│       └── lua/             # OpenResty implementation
│           └── notes_api.lua # Lua API script
├── types/
│   └── sticky-notes.d.ts    # TypeScript type definitions
├── docs/
│   └── notes_api_interface.md  # API interface documentation
├── index.html               # Local storage demo page
├── index-remote.html        # Remote storage demo page
├── vite.config.js           # Vite build configuration
└── package.json
```

#### Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Visit http://localhost:5173
```

#### Build Production Version

```bash
pnpm build
```

Build outputs:
- `dist/sticky-notes.js` - ES Module format
- `dist/sticky-notes.umd.cjs` - UMD format (legacy browser support)
- `types/sticky-notes.d.ts` - TypeScript type definitions

### 🎨 Custom Styling

The component uses CSS variables for easy customization:

```css
sticky-notes {
  --note-bg-yellow: #fffbe6;
  --note-bg-blue: #e7f3ff;
  --note-bg-green: #e3fcef;
  --note-bg-pink: #ffeff7;
  --note-bg-purple: #f3e7ff;
  --panel-bg: #ffffff;
  --panel-text: #333;
  --primary-color: #007aff;
  --danger-color: #ff3b30;
}
```

### 🔐 Security Recommendations

1. **API Authentication** - Enable authentication in production
2. **CORS Configuration** - Properly configure cross-origin resource sharing
3. **Input Validation** - Validate user input on API side
4. **Access Control** - Implement user-level permission isolation as needed
5. **HTTPS** - Use HTTPS protocol in production

### 📄 License

MIT License

### 👨‍💻 Author

muyiluop

### 🤝 Contributing

Issues and Pull Requests are welcome!
