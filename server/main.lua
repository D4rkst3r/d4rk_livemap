--[[
    ╔══════════════════════════════════════════════════════╗
    ║           d4rk_livemap – server/main.lua             ║
    ║   Spieler-Registry + Marker-API + HTTP-Interface     ║
    ╚══════════════════════════════════════════════════════╝
]]

local players = {} -- [serverId] = { id, name, x, y, z, heading, inVeh, veh, updatedAt }
local markers = {} -- [id]       = { id, x, y, z, label, color, icon, group, source }

-- ─────────────────────────────────────────────────────────
-- Hilfsfunktionen
-- ─────────────────────────────────────────────────────────

local function DebugLog(msg)
    if Config.Debug then print('[d4rk_livemap] ' .. tostring(msg)) end
end

local function ParseRequest(fullPath)
    local path     = fullPath:match('^([^%?]+)') or fullPath
    local query    = {}
    local queryStr = fullPath:match('%?(.+)$')
    if queryStr then
        for k, v in queryStr:gmatch('([^&=]+)=([^&]*)') do
            v = v:gsub('%%(%x%x)', function(h) return string.char(tonumber(h, 16)) end)
            v = v:gsub('+', ' ')
            query[k] = v
        end
    end
    return path, query
end

local function JsonResponse(res, status, data)
    res.writeHead(status, {
        ['Content-Type']                = 'application/json',
        ['Access-Control-Allow-Origin'] = '*',
    })
    res.send(json.encode(data))
end

local function GetPlayerList()
    local list = {}
    local now  = os.time()
    for id, p in pairs(players) do
        -- Spieler die seit 30s kein Update geschickt haben entfernen
        if (now - (p.updatedAt or 0)) < 30 then
            table.insert(list, p)
        else
            players[id] = nil
        end
    end
    return list
end

local function GetMarkerList()
    local list = {}
    for _, m in pairs(markers) do table.insert(list, m) end
    return list
end

-- ─────────────────────────────────────────────────────────
-- Net Events (Client → Server)
-- ─────────────────────────────────────────────────────────

RegisterNetEvent('d4rk_livemap:updatePosition', function(data)
    local src    = source
    local name   = GetPlayerName(src) or ('Spieler ' .. src)

    players[src] = {
        id        = src,
        name      = name,
        x         = data.x,
        y         = data.y,
        z         = data.z,
        heading   = data.heading,
        inVeh     = data.inVeh,
        veh       = data.veh,
        updatedAt = os.time(),
    }
    DebugLog(('Position: %s → %.1f / %.1f'):format(name, data.x, data.y))
end)

RegisterNetEvent('d4rk_livemap:playerLeft', function()
    local src = source
    players[src] = nil
    DebugLog(('Spieler %d disconnected'):format(src))
end)

AddEventHandler('playerDropped', function()
    local src = source
    players[src] = nil
end)

-- ─────────────────────────────────────────────────────────
-- Exports (für andere Ressourcen)
-- ─────────────────────────────────────────────────────────

exports('AddMarker', function(data)
    if not data or not data.id or not data.x or not data.y then
        print('[d4rk_livemap] AddMarker: id, x, y sind Pflicht'); return false
    end
    markers[tostring(data.id)] = {
        id     = tostring(data.id),
        x      = tonumber(data.x) or 0,
        y      = tonumber(data.y) or 0,
        z      = tonumber(data.z) or 0,
        label  = data.label or tostring(data.id),
        color  = data.color or '#00d4aa',
        icon   = data.icon or 'default',
        group  = data.group or 'Sonstiges',
        source = data.source or 'unknown',
    }
    return true
end)

exports('RemoveMarker', function(id)
    markers[tostring(id)] = nil; return true
end)

exports('ClearMarkers', function(source)
    local n = 0
    for id, m in pairs(markers) do
        if m.source == source then
            markers[id] = nil; n = n + 1
        end
    end
    return n
end)

exports('GetMarkers', function()
    return GetMarkerList()
end)

exports('GetPlayers', function()
    return GetPlayerList()
end)

-- ─────────────────────────────────────────────────────────
-- HTTP Handler
-- ─────────────────────────────────────────────────────────

SetHttpHandler(function(req, res)
    if req.method == 'OPTIONS' then
        res.writeHead(200, {
            ['Access-Control-Allow-Origin']  = '*',
            ['Access-Control-Allow-Headers'] = 'Content-Type',
            ['Access-Control-Allow-Methods'] = 'GET, OPTIONS',
        })
        res.send(''); return
    end

    local path, query = ParseRequest(req.path or '/')
    DebugLog(('HTTP: %s'):format(path))

    -- ── Web-Interface ─────────────────────────────────────
    if path == '/' or path == '/d4rk_livemap/' or path == '/d4rk_livemap'
        or path == '/index.html' or path == '/d4rk_livemap/index.html' then
        local html = LoadResourceFile(GetCurrentResourceName(), 'web/index.html')
        if not html then
            res.writeHead(500, { ['Content-Type'] = 'text/plain' }); res.send('index.html nicht gefunden'); return
        end
        res.writeHead(200, { ['Content-Type'] = 'text/html; charset=utf-8' })
        res.send(html); return
    end

    -- ── Kombinierte Daten (Spieler + Marker) ──────────────
    if path == '/d4rk_livemap/data' or path == '/data' then
        JsonResponse(res, 200, {
            players     = GetPlayerList(),
            markers     = GetMarkerList(),
            playerCount = #GetPlayerList(),
            timestamp   = os.time(),
        }); return
    end

    -- ── Nur Spieler ───────────────────────────────────────
    if path == '/d4rk_livemap/players' or path == '/players' then
        local list = GetPlayerList()
        JsonResponse(res, 200, {
            players   = list,
            count     = #list,
            timestamp = os.time(),
        }); return
    end

    -- ── Nur Marker ────────────────────────────────────────
    if path == '/d4rk_livemap/markers' or path == '/markers' then
        local list = GetMarkerList()
        JsonResponse(res, 200, {
            markers   = list,
            count     = #list,
            timestamp = os.time(),
        }); return
    end

    -- ── Marker hinzufügen ─────────────────────────────────
    if path == '/d4rk_livemap/markers/add' or path == '/markers/add' then
        local id = query.id
        local x  = tonumber(query.x)
        local y  = tonumber(query.y)
        if not id or not x or not y then
            JsonResponse(res, 400, { error = 'id, x, y sind Pflicht' }); return
        end
        markers[id] = {
            id     = id,
            x      = x,
            y      = y,
            z      = tonumber(query.z) or 0,
            label  = query.label or id,
            color  = query.color or '#00d4aa',
            icon   = query.icon or 'default',
            group  = query.group or 'Sonstiges',
            source = query.source or 'http',
        }
        JsonResponse(res, 200, { success = true, id = id }); return
    end

    -- ── Marker entfernen ──────────────────────────────────
    if path == '/d4rk_livemap/markers/remove' or path == '/markers/remove' then
        local id = query.id
        if not id then
            JsonResponse(res, 400, { error = 'id ist Pflicht' }); return
        end
        markers[id] = nil
        JsonResponse(res, 200, { success = true }); return
    end

    -- ── Marker nach Gruppe löschen ─────────────────────────
    if path == '/d4rk_livemap/markers/clear' or path == '/markers/clear' then
        local src = query.source
        local n   = 0
        for mid, m in pairs(markers) do
            if not src or m.source == src then
                markers[mid] = nil; n = n + 1
            end
        end
        JsonResponse(res, 200, { success = true, removed = n }); return
    end

    -- ── Stats ─────────────────────────────────────────────
    if path == '/d4rk_livemap/stats' or path == '/stats' then
        local plist = GetPlayerList()
        local mlist = GetMarkerList()
        local groups = {}
        for _, m in ipairs(mlist) do
            local g = m.group or 'Sonstiges'
            groups[g] = (groups[g] or 0) + 1
        end
        local groupArr = {}
        for g, c in pairs(groups) do table.insert(groupArr, { group = g, count = c }) end
        JsonResponse(res, 200, {
            players       = #plist,
            markers       = #mlist,
            marker_groups = groupArr,
            uptime        = GetGameTimer() / 1000,
            timestamp     = os.time(),
        }); return
    end

    JsonResponse(res, 404, {
        error     = 'Not Found',
        available = { '/', '/data', '/players', '/markers', '/markers/add', '/markers/remove', '/markers/clear', '/stats' },
    })
end)

print('[d4rk_livemap] Gestartet → http://SERVER_IP:30120/d4rk_livemap/')
print('[d4rk_livemap] API       → http://SERVER_IP:30120/d4rk_livemap/data')
