--[[
    ╔══════════════════════════════════════════════════════╗
    ║           d4rk_livemap – server/main.lua             ║
    ║   Spieler-Registry + Marker-API + HTTP-Interface     ║
    ╚══════════════════════════════════════════════════════╝
]]

local players     = {}
local markers     = {}
local playerCache = {}
local cacheTime   = 0

-- ─────────────────────────────────────────────────────────
-- Hintergrund-Thread: Inaktive Spieler aufräumen
-- ─────────────────────────────────────────────────────────

CreateThread(function()
    while true do
        Wait(30000)
        local now, removed = os.time(), 0
        for id, p in pairs(players) do
            if (now - (p.updatedAt or 0)) >= 30 then
                players[id] = nil
                playerCache = {}
                removed = removed + 1
            end
        end
        if removed > 0 then
            DebugLog(('%d inaktive Spieler entfernt.'):format(removed))
        end
    end
end)

-- ─────────────────────────────────────────────────────────
-- Hilfsfunktionen
-- ─────────────────────────────────────────────────────────

function DebugLog(msg)
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

local function GetCookieHeader(req)
    if not req.headers then return nil end
    return req.headers['cookie'] or req.headers['Cookie'] or req.headers['COOKIE']
end

local function GetPlayerList()
    local now = os.time()
    if #playerCache > 0 and (now - cacheTime) < 1 then
        return playerCache
    end
    local list = {}
    for _, p in pairs(players) do table.insert(list, p) end
    playerCache = list
    cacheTime   = now
    return list
end

local function GetMarkerList()
    local list = {}
    for _, m in pairs(markers) do table.insert(list, m) end
    return list
end

-- Baut den Set-Cookie Header-String
local function MakeSessionCookie(token, maxAge)
    return ('dm_session=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=%d'):format(
        token, maxAge or Config.Discord.SessionExpiry or 86400
    )
end

-- ─────────────────────────────────────────────────────────
-- Net Events (Client → Server)
-- ─────────────────────────────────────────────────────────

RegisterNetEvent('d4rk_livemap:updatePosition', function(data)
    local src  = source
    local name = GetPlayerName(src) or ('Spieler ' .. src)

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
    playerCache = {}
    DebugLog(('Position: %s → %.1f / %.1f'):format(name, data.x, data.y))
end)

RegisterNetEvent('d4rk_livemap:playerLeft', function()
    local src    = source
    players[src] = nil
    playerCache  = {}
    DebugLog(('Spieler %d disconnected'):format(src))
end)

AddEventHandler('playerDropped', function()
    local src    = source
    players[src] = nil
    playerCache  = {}
end)

-- ─────────────────────────────────────────────────────────
-- Exports
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
        if m.source == source then markers[id] = nil; n = n + 1 end
    end
    return n
end)

exports('GetMarkers', function() return GetMarkerList() end)
exports('GetPlayers', function() return GetPlayerList() end)

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
    local cookieHeader = GetCookieHeader(req)

    DebugLog(('HTTP: %s'):format(path))

    -- ════════════════════════════════════════════════════
    -- AUTH-ROUTEN (immer öffentlich, kein Login nötig)
    -- ════════════════════════════════════════════════════

    -- Login-Seite ausliefern
    if path == '/d4rk_livemap/login' or path == '/login' then
        local html = LoadResourceFile(GetCurrentResourceName(), 'web/login.html')
        if not html then
            res.writeHead(500, { ['Content-Type'] = 'text/plain' })
            res.send('login.html nicht gefunden'); return
        end
        res.writeHead(200, { ['Content-Type'] = 'text/html; charset=utf-8' })
        res.send(html); return
    end

    -- Weiterleitung zu Discord OAuth starten
    if path == '/d4rk_livemap/auth/login' or path == '/auth/login' then
        if not Config.Discord or not Config.Discord.Enabled then
            res.writeHead(302, { ['Location'] = '/d4rk_livemap/' })
            res.send(''); return
        end
        res.writeHead(302, { ['Location'] = Auth_GetOAuthURL() })
        res.send(''); return
    end

    -- Discord OAuth2 Callback verarbeiten
    if path == '/d4rk_livemap/auth/callback' or path == '/auth/callback' then
        local code = query.code

        if not code then
            res.writeHead(302, { ['Location'] = '/d4rk_livemap/login?error=no_code' })
            res.send(''); return
        end

        -- Auth_HandleCallback nutzt Citizen.Await → läuft im Coroutine-Context
        local token, err = Auth_HandleCallback(code)

        if token then
            -- Erfolg: Session-Cookie setzen + zur Karte weiterleiten
            res.writeHead(302, {
                ['Location']   = '/d4rk_livemap/',
                ['Set-Cookie'] = MakeSessionCookie(token),
            })
            res.send('')
        else
            -- Fehler: zur Login-Seite mit Fehlermeldung
            res.writeHead(302, {
                ['Location'] = '/d4rk_livemap/login?error=' .. (err or 'unknown')
            })
            res.send('')
        end
        return
    end

    -- Logout
    if path == '/d4rk_livemap/auth/logout' or path == '/auth/logout' then
        Auth_Logout(cookieHeader)
        res.writeHead(302, {
            ['Location']   = '/d4rk_livemap/login',
            ['Set-Cookie'] = 'dm_session=; Path=/; HttpOnly; Max-Age=0',
        })
        res.send(''); return
    end

    -- ════════════════════════════════════════════════════
    -- AUTH-PRÜFUNG für alle weiteren Routen
    -- ════════════════════════════════════════════════════

    local isAuthed, session = Auth_ValidateSession(cookieHeader)

    if not isAuthed then
        -- API-Endpunkte → 401 JSON zurückgeben
        local isApiRoute = path:find('/data') or path:find('/players')
            or path:find('/markers') or path:find('/stats')

        if isApiRoute then
            JsonResponse(res, 401, {
                error    = 'Nicht authentifiziert',
                login    = '/d4rk_livemap/auth/login',
                message  = 'Bitte einloggen um die API zu nutzen.',
            })
        else
            -- Web-Seiten → zur Login-Seite weiterleiten
            res.writeHead(302, { ['Location'] = '/d4rk_livemap/login' })
            res.send('')
        end
        return
    end

    -- ════════════════════════════════════════════════════
    -- TILE-AUSLIEFERUNG
    -- ════════════════════════════════════════════════════

    local tileZ, tileX, tileY = path:match('/tiles/(%d+)/(%d+)/(%d+)%.jpg$')
    if tileZ then
        local z, x, y  = tonumber(tileZ), tonumber(tileX), tonumber(tileY)
        local maxTile   = math.pow(2, z) - 1

        if x < 0 or y < 0 or x > maxTile or y > maxTile then
            res.writeHead(204, { ['Content-Type'] = 'image/jpeg' })
            res.send(''); return
        end

        local filePath = ('web/tiles/%s/%s/%s.jpg'):format(tileZ, tileX, tileY)
        local data     = LoadResourceFile(GetCurrentResourceName(), filePath)

        if data then
            res.writeHead(200, {
                ['Content-Type']  = 'image/jpeg',
                ['Cache-Control'] = 'public, max-age=86400',
            })
            res.send(data)
        else
            res.writeHead(204, { ['Content-Type'] = 'image/jpeg' })
            res.send('')
        end
        return
    end

    -- ════════════════════════════════════════════════════
    -- WEB-INTERFACE
    -- ════════════════════════════════════════════════════

    if path == '/' or path == '/d4rk_livemap/' or path == '/d4rk_livemap'
        or path == '/index.html' or path == '/d4rk_livemap/index.html' then
        local html = LoadResourceFile(GetCurrentResourceName(), 'web/index.html')
        if not html then
            res.writeHead(500, { ['Content-Type'] = 'text/plain' })
            res.send('index.html nicht gefunden'); return
        end
        -- Session-Infos als JSON-Meta-Tag einbetten (für die Login-Anzeige in der Topbar)
        local sessionJson = '{}'
        if session then
            sessionJson = json.encode({
                username = session.username,
                avatar   = session.avatar,
                userId   = session.userId,
            })
        end
        html = html:gsub('%%SESSION_JSON%%', sessionJson)
        res.writeHead(200, { ['Content-Type'] = 'text/html; charset=utf-8' })
        res.send(html); return
    end

    -- ════════════════════════════════════════════════════
    -- API-ENDPUNKTE
    -- ════════════════════════════════════════════════════

    -- Kombinierte Daten (Spieler + Marker)
    if path == '/d4rk_livemap/data' or path == '/data' then
        local plist = GetPlayerList()
        local mlist = GetMarkerList()
        JsonResponse(res, 200, {
            players     = plist,
            markers     = mlist,
            playerCount = #plist,
            timestamp   = os.time(),
        }); return
    end

    -- Nur Spieler
    if path == '/d4rk_livemap/players' or path == '/players' then
        local list = GetPlayerList()
        JsonResponse(res, 200, {
            players   = list,
            count     = #list,
            timestamp = os.time(),
        }); return
    end

    -- Nur Marker
    if path == '/d4rk_livemap/markers' or path == '/markers' then
        local list = GetMarkerList()
        JsonResponse(res, 200, {
            markers   = list,
            count     = #list,
            timestamp = os.time(),
        }); return
    end

    -- Marker hinzufügen
    if path == '/d4rk_livemap/markers/add' or path == '/markers/add' then
        local id = query.id
        local x  = tonumber(query.x)
        local y  = tonumber(query.y)
        if not id or not x or not y then
            JsonResponse(res, 400, { error = 'id, x, y sind Pflicht' }); return
        end
        markers[id] = {
            id     = id, x = x, y = y,
            z      = tonumber(query.z) or 0,
            label  = query.label or id,
            color  = query.color or '#00d4aa',
            icon   = query.icon or 'default',
            group  = query.group or 'Sonstiges',
            source = query.source or 'http',
        }
        JsonResponse(res, 200, { success = true, id = id }); return
    end

    -- Marker entfernen
    if path == '/d4rk_livemap/markers/remove' or path == '/markers/remove' then
        local id = query.id
        if not id then JsonResponse(res, 400, { error = 'id ist Pflicht' }); return end
        markers[id] = nil
        JsonResponse(res, 200, { success = true }); return
    end

    -- Marker nach Quelle löschen
    if path == '/d4rk_livemap/markers/clear' or path == '/markers/clear' then
        local src, n = query.source, 0
        for mid, m in pairs(markers) do
            if not src or m.source == src then markers[mid] = nil; n = n + 1 end
        end
        JsonResponse(res, 200, { success = true, removed = n }); return
    end

    -- Stats
    if path == '/d4rk_livemap/stats' or path == '/stats' then
        local plist   = GetPlayerList()
        local mlist   = GetMarkerList()
        local groups  = {}
        for _, m in ipairs(mlist) do
            local g = m.group or 'Sonstiges'
            groups[g] = (groups[g] or 0) + 1
        end
        local groupArr = {}
        for g, c in pairs(groups) do table.insert(groupArr, { group = g, count = c }) end

        -- Session-Infos in Stats einbetten (optional)
        local sessionData = nil
        if session then
            sessionData = { username = session.username, avatar = session.avatar }
        end

        JsonResponse(res, 200, {
            players       = #plist,
            markers       = #mlist,
            marker_groups = groupArr,
            uptime        = GetGameTimer() / 1000,
            timestamp     = os.time(),
            session       = sessionData,
        }); return
    end

    -- Aktive Sessions (nur für Debug, nur wenn Debug-Modus an)
    if path == '/d4rk_livemap/auth/sessions' and Config.Debug then
        local list = {}
        for t, s in pairs(Sessions) do
            table.insert(list, {
                token   = t:sub(1, 8) .. '...',
                user    = s.username,
                expires = s.expires - os.time(),
            })
        end
        JsonResponse(res, 200, { sessions = list, count = #list }); return
    end

    -- 404
    JsonResponse(res, 404, {
        error     = 'Not Found',
        available = { '/', '/data', '/players', '/markers', '/markers/add', '/markers/remove', '/markers/clear', '/stats' },
    })
end)

print('[d4rk_livemap] Gestartet → http://SERVER_IP:30120/d4rk_livemap/')
print('[d4rk_livemap] Discord Auth: ' .. (Config.Discord and Config.Discord.Enabled and '✓ Aktiv' or '✗ Deaktiviert'))
