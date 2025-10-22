-- ===================================================================
-- CONFIGURATION
-- ===================================================================
-- 在这里选择您的存储方式: "sqlite" 或 "file"
local storage_type = "file"

-- 数据存储的根路径
local data_base_path = "/usr/local/openresty/nginx/db/"

-- 认证配置
-- 设置为 true 启用 Bearer Token 认证
local auth_enabled = false
-- 如果启用认证，设置您的 token（请使用强密码）
local auth_token = "your-secret-token-change-this"

-- ===================================================================
-- UTILITIES
-- ===================================================================
local cjson = require "cjson"
cjson.encode_empty_table_as_object(false)

local function send_response(status, body)
    ngx.status = status
    -- 明确 Content-Type，避免浏览器触发下载
    ngx.header["Content-Type"] = "application/json; charset=utf-8"
    -- 清除可能导致下载的头
    ngx.header["Content-Disposition"] = nil

    if status ~= 204 and body ~= nil then
        ngx.say(cjson.encode(body))
    end

    return ngx.exit(ngx.status)
end

local function send_error(status, message)
    ngx.log(ngx.ERR, message)
    send_response(status, { error = true, message = message })
end

-- ===================================================================
-- AUTHENTICATION
-- ===================================================================
local function check_auth()
    if not auth_enabled then
        return true
    end

    local auth_header = ngx.var.http_authorization
    if not auth_header then
        send_error(401, "Unauthorized: Missing authorization header")
        return false
    end

    local token = string.match(auth_header, "^Bearer%s+(.+)$")
    if not token then
        send_error(401, "Unauthorized: Invalid authorization header format")
        return false
    end

    if token ~= auth_token then
        send_error(401, "Unauthorized: Invalid token")
        return false
    end

    return true
end

-- ===================================================================
-- FILE STORAGE PROVIDER
-- ===================================================================
-- 说明:
-- - 我们使用一个 index.json 来记录有哪些 page 文件存在。
-- - index.json 存放在 data_base_path .. "notes_files/index.json"
-- - 所有写入采用临时文件 + os.rename 来尽量保证原子性。
local FileStorage = {}
FileStorage.__index = FileStorage

function FileStorage:new(base_path)
    local self = setmetatable({}, FileStorage)
    self.base_path = base_path
    if string.sub(self.base_path, -1) ~= "/" then
        self.base_path = self.base_path .. "/"
    end
    self.index_path = self.base_path .. "index.json"
    return self
end

local function atomic_write(path, content)
    local tmp = path .. ".tmp"
    local f, err = io.open(tmp, "w")
    if not f then return false, "open tmp failed: " .. tostring(err) end
    f:write(content)
    f:close()
    -- try rename (atomic on same FS)
    local ok, renerr = os.rename(tmp, path)
    if not ok then
        -- fallback: try remove existing and rename again
        os.remove(path)
        ok, renerr = os.rename(tmp, path)
        if not ok then
            return false, "rename failed: " .. tostring(renerr)
        end
    end
    return true
end

function FileStorage:_ensure_dir()
    -- create dir if not exists using mkdir -p
    local cmd = 'mkdir -p "' .. self.base_path .. '"'
    os.execute(cmd)
    -- return true always (mkdir -p is idempotent)
    return true
end

function FileStorage:_load_index()
    local file = io.open(self.index_path, "r")
    if not file then return {} end
    local content = file:read("*a")
    file:close()
    if not content or content == "" then return {} end
    local ok, data = pcall(cjson.decode, content)
    if not ok or type(data) ~= "table" then return {} end
    return data
end

function FileStorage:_save_index(index_table)
    local ok, err = atomic_write(self.index_path, cjson.encode(index_table))
    if not ok then return false, err end
    return true
end

function FileStorage:_get_filepath(pageUrl)
    pageUrl = pageUrl or ""
    local b64 = ngx.encode_base64(pageUrl)
    local filename = string.gsub(b64, "[^%w%-_]", "") -- 保留字母数字、- 和 _
    return self.base_path .. filename .. ".json"
end

function FileStorage:_read_page_data(pageUrl)
    local filepath = self:_get_filepath(pageUrl)
    local file = io.open(filepath, "r")
    if not file then return {} end
    local content = file:read("*a")
    file:close()
    if not content or content == "" then return {} end
    local ok, data = pcall(cjson.decode, content)
    if not ok then
        ngx.log(ngx.ERR, "Failed to decode JSON from file: ", filepath)
        return {}
    end
    return data
end

function FileStorage:_write_page_data(pageUrl, notes_table)
    local ok, err = self:_ensure_dir()
    if not ok then return false, err end
    local filepath = self:_get_filepath(pageUrl)
    local ok2, err2 = atomic_write(filepath, cjson.encode(notes_table))
    if not ok2 then return false, err2 end
    return true
end

function FileStorage:getNotesForPage(pageUrl)
    return self:_read_page_data(pageUrl)
end

function FileStorage:getAllNotes()
    local all_notes = {}
    local index = self:_load_index()
    for filename, _ in pairs(index) do
        local filepath = self.base_path .. filename .. ".json"
        local file = io.open(filepath, "r")
        if file then
            local content = file:read("*a")
            file:close()
            local ok, data = pcall(cjson.decode, content)
            if ok and type(data) == "table" then
                for _, note in ipairs(data) do
                    table.insert(all_notes, note)
                end
            end
        end
    end
    return all_notes
end

local function index_add(self, pageUrl)
    local filename = string.gsub(ngx.encode_base64(pageUrl), "[^%w%-_]", "")
    local index = self:_load_index()
    index[filename] = true
    local ok, err = self:_save_index(index)
    if not ok then ngx.log(ngx.ERR, "Failed to save index: ", tostring(err)) end
end

local function index_remove(self, pageUrl)
    local filename = string.gsub(ngx.encode_base64(pageUrl), "[^%w%-_]", "")
    local index = self:_load_index()
    index[filename] = nil
    local ok, err = self:_save_index(index)
    if not ok then ngx.log(ngx.ERR, "Failed to save index: ", tostring(err)) end
end

function FileStorage:saveNote(note)
    if not note or not note.pageUrl then
        return nil
    end
    local notes = self:_read_page_data(note.pageUrl)
    local found = false
    for i, existing_note in ipairs(notes) do
        if existing_note.id == note.id then
            notes[i] = note
            found = true
            break
        end
    end
    if not found then
        table.insert(notes, note)
    end
    local ok, err = self:_write_page_data(note.pageUrl, notes)
    if not ok then send_error(500, "Failed to write note file: " .. tostring(err)) end
    index_add(self, note.pageUrl)
    return note
end

function FileStorage:deleteNote(id, pageUrl)
    if not pageUrl then return false, "pageUrl is required for file storage deletion" end
    local notes = self:_read_page_data(pageUrl)
    local new_notes = {}
    for _, existing_note in ipairs(notes) do
        if existing_note.id ~= id then
            table.insert(new_notes, existing_note)
        end
    end
    if #new_notes == 0 then
        -- remove file and update index
        local filepath = self:_get_filepath(pageUrl)
        os.remove(filepath)
        index_remove(self, pageUrl)
    else
        local ok, err = self:_write_page_data(pageUrl, new_notes)
        if not ok then return false, err end
    end
    return true
end

function FileStorage:clearPageNotes(pageUrl)
    local filepath = self:_get_filepath(pageUrl)
    os.remove(filepath)
    index_remove(self, pageUrl)
    return true
end

function FileStorage:clearAllNotes()
    local index = self:_load_index()
    for filename, _ in pairs(index) do
        local filepath = self.base_path .. filename .. ".json"
        os.remove(filepath)
    end
    -- write empty index
    local ok, err = self:_save_index({})
    if not ok then send_error(500, "Failed to clear index: " .. tostring(err)) end
    return true
end

function FileStorage:importData(data)
    -- 清空现有
    self:clearAllNotes()
    -- 按 pageUrl 分组并写入
    local pages = {}
    for _, note in ipairs(data or {}) do
        pages[note.pageUrl] = pages[note.pageUrl] or {}
        table.insert(pages[note.pageUrl], note)
    end
    for pageUrl, notes in pairs(pages) do
        local ok, err = self:_write_page_data(pageUrl, notes)
        if not ok then send_error(500, "Failed to import page " .. tostring(pageUrl) .. ": " .. tostring(err)) end
        index_add(self, pageUrl)
    end
    return true
end

-- ===================================================================
-- SQLITE STORAGE PROVIDER
-- ===================================================================
local SqliteStorage = {}
SqliteStorage.__index = SqliteStorage

function SqliteStorage:new(db_filepath)
    local self = setmetatable({}, SqliteStorage)
    local sqlite = require "resty.sqlite"
    local db, err = sqlite:new(db_filepath)
    if not db then
        ngx.log(ngx.ERR, "failed to open database: ", err)
        return nil, "Could not connect to database."
    end
    self.db = db
    return self
end

function SqliteStorage:getNotesForPage(pageUrl)
    local query = "SELECT * FROM notes WHERE pageUrl = :pageUrl"
    local notes, err = self.db:query(query, { pageUrl = pageUrl })
    if not notes then send_error(500, "Failed to fetch notes: " .. err) end
    return notes
end

function SqliteStorage:getAllNotes()
    local notes, err = self.db:query("SELECT * FROM notes")
    if not notes then send_error(500, "Failed to fetch all notes: " .. err) end
    return notes
end

function SqliteStorage:saveNote(note)
    local query = [[
        INSERT INTO notes (id, pageUrl, content, x, y, color)
        VALUES (:id, :pageUrl, :content, :x, :y, :color)
        ON CONFLICT(id) DO UPDATE SET
        pageUrl=excluded.pageUrl, content=excluded.content, x=excluded.x, y=excluded.y, color=excluded.color, updated_at=CURRENT_TIMESTAMP;
    ]]
    local res, err = self.db:query(query, note)
    if not res then send_error(500, "Failed to save note: " .. err) end
    return note
end

function SqliteStorage:deleteNote(id)
    local res, err = self.db:query("DELETE FROM notes WHERE id = :id", { id = id })
    if not res then send_error(500, "Failed to delete note: " .. err) end
    return true
end

function SqliteStorage:clearPageNotes(pageUrl)
    local res, err = self.db:query("DELETE FROM notes WHERE pageUrl = :pageUrl", { pageUrl = pageUrl })
    if not res then send_error(500, "Failed to clear page notes: " .. err) end
    return true
end

function SqliteStorage:clearAllNotes()
    local res, err = self.db:query("DELETE FROM notes")
    if not res then send_error(500, "Failed to clear all notes: " .. err) end
    return true
end

function SqliteStorage:importData(data)
    local ok, err = self.db:begin()
    if not ok then send_error(500, "Failed to start transaction: " .. err) end

    local res, err = self.db:query("DELETE FROM notes")
    if not res then
        self.db:rollback(); send_error(500, "Failed to clear notes for import: " .. err)
    end

    for _, note in ipairs(data) do
        res, err = self.db:query(
            "INSERT INTO notes (id, pageUrl, content, x, y, color) VALUES (:id, :pageUrl, :content, :x, :y, :color)",
            note)
        if not res then
            self.db:rollback(); send_error(500, "Failed to import note: " .. err)
        end
    end

    ok, err = self.db:commit()
    if not ok then send_error(500, "Failed to commit transaction: " .. err) end
    return true
end

-- ===================================================================
-- INITIALIZE STORAGE
-- ===================================================================
local storage, err
if storage_type == "file" then
    -- 使用 index.json 管理文件列表
    local notes_dir = data_base_path .. "notes_files/"
    storage = FileStorage:new(notes_dir)
    -- 尝试创建目录并确保 index 存在
    storage:_ensure_dir()
    local idx = storage:_load_index()
    if not idx or type(idx) ~= "table" then
        storage:_save_index({})
    end
elseif storage_type == "sqlite" then
    storage, err = SqliteStorage:new(data_base_path .. "notes.db")
    if not storage then
        send_error(500, "Internal Server Error: " .. err)
    end
else
    send_error(500, "Internal Server Error: Invalid storage_type configured.")
end

-- ===================================================================
-- MAIN ROUTING LOGIC
-- ===================================================================
ngx.req.read_body()
local request_body = ngx.req.get_body_data()
local data
if request_body and #request_body > 0 then
    local ok
    ok, data = pcall(cjson.decode, request_body)
    if not ok then send_error(400, "Bad Request: Invalid JSON format.") end
end

local method = ngx.var.request_method
local args = ngx.req.get_uri_args()
local uri = ngx.var.uri

-- 1. 健康检查 (不需要认证)
if uri == "/api/health" then
    send_response(200, { status = "ok", storage = storage_type, auth_enabled = auth_enabled })
end

-- 验证身份 (除了健康检查外的所有端点)
if not check_auth() then
    return
end

-- 2. 获取便签
if uri == "/api/notes" and method == "GET" then
    local notes
    if args.pageUrl then
        notes = storage:getNotesForPage(args.pageUrl)
    else
        notes = storage:getAllNotes()
    end
    send_response(200, notes)
end

-- 3. 创建/更新便签
if uri == "/api/notes" and (method == "POST" or method == "PUT") then
    local note_data = data
    if method == "PUT" then
        local id = string.match(uri, "/api/notes/([^/]+)")
        if id then note_data.id = id end
    end
    if not note_data or not note_data.id or not note_data.pageUrl then
        send_error(400, "Bad Request: Missing required fields (id, pageUrl).")
    end
    local saved_note = storage:saveNote(note_data)
    send_response(201, saved_note)
end

-- 4. 更新特定便签
if string.match(uri, "/api/notes/([^/]+)") and method == "PUT" then
    local id = string.match(uri, "/api/notes/([^/]+)")
    data.id = id
    local saved_note = storage:saveNote(data)
    send_response(200, saved_note)
end

-- 5. 删除特定便签
if string.match(uri, "/api/notes/([^/]+)") and method == "DELETE" then
    local id = string.match(uri, "/api/notes/([^/]+)")
    -- 对于文件存储，我们需要 pageUrl 来找到文件
    storage:deleteNote(id, args.pageUrl)
    send_response(204, nil)
end

-- 6. 清除便签
if uri == "/api/notes" and method == "DELETE" then
    if args.pageUrl then
        storage:clearPageNotes(args.pageUrl)
    else
        storage:clearAllNotes()
    end
    send_response(204, nil)
end

-- 7. 导入数据
if uri == "/api/notes/import" and method == "POST" then
    storage:importData(data)
    send_response(201, { message = "Import successful." })
end

-- 如果没有匹配的路由
send_error(404, "Not Found")
