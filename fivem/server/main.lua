--[[
    ╔══════════════════════════════════════════════════════╗
    ║              d4rk_api – server/main.lua              ║
    ║   Alle Routen unter /d4rk_api/internal/             ║
    ╚══════════════════════════════════════════════════════╝
]]

local players     = {}
local markers     = {}
local zones       = {}
local eventLog    = {}
local playerCache = {}
local cacheTime   = 0

local function DebugLog(msg)
    if Config.Debug then print('[d4rk_api] ' .. tostring(msg)) end
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

local function ValidateSecret(req, query)
    if not Config.InternalSecret or Config.InternalSecret == '' then return true end
    local headers = req.headers or {}
    -- Header prüfen
    local headerSecret = headers['x-internal-secret'] or headers['X-Internal-Secret']
    if headerSecret == Config.InternalSecret then return true end
    -- Query-Parameter als Fallback
    local querySecret = (query or {})['token']
    return querySecret == Config.InternalSecret
end

local function Dist2D(x1, y1, x2, y2)
    return math.sqrt((x2-x1)^2 + (y2-y1)^2)
end

local function GetPlayerList()
    local now = os.time()
    if #playerCache > 0 and (now - cacheTime) < 1 then return playerCache end
    local list = {}
    for _, p in pairs(players) do table.insert(list, p) end
    playerCache = list; cacheTime = now
    return list
end

local function GetMarkerList()
    local list = {}
    for _, m in pairs(markers) do table.insert(list, m) end
    return list
end

local function GetZoneList()
    local list = {}
    for _, z in pairs(zones) do table.insert(list, z) end
    return list
end

local function LogEvent(t, data)
    table.insert(eventLog, 1, { type = t, data = data, timestamp = os.time() })
    while #eventLog > (Config.MaxEventLog or 200) do table.remove(eventLog) end
end

-- Cleanup Thread
CreateThread(function()
    while true do
        Wait(30000)
        local now, n = os.time(), 0
        for id, p in pairs(players) do
            if (now - (p.updatedAt or 0)) >= 30 then
                players[id] = nil; playerCache = {}; n = n + 1
            end
        end
        if n > 0 then DebugLog(n .. ' inaktive Spieler entfernt.') end
    end
end)

-- Net Events
RegisterNetEvent('d4rk_api:updatePosition', function(data)
    local src = source
    players[src] = {
        id = src, name = GetPlayerName(src) or ('Spieler '..src),
        x = data.x, y = data.y, z = data.z,
        heading = data.heading, inVeh = data.inVeh, veh = data.veh,
        updatedAt = os.time(),
    }
    playerCache = {}
end)

RegisterNetEvent('d4rk_api:playerLeft', function()
    local src = source
    if players[src] then LogEvent('playerLeave', {id=src, name=players[src].name}) end
    players[src] = nil; playerCache = {}
end)

AddEventHandler('playerDropped', function()
    local src = source
    if players[src] then LogEvent('playerLeave', {id=src, name=players[src].name}) end
    players[src] = nil; playerCache = {}
end)

AddEventHandler('playerConnecting', function(name)
    LogEvent('playerJoin', { id = source, name = name })
end)

-- Exports
exports('AddMarker', function(data)
    if not data or not data.id or not data.x or not data.y then return false end
    markers[tostring(data.id)] = {
        id=tostring(data.id), x=tonumber(data.x) or 0, y=tonumber(data.y) or 0,
        z=tonumber(data.z) or 0, label=data.label or tostring(data.id),
        color=data.color or '#00d4aa', icon=data.icon or 'default',
        group=data.group or 'Sonstiges', source=data.source or 'unknown',
    }
    return true
end)
exports('RemoveMarker', function(id) markers[tostring(id)] = nil; return true end)
exports('ClearMarkers', function(src)
    local n = 0
    for id, m in pairs(markers) do if m.source == src then markers[id]=nil; n=n+1 end end
    return n
end)
exports('GetMarkers', function() return GetMarkerList() end)
exports('GetPlayers', function() return GetPlayerList() end)
exports('GetZones',   function() return GetZoneList() end)

-- HTTP Handler
SetHttpHandler(function(req, res)
    if req.method == 'OPTIONS' then
        res.writeHead(200, {
            ['Access-Control-Allow-Origin']  = '*',
            ['Access-Control-Allow-Headers'] = 'Content-Type, X-Internal-Secret',
            ['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS',
        })
        res.send(''); return
    end

    local path, query = ParseRequest(req.path or '/')
    DebugLog(('HTTP %s: %s'):format(req.method, path))

if not ValidateSecret(req, query) then  -- ← query übergeben
    JsonResponse(res, 403, { error = 'Ungültiger Internal-Secret' }); return
end

    -- Präfix normalisieren: /d4rk_api/internal/ → /i/
    local route = path:match('^/d4rk_api/internal/(.*)$')
           or path:match('^/internal/(.*)$')
           or path:match('^/d4rk_api/(.*)$')
           or path:match('^/(.+)$')
           or ''

    -- ── data ──────────────────────────────────────────────────
    if route == 'data' then
        local plist = GetPlayerList()
        JsonResponse(res, 200, {
            players=plist, markers=GetMarkerList(), zones=GetZoneList(),
            playerCount=#plist, timestamp=os.time(),
        }); return
    end

    -- ── stats ─────────────────────────────────────────────────
    if route == 'stats' then
        local mlist = GetMarkerList()
        local groups, garr = {}, {}
        for _, m in ipairs(mlist) do local g=m.group or 'Sonstiges'; groups[g]=(groups[g] or 0)+1 end
        for g, c in pairs(groups) do table.insert(garr, {group=g,count=c}) end
        JsonResponse(res, 200, {
            players=#GetPlayerList(), markers=#mlist, zones=#GetZoneList(),
            marker_groups=garr, uptime=math.floor(GetGameTimer()/1000), timestamp=os.time(),
        }); return
    end

    -- ── server ────────────────────────────────────────────────
    if route == 'server' then
        JsonResponse(res, 200, {
            name=GetConvar('sv_hostname','FiveM Server'),
            maxPlayers=GetConvarInt('sv_maxclients',32),
            players=#GetPlayerList(), uptime=math.floor(GetGameTimer()/1000), timestamp=os.time(),
        }); return
    end

    -- ── health ────────────────────────────────────────────────
    if route == 'health' then
        JsonResponse(res, 200, {
            status='ok', players=#GetPlayerList(), markers=#GetMarkerList(),
            uptime=math.floor(GetGameTimer()/1000), timestamp=os.time(),
        }); return
    end

    -- ── players ───────────────────────────────────────────────
    if route == 'players' then
        local list = GetPlayerList()
        JsonResponse(res, 200, {players=list, count=#list, timestamp=os.time()}); return
    end

    if route == 'players/near' then
        local x, y, radius = tonumber(query.x), tonumber(query.y), tonumber(query.radius) or 100
        if not x or not y then JsonResponse(res, 400, {error='x und y sind Pflicht'}); return end
        local nearby = {}
        for _, p in pairs(players) do
            local d = Dist2D(x, y, p.x, p.y)
            if d <= radius then
                local e = {}; for k,v in pairs(p) do e[k]=v end
                e.distance = math.floor(d*10)/10; table.insert(nearby, e)
            end
        end
        table.sort(nearby, function(a,b) return a.distance < b.distance end)
        JsonResponse(res, 200, {players=nearby, count=#nearby, radius=radius}); return
    end

    if route == 'players/invehicle' then
        local list = {}
        for _, p in pairs(players) do if p.inVeh then table.insert(list, p) end end
        JsonResponse(res, 200, {players=list, count=#list}); return
    end

    local pid = route:match('^player/(%d+)$')
    if pid then
        local p = players[tonumber(pid)]
        if p then JsonResponse(res, 200, p) else JsonResponse(res, 404, {error='Spieler nicht gefunden'}) end
        return
    end

    -- ── markers ───────────────────────────────────────────────
    if route == 'markers' then
        local list = GetMarkerList()
        JsonResponse(res, 200, {markers=list, count=#list, timestamp=os.time()}); return
    end

    if route == 'markers/near' then
        local x, y, radius = tonumber(query.x), tonumber(query.y), tonumber(query.radius) or 100
        if not x or not y then JsonResponse(res, 400, {error='x und y sind Pflicht'}); return end
        local nearby = {}
        for _, m in pairs(markers) do
            local d = Dist2D(x, y, m.x, m.y)
            if d <= radius then
                local e = {}; for k,v in pairs(m) do e[k]=v end
                e.distance = math.floor(d*10)/10; table.insert(nearby, e)
            end
        end
        table.sort(nearby, function(a,b) return a.distance < b.distance end)
        JsonResponse(res, 200, {markers=nearby, count=#nearby, radius=radius}); return
    end

    if route == 'markers/add' then
        local id, x, y = query.id, tonumber(query.x), tonumber(query.y)
        if not id or not x or not y then JsonResponse(res, 400, {error='id, x, y sind Pflicht'}); return end
        markers[id] = {id=id, x=x, y=y, z=tonumber(query.z) or 0,
            label=query.label or id, color=query.color or '#00d4aa',
            icon=query.icon or 'default', group=query.group or 'Sonstiges', source=query.source or 'api'}
        JsonResponse(res, 200, {success=true, id=id}); return
    end

    if route == 'markers/remove' then
        if not query.id then JsonResponse(res, 400, {error='id ist Pflicht'}); return end
        markers[query.id] = nil
        JsonResponse(res, 200, {success=true}); return
    end

    if route == 'markers/clear' then
        local src, n = query.source, 0
        for mid, m in pairs(markers) do
            if not src or m.source == src then markers[mid]=nil; n=n+1 end
        end
        JsonResponse(res, 200, {success=true, removed=n}); return
    end

    if route == 'markers/bulk' and req.method == 'POST' then
        local ok, list = pcall(json.decode, req.body or '')
        if not ok or type(list) ~= 'table' then JsonResponse(res, 400, {error='Body muss JSON-Array sein'}); return end
        local added = 0
        for _, m in ipairs(list) do
            if m.id and m.x and m.y then
                markers[tostring(m.id)] = {id=tostring(m.id), x=tonumber(m.x) or 0, y=tonumber(m.y) or 0,
                    z=tonumber(m.z) or 0, label=m.label or tostring(m.id), color=m.color or '#00d4aa',
                    icon=m.icon or 'default', group=m.group or 'Sonstiges', source=m.source or 'api'}
                added = added + 1
            end
        end
        JsonResponse(res, 200, {success=true, added=added}); return
    end

    local mid = route:match('^markers/([^/]+)$')
    if mid and req.method == 'GET' then
        local m = markers[mid]
        if m then JsonResponse(res, 200, m) else JsonResponse(res, 404, {error='Marker nicht gefunden'}) end
        return
    end

    -- ── zones ─────────────────────────────────────────────────
    if route == 'zones' then
        local list = GetZoneList()
        JsonResponse(res, 200, {zones=list, count=#list, timestamp=os.time()}); return
    end

    if route == 'zones/add' then
        local id = query.id
        if not id then JsonResponse(res, 400, {error='id ist Pflicht'}); return end
        zones[id] = {id=id, type=query.type or 'circle', x=tonumber(query.x) or 0, y=tonumber(query.y) or 0,
            radius=tonumber(query.radius) or 50, label=query.label or id,
            color=query.color or '#3b82f6', fillColor=query.fillColor or query.color or '#3b82f6',
            opacity=tonumber(query.opacity) or 0.3, group=query.group or 'Zonen', source=query.source or 'api'}
        JsonResponse(res, 200, {success=true, id=id}); return
    end

    if route == 'zones/remove' then
        if not query.id then JsonResponse(res, 400, {error='id ist Pflicht'}); return end
        zones[query.id] = nil
        JsonResponse(res, 200, {success=true}); return
    end

    if route == 'zones/clear' then
        local src, n = query.source, 0
        for zid, z in pairs(zones) do
            if not src or z.source == src then zones[zid]=nil; n=n+1 end
        end
        JsonResponse(res, 200, {success=true, removed=n}); return
    end

    if route == 'zones/bulk' and req.method == 'POST' then
        local ok, list = pcall(json.decode, req.body or '')
        if not ok or type(list) ~= 'table' then JsonResponse(res, 400, {error='Body muss JSON-Array sein'}); return end
        local added = 0
        for _, z in ipairs(list) do
            if z.id then
                zones[tostring(z.id)] = {id=tostring(z.id), type=z.type or 'circle',
                    x=tonumber(z.x) or 0, y=tonumber(z.y) or 0, radius=tonumber(z.radius) or 50,
                    label=z.label or tostring(z.id), color=z.color or '#3b82f6',
                    fillColor=z.fillColor or z.color or '#3b82f6', opacity=tonumber(z.opacity) or 0.3,
                    group=z.group or 'Zonen', source=z.source or 'api', points=z.points or nil}
                added = added + 1
            end
        end
        JsonResponse(res, 200, {success=true, added=added}); return
    end

    -- ── vehicles ──────────────────────────────────────────────
    if route == 'vehicles' then
        local list = {}
        for _, p in pairs(players) do
            if p.inVeh then table.insert(list, {
                playerId=p.id, playerName=p.name, vehicle=p.veh,
                x=p.x, y=p.y, z=p.z, heading=p.heading,
            }) end
        end
        JsonResponse(res, 200, {vehicles=list, count=#list, timestamp=os.time()}); return
    end

    if route == 'vehicles/near' then
        local x, y, radius = tonumber(query.x), tonumber(query.y), tonumber(query.radius) or 100
        if not x or not y then JsonResponse(res, 400, {error='x und y sind Pflicht'}); return end
        local nearby = {}
        for _, p in pairs(players) do
            if p.inVeh then
                local d = Dist2D(x, y, p.x, p.y)
                if d <= radius then
                    table.insert(nearby, {playerId=p.id, playerName=p.name, vehicle=p.veh,
                        x=p.x, y=p.y, z=p.z, heading=p.heading, distance=math.floor(d*10)/10})
                end
            end
        end
        table.sort(nearby, function(a,b) return a.distance < b.distance end)
        JsonResponse(res, 200, {vehicles=nearby, count=#nearby, radius=radius}); return
    end

    -- ── events ────────────────────────────────────────────────
    if route == 'events' or route:match('^events') then
        local limit  = math.min(tonumber(query.limit) or 50, Config.MaxEventLog or 200)
        local filter = query.type
        local result = {}
        for _, e in ipairs(eventLog) do
            if not filter or e.type == filter then
                table.insert(result, e)
                if #result >= limit then break end
            end
        end
        JsonResponse(res, 200, {events=result, count=#result, timestamp=os.time()}); return
    end

    JsonResponse(res, 404, { error = 'Not Found', route = route })
end)

print('[d4rk_api] ✓ Gestartet – alle Routen unter /d4rk_api/internal/')
print('[d4rk_api] Secret: ' .. (Config.InternalSecret ~= '' and '✓ Gesetzt' or '⚠ Nicht gesetzt!'))
