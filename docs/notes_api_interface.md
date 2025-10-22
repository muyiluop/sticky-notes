# Notes API 接口说明

此文档说明部署在 OpenResty 上的 notes_api.lua 提供的 HTTP 接口。默认脚本使用文件存储（index.json 管理页面文件），也可切换为 sqlite（需相应的 Lua sqlite 模块）。

## 基础路径
- 所有接口都以 `/api` 为前缀。

## 认证配置

脚本支持可选的 Bearer Token 认证。

**配置方式：** 编辑 `notes_api.lua` 文件头部：

```lua
-- 认证配置
local auth_enabled = false  -- 设置为 true 启用认证
local auth_token = "your-secret-token-change-this"  -- 设置您的 token
```

**使用认证：**

当 `auth_enabled = true` 时，所有请求（除了健康检查）都需要在请求头中包含：

```
Authorization: Bearer your-secret-token-change-this
```

**示例：**

```bash
curl -H "Authorization: Bearer your-secret-token-change-this" \
     http://your-api.com/api/notes
```

**注意：**
- 健康检查端点 `/api/health` 不需要认证
- 生产环境中务必修改默认 token 并启用认证
- 建议使用强随机字符串作为 token

1. 健康检查
- URL: GET /api/health
- 说明: 返回服务状态（用于探活）
- 认证: ❌ 不需要
- 响应:
  - 200 OK
  - Body: { "status": "ok", "storage": "<file|sqlite>", "auth_enabled": <true|false> }

2. 获取便签
- URL: GET /api/notes
- 认证: ✅ 需要（如果启用）
- Query 参数:
  - pageUrl (可选) — 指定页面 URL，只获取该页面的便签
- 说明:
  - 如果提供 pageUrl，则返回该 page 的便签列表（数组）
  - 否则返回所有便签（合并各页面便签）
- 响应:
  - 200 OK
  - Body: JSON 数组，包含 note 对象

3. 创建 / 更新便签 (UPSERT)
- URL: POST /api/notes
- URL: PUT /api/notes
- 认证: ✅ 需要（如果启用）
- Body: JSON，必须包含字段:
  - id (string) — 便签唯一 id
  - pageUrl (string) — 页面 URL
  - content (string) — 便签内容（可选）
  - x, y (number) — 位置信息（可选）
  - color (string) — 颜色（可选）
- 说明:
  - 用于创建或替换便签
- 响应:
  - 201 Created
  - Body: 保存后的 note 对象

4. 更新特定便签（兼容）
- URL: PUT /api/notes/:id
- 认证: ✅ 需要（如果启用）
- Body: JSON（与上面相同）
- 说明:
  - 通过 URL 中的 id 覆盖 body 中的 id，然后保存
- 响应:
  - 200 OK
  - Body: 保存后的 note 对象

5. 删除特定便签
- URL: DELETE /api/notes/:id
- 认证: ✅ 需要（如果启用）
- Query 参数:
  - pageUrl (string) — 对于文件存储，必须提供 pageUrl（用于定位文件）；对于 sqlite 可忽略
- 说明:
  - 删除指定 id 的便签
- 响应:
  - 204 No Content

6. 清除便签
- URL: DELETE /api/notes
- 认证: ✅ 需要（如果启用）
- Query 参数:
  - pageUrl (string, 可选) — 提供则只清除该页面的便签，否则清空所有便签
- 响应:
  - 204 No Content

7. 导入数据
- URL: POST /api/notes/import
- 认证: ✅ 需要（如果启用）
- Body: JSON 数组，数组元素为 note 对象（同创建字段）
- 说明:
  - 全量导入：先清空现存数据，然后插入
- 响应:
  - 201 Created
  - Body: { "message": "Import successful." }

## 错误处理
- 返回 JSON 格式错误体：{ "error": true, "message": "<描述>" }
- 常见状态码:
  - 400 Bad Request — 请求格式或缺少字段
  - 401 Unauthorized — 认证失败（缺少或无效的 token）
  - 404 Not Found — 路由未匹配
  - 500 Internal Server Error — 服务器内部错误（文件权限、缺依赖等）

## 注意事项 / 部署提示
- 文件存储（默认）：
  - 存储目录：`/usr/local/openresty/nginx/db/notes_files/`
  - 需要确保该目录存在并且 OpenResty 运行用户有读写权限：
    - mkdir -p /usr/local/openresty/nginx/db/notes_files
    - chown -R <openresty-user>:<group> /usr/local/openresty/nginx/db/notes_files
    - chmod -R 750 /usr/local/openresty/nginx/db/notes_files
  - index.json 会记录存在的页面文件列表，请勿手动破坏该文件格式。
- SQLite 存储：
  - 设置 `storage_type = "sqlite"` 并确保有可用的 Lua sqlite 库（脚本当前 require "resty.sqlite"）。
  - 数据库文件位置：`/usr/local/openresty/nginx/db/notes.db`
  - 确保进程对数据库文件有读写权限。
- Content-Type:
  - 所有 JSON 响应会带 `Content-Type: application/json; charset=utf-8`，以避免浏览器将响应当作下载。

## 使用示例
### 不使用认证

```bash
# 获取某页面便签
curl -i "http://localhost/api/notes?pageUrl=https://example.com"

# 创建便签
curl -X POST -H 'Content-Type: application/json' \
     -d '{"id":"abc123","pageUrl":"https://example.com","content":"hello"}' \
     http://localhost/api/notes
```

### 使用认证

```bash
# 设置 token 变量
TOKEN="your-secret-token-change-this"

# 获取某页面便签
curl -i -H "Authorization: Bearer $TOKEN" \
     "http://localhost/api/notes?pageUrl=https://example.com"

# 创建便签
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"id":"abc123","pageUrl":"https://example.com","content":"hello"}' \
     http://localhost/api/notes

# 导入数据
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H 'Content-Type: application/json' \
     -d @backup.json \
     http://localhost/api/notes/import
```

## 安全建议

1. **生产环境必须启用认证**
   ```lua
   local auth_enabled = true
   local auth_token = "使用强随机字符串"
   ```

2. **生成安全的 Token**
   ```bash
   # Linux/Mac
   openssl rand -base64 32
   
   # 或使用 uuid
   uuidgen
   ```

3. **使用 HTTPS**
   - 在生产环境中必须使用 HTTPS 协议
   - Bearer Token 在 HTTP 下容易被截获

4. **定期更换 Token**
   - 建议定期更换认证 token
   - 泄露后立即更换

5. **配置 Nginx 访问控制**
   ```nginx
   # 限制 IP 访问
   location /api/ {
       allow 192.168.1.0/24;
       deny all;
       content_by_lua_file lua/notes_api.lua;
   }
   ```
