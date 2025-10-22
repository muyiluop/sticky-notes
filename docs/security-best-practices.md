# 安全最佳实践 / Security Best Practices

[中文](#中文) | [English](#english)

---

## 中文

本文档提供 Sticky Notes API 服务器的安全配置和最佳实践指南。

### 🔐 认证配置

#### Node.js 服务器

**启用认证：**

编辑 `.env` 文件：

```env
AUTH_ENABLED=true
AUTH_TOKEN=your-very-strong-secret-token-here
```

**生成安全 Token：**

```bash
# 方法 1: 使用 OpenSSL
openssl rand -base64 32

# 方法 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法 3: 使用 UUID
uuidgen
```

**客户端使用：**

```javascript
// 前端配置
<sticky-notes 
  storage-type="remote"
  api-base-url="https://your-api.com/api"
  auth-token="your-very-strong-secret-token-here">
</sticky-notes>
```

```javascript
// JavaScript fetch 示例
fetch('https://your-api.com/api/notes', {
  headers: {
    'Authorization': 'Bearer your-very-strong-secret-token-here'
  }
})
```

#### OpenResty/Lua 服务器

**启用认证：**

编辑 `notes_api.lua` 文件：

```lua
-- 认证配置
local auth_enabled = true  -- 启用认证
local auth_token = "your-very-strong-secret-token-here"  -- 设置强密码
```

**重启服务：**

```bash
openresty -s reload
```

### 🌐 CORS 配置

#### Node.js 服务器

**开发环境（允许所有来源）：**

```env
CORS_ORIGIN=*
```

**生产环境（限制特定域名）：**

```env
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

**高级 CORS 配置：**

编辑 `config.js`：

```javascript
cors: {
  origin: function(origin, callback) {
    const allowedOrigins = ['https://yourdomain.com', 'https://app.yourdomain.com'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

#### OpenResty/Lua 服务器

**配置 Nginx：**

```nginx
location /api/ {
    # 添加 CORS 头
    add_header 'Access-Control-Allow-Origin' 'https://yourdomain.com' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;

    # 处理 OPTIONS 请求
    if ($request_method = 'OPTIONS') {
        return 204;
    }

    default_type application/json;
    content_by_lua_file lua/notes_api.lua;
}
```

### 🔒 HTTPS 配置

#### 使用 Let's Encrypt（免费 SSL 证书）

**安装 Certbot：**

```bash
# Ubuntu/Debian
sudo apt-get install certbot

# CentOS/RHEL
sudo yum install certbot
```

**获取证书：**

```bash
sudo certbot certonly --standalone -d api.yourdomain.com
```

#### Node.js + Nginx 反向代理

**Nginx 配置：**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
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

#### OpenResty HTTPS 配置

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /api/ {
        default_type application/json;
        content_by_lua_file lua/notes_api.lua;
    }
}
```

### 🛡️ 防火墙配置

#### UFW (Ubuntu)

```bash
# 允许 SSH
sudo ufw allow 22/tcp

# 允许 HTTP 和 HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

#### firewalld (CentOS/RHEL)

```bash
# 允许 HTTP 和 HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# 重载配置
sudo firewall-cmd --reload
```

### 🚫 IP 限制

#### Node.js 服务器

**安装 express-rate-limit：**

```bash
npm install express-rate-limit
```

**配置速率限制：**

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 限制 100 个请求
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);
```

**IP 白名单：**

```javascript
const allowedIPs = ['192.168.1.100', '10.0.0.1'];

app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (allowedIPs.includes(clientIP)) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
  }
});
```

#### OpenResty/Nginx 服务器

**IP 限制：**

```nginx
location /api/ {
    # 只允许特定 IP
    allow 192.168.1.0/24;
    allow 10.0.0.1;
    deny all;

    default_type application/json;
    content_by_lua_file lua/notes_api.lua;
}
```

**速率限制：**

```nginx
# 在 http 块中定义
http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            default_type application/json;
            content_by_lua_file lua/notes_api.lua;
        }
    }
}
```

### 📁 文件权限

#### Node.js 服务器

```bash
# 创建专用用户
sudo useradd -r -s /bin/false stickyapi

# 设置文件所有权
sudo chown -R stickyapi:stickyapi /opt/sticky-notes-api
sudo chown -R stickyapi:stickyapi /opt/sticky-notes-api/data

# 设置权限
sudo chmod 750 /opt/sticky-notes-api
sudo chmod 750 /opt/sticky-notes-api/data
sudo chmod 640 /opt/sticky-notes-api/.env
```

#### OpenResty 服务器

```bash
# 设置数据目录权限
sudo chown -R nobody:nobody /usr/local/openresty/nginx/db
sudo chmod 750 /usr/local/openresty/nginx/db
sudo chmod 750 /usr/local/openresty/nginx/db/notes_files

# 设置 Lua 脚本权限
sudo chmod 640 /usr/local/openresty/nginx/lua/notes_api.lua
```

### 🔍 日志和监控

#### Node.js 服务器

**安装 Winston 日志库：**

```bash
npm install winston
```

**配置日志：**

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// 记录请求
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  next();
});
```

#### OpenResty 服务器

**配置访问日志：**

```nginx
http {
    log_format api_log '$remote_addr - $remote_user [$time_local] '
                       '"$request" $status $body_bytes_sent '
                       '"$http_referer" "$http_user_agent" '
                       '"$http_authorization"';

    server {
        access_log /var/log/nginx/api_access.log api_log;
        error_log /var/log/nginx/api_error.log warn;

        location /api/ {
            default_type application/json;
            content_by_lua_file lua/notes_api.lua;
        }
    }
}
```

### 🔄 定期安全任务

#### 每日任务

```bash
# 检查日志中的异常活动
sudo tail -f /var/log/nginx/access.log | grep "401\|403\|404"

# 检查磁盘使用情况
df -h
```

#### 每周任务

```bash
# 更新系统包
sudo apt-get update && sudo apt-get upgrade

# 检查失败的登录尝试
sudo grep "Failed" /var/log/auth.log
```

#### 每月任务

```bash
# 备份数据
tar -czf backup-$(date +%Y%m%d).tar.gz /opt/sticky-notes-api/data

# 更换 API Token
# 生成新 token 并更新配置

# 检查 SSL 证书有效期
sudo certbot certificates
```

### 🚨 安全检查清单

**部署前检查：**

- [ ] 已启用 Bearer Token 认证
- [ ] 使用强随机 Token（至少 32 字符）
- [ ] 配置了 CORS 限制（不使用 `*`）
- [ ] 启用了 HTTPS
- [ ] 配置了防火墙规则
- [ ] 设置了正确的文件权限
- [ ] 配置了访问日志
- [ ] 设置了速率限制
- [ ] 数据目录有定期备份计划
- [ ] 测试了错误处理和边界情况

**生产环境检查：**

- [ ] 不暴露详细的错误信息
- [ ] 使用进程管理器（PM2/systemd）
- [ ] 配置了自动重启
- [ ] 设置了监控告警
- [ ] 定期更新依赖包
- [ ] 定期审查访问日志
- [ ] 定期更换 Token
- [ ] 有灾难恢复计划

### 📞 安全事件响应

**如果 Token 泄露：**

1. 立即生成新 Token
2. 更新服务器配置
3. 通知所有使用者更新
4. 检查日志查找异常访问
5. 考虑临时禁用 API

**如果发现异常访问：**

1. 记录相关 IP 和请求
2. 添加 IP 到黑名单
3. 审查访问日志
4. 检查数据完整性
5. 考虑增强认证措施

---

## English

This document provides security configuration and best practices for Sticky Notes API servers.

### 🔐 Authentication Configuration

#### Node.js Server

**Enable Authentication:**

Edit `.env` file:

```env
AUTH_ENABLED=true
AUTH_TOKEN=your-very-strong-secret-token-here
```

**Generate Secure Token:**

```bash
# Method 1: Using OpenSSL
openssl rand -base64 32

# Method 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Method 3: Using UUID
uuidgen
```

**Client Usage:**

```javascript
// Frontend configuration
<sticky-notes 
  storage-type="remote"
  api-base-url="https://your-api.com/api"
  auth-token="your-very-strong-secret-token-here">
</sticky-notes>
```

```javascript
// JavaScript fetch example
fetch('https://your-api.com/api/notes', {
  headers: {
    'Authorization': 'Bearer your-very-strong-secret-token-here'
  }
})
```

#### OpenResty/Lua Server

**Enable Authentication:**

Edit `notes_api.lua` file:

```lua
-- Authentication configuration
local auth_enabled = true  -- Enable authentication
local auth_token = "your-very-strong-secret-token-here"  -- Set strong token
```

**Restart Service:**

```bash
openresty -s reload
```

### 🌐 CORS Configuration

#### Node.js Server

**Development (Allow All Origins):**

```env
CORS_ORIGIN=*
```

**Production (Restrict to Specific Domains):**

```env
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

**Advanced CORS Configuration:**

Edit `config.js`:

```javascript
cors: {
  origin: function(origin, callback) {
    const allowedOrigins = ['https://yourdomain.com', 'https://app.yourdomain.com'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

#### OpenResty/Lua Server

**Configure Nginx:**

```nginx
location /api/ {
    # Add CORS headers
    add_header 'Access-Control-Allow-Origin' 'https://yourdomain.com' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;

    # Handle OPTIONS requests
    if ($request_method = 'OPTIONS') {
        return 204;
    }

    default_type application/json;
    content_by_lua_file lua/notes_api.lua;
}
```

### 🔒 HTTPS Configuration

#### Using Let's Encrypt (Free SSL Certificate)

**Install Certbot:**

```bash
# Ubuntu/Debian
sudo apt-get install certbot

# CentOS/RHEL
sudo yum install certbot
```

**Obtain Certificate:**

```bash
sudo certbot certonly --standalone -d api.yourdomain.com
```

#### Node.js + Nginx Reverse Proxy

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
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

### 🛡️ Firewall Configuration

#### UFW (Ubuntu)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

#### firewalld (CentOS/RHEL)

```bash
# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Reload configuration
sudo firewall-cmd --reload
```

### 🚫 IP Restrictions

#### Node.js Server

**Install express-rate-limit:**

```bash
npm install express-rate-limit
```

**Configure Rate Limiting:**

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit to 100 requests
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);
```

**IP Whitelist:**

```javascript
const allowedIPs = ['192.168.1.100', '10.0.0.1'];

app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (allowedIPs.includes(clientIP)) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
  }
});
```

#### OpenResty/Nginx Server

**IP Restrictions:**

```nginx
location /api/ {
    # Allow only specific IPs
    allow 192.168.1.0/24;
    allow 10.0.0.1;
    deny all;

    default_type application/json;
    content_by_lua_file lua/notes_api.lua;
}
```

**Rate Limiting:**

```nginx
# Define in http block
http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            default_type application/json;
            content_by_lua_file lua/notes_api.lua;
        }
    }
}
```

### 📁 File Permissions

#### Node.js Server

```bash
# Create dedicated user
sudo useradd -r -s /bin/false stickyapi

# Set file ownership
sudo chown -R stickyapi:stickyapi /opt/sticky-notes-api
sudo chown -R stickyapi:stickyapi /opt/sticky-notes-api/data

# Set permissions
sudo chmod 750 /opt/sticky-notes-api
sudo chmod 750 /opt/sticky-notes-api/data
sudo chmod 640 /opt/sticky-notes-api/.env
```

#### OpenResty Server

```bash
# Set data directory permissions
sudo chown -R nobody:nobody /usr/local/openresty/nginx/db
sudo chmod 750 /usr/local/openresty/nginx/db
sudo chmod 750 /usr/local/openresty/nginx/db/notes_files

# Set Lua script permissions
sudo chmod 640 /usr/local/openresty/nginx/lua/notes_api.lua
```

### 🔍 Logging and Monitoring

#### Node.js Server

**Install Winston Logging Library:**

```bash
npm install winston
```

**Configure Logging:**

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log requests
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  next();
});
```

#### OpenResty Server

**Configure Access Logs:**

```nginx
http {
    log_format api_log '$remote_addr - $remote_user [$time_local] '
                       '"$request" $status $body_bytes_sent '
                       '"$http_referer" "$http_user_agent" '
                       '"$http_authorization"';

    server {
        access_log /var/log/nginx/api_access.log api_log;
        error_log /var/log/nginx/api_error.log warn;

        location /api/ {
            default_type application/json;
            content_by_lua_file lua/notes_api.lua;
        }
    }
}
```

### 🔄 Regular Security Tasks

#### Daily Tasks

```bash
# Check logs for suspicious activity
sudo tail -f /var/log/nginx/access.log | grep "401\|403\|404"

# Check disk usage
df -h
```

#### Weekly Tasks

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade

# Check failed login attempts
sudo grep "Failed" /var/log/auth.log
```

#### Monthly Tasks

```bash
# Backup data
tar -czf backup-$(date +%Y%m%d).tar.gz /opt/sticky-notes-api/data

# Rotate API Token
# Generate new token and update configuration

# Check SSL certificate expiration
sudo certbot certificates
```

### 🚨 Security Checklist

**Pre-deployment Checks:**

- [ ] Bearer Token authentication enabled
- [ ] Strong random token used (at least 32 characters)
- [ ] CORS restrictions configured (not using `*`)
- [ ] HTTPS enabled
- [ ] Firewall rules configured
- [ ] Correct file permissions set
- [ ] Access logging configured
- [ ] Rate limiting set up
- [ ] Regular backup plan for data directory
- [ ] Error handling and edge cases tested

**Production Environment Checks:**

- [ ] Detailed error messages not exposed
- [ ] Process manager configured (PM2/systemd)
- [ ] Auto-restart configured
- [ ] Monitoring and alerts set up
- [ ] Dependencies regularly updated
- [ ] Access logs regularly reviewed
- [ ] Tokens regularly rotated
- [ ] Disaster recovery plan in place

### 📞 Security Incident Response

**If Token is Compromised:**

1. Immediately generate new token
2. Update server configuration
3. Notify all users to update
4. Check logs for suspicious access
5. Consider temporarily disabling API

**If Suspicious Access Detected:**

1. Log relevant IPs and requests
2. Add IPs to blacklist
3. Review access logs
4. Check data integrity
5. Consider strengthening authentication

---

**Made with ❤️ by zyang**