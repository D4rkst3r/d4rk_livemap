--[[
    ╔══════════════════════════════════════════════════════╗
    ║         d4rk_livemap – server/auth.lua               ║
    ║         Discord OAuth2 + Session-Verwaltung          ║
    ╚══════════════════════════════════════════════════════╝

    Globale Funktionen (werden in server/main.lua genutzt):
        Auth_ValidateSession(cookieHeader) → ok, session
        Auth_HandleCallback(code)          → token, error
        Auth_GetOAuthURL()                 → string
        Auth_GetSessionInfo(cookieHeader)  → session|nil
        Sessions                           → Tabelle aller aktiven Sessions
]]

local DISCORD_API = 'https://discord.com/api/v10'

-- Globale Session-Tabelle: token → { userId, username, avatar, expires }
Sessions = {}

-- ─────────────────────────────────────────────────────────
-- Hilfsfunktionen
-- ─────────────────────────────────────────────────────────

local function UrlEncode(str)
    return (str:gsub('[^%w%-_%.~]', function(c)
        return ('%%%02X'):format(c:byte())
    end))
end

-- HTTP-Request als synchroner Aufruf via Promise (FiveM Coroutine-Context)
local function HttpGet(url, headers)
    local p = promise.new()
    PerformHttpRequest(url, function(code, body, _)
        p:resolve({ code = code, body = body or '' })
    end, 'GET', '', headers or {})
    return Citizen.Await(p)
end

local function HttpPost(url, body, headers)
    local p = promise.new()
    PerformHttpRequest(url, function(code, responseBody, _)
        p:resolve({ code = code, body = responseBody or '' })
    end, 'POST', body or '', headers or {})
    return Citizen.Await(p)
end

local function GenerateToken()
    local chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    local t = {}
    for i = 1, 48 do
        local idx = math.random(1, #chars)
        t[i] = chars:sub(idx, idx)
    end
    return table.concat(t)
end

local function ParseCookie(cookieHeader, name)
    if not cookieHeader then return nil end
    return cookieHeader:match(name .. '=([^;%s]+)')
end

-- ─────────────────────────────────────────────────────────
-- Öffentliche Auth-Funktionen
-- ─────────────────────────────────────────────────────────

-- Erstellt die Discord OAuth2-URL mit den richtigen Scopes
function Auth_GetOAuthURL()
    -- guilds.members.read → kann Rollen lesen (erfordert Bot im Server)
    -- guilds             → kann nur Guild-Mitgliedschaft prüfen
    local scopes = (Config.Discord.RequiredRoles and #Config.Discord.RequiredRoles > 0)
        and 'identify%20guilds.members.read'
        or  'identify%20guilds'

    return ('https://discord.com/api/oauth2/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=%s&prompt=none'):format(
        Config.Discord.ClientID,
        UrlEncode(Config.Discord.RedirectURI),
        scopes
    )
end

-- Prüft ob der Cookie eine gültige Session enthält
-- Rückgabe: ok (bool), session (table|nil)
function Auth_ValidateSession(cookieHeader)
    if not Config.Discord or not Config.Discord.Enabled then
        return true, nil  -- Auth deaktiviert → immer erlaubt
    end
    local token = ParseCookie(cookieHeader, 'dm_session')
    if not token or token == '' then return false, nil end

    local sess = Sessions[token]
    if not sess then return false, nil end

    if os.time() > sess.expires then
        Sessions[token] = nil
        return false, nil
    end

    return true, sess
end

-- Gibt Session-Daten zurück (oder nil)
function Auth_GetSessionInfo(cookieHeader)
    local ok, sess = Auth_ValidateSession(cookieHeader)
    return ok and sess or nil
end

-- Verarbeitet den Discord OAuth2-Callback
-- Rückgabe: token (string|nil), error (string|nil)
--   error-Codes: no_code | token_error | user_error | not_in_guild | no_role
function Auth_HandleCallback(code)
    if not code or code == '' then
        return nil, 'no_code'
    end

    -- ── Step 1: Authorization Code → Access Token ──────────
    local formBody = table.concat({
        'client_id='     .. UrlEncode(Config.Discord.ClientID),
        'client_secret=' .. UrlEncode(Config.Discord.ClientSecret),
        'grant_type=authorization_code',
        'code='          .. UrlEncode(code),
        'redirect_uri='  .. UrlEncode(Config.Discord.RedirectURI),
    }, '&')

    local tokenResp = HttpPost(
        DISCORD_API .. '/oauth2/token',
        formBody,
        { ['Content-Type'] = 'application/x-www-form-urlencoded' }
    )

    if tokenResp.code ~= 200 then
        print('[d4rk_livemap][Auth] Token-Fehler HTTP ' .. tokenResp.code .. ': ' .. tokenResp.body)
        return nil, 'token_error'
    end

    local tokenData = json.decode(tokenResp.body)
    if not tokenData or not tokenData.access_token then
        return nil, 'token_error'
    end

    local at = tokenData.access_token

    -- ── Step 2: Nutzer-Info abrufen ────────────────────────
    local userResp = HttpGet(
        DISCORD_API .. '/users/@me',
        { ['Authorization'] = 'Bearer ' .. at }
    )

    if userResp.code ~= 200 then
        return nil, 'user_error'
    end

    local user = json.decode(userResp.body)
    if not user or not user.id then
        return nil, 'user_error'
    end

    -- ── Step 3: Guild + Rollen prüfen ─────────────────────
    local checkRoles = Config.Discord.RequiredRoles and #Config.Discord.RequiredRoles > 0

    if checkRoles then
        -- guilds.members.read Scope: Rollen lesen (Bot im Server benötigt)
        local memberResp = HttpGet(
            DISCORD_API .. '/users/@me/guilds/' .. Config.Discord.GuildID .. '/member',
            { ['Authorization'] = 'Bearer ' .. at }
        )

        if memberResp.code ~= 200 then
            -- 404 = nicht im Server; 403 = Bot fehlt
            print('[d4rk_livemap][Auth] Guild-Member HTTP ' .. memberResp.code .. ' für ' .. user.username)
            return nil, 'not_in_guild'
        end

        local member = json.decode(memberResp.body)
        if not member or not member.roles then
            return nil, 'not_in_guild'
        end

        -- ODER-Verknüpfung: eine der RequiredRoles reicht
        local hasRole = false
        for _, reqRole in ipairs(Config.Discord.RequiredRoles) do
            for _, r in ipairs(member.roles) do
                if tostring(r) == tostring(reqRole) then
                    hasRole = true; break
                end
            end
            if hasRole then break end
        end

        if not hasRole then
            print('[d4rk_livemap][Auth] Rolle fehlt für ' .. user.username)
            return nil, 'no_role'
        end
    else
        -- Nur guilds Scope: Guild-Mitgliedschaft prüfen
        local guildsResp = HttpGet(
            DISCORD_API .. '/users/@me/guilds',
            { ['Authorization'] = 'Bearer ' .. at }
        )

        if guildsResp.code ~= 200 then
            return nil, 'user_error'
        end

        local guilds = json.decode(guildsResp.body)
        local inGuild = false

        if guilds then
            for _, g in ipairs(guilds) do
                if tostring(g.id) == tostring(Config.Discord.GuildID) then
                    inGuild = true; break
                end
            end
        end

        if not inGuild then
            print('[d4rk_livemap][Auth] Nicht im Guild: ' .. user.username)
            return nil, 'not_in_guild'
        end
    end

    -- ── Step 4: Session anlegen ────────────────────────────
    local token = GenerateToken()

    -- Avatar-URL aufbauen
    local avatar = user.avatar
        and ('https://cdn.discordapp.com/avatars/%s/%s.png?size=64'):format(user.id, user.avatar)
        or  ('https://cdn.discordapp.com/embed/avatars/%d.png'):format(
                math.floor((tonumber(user.id) or 0) % 5)
            )

    -- Nutzername: neue Discord-Usernames haben keinen Discriminator mehr
    local displayName = user.global_name or user.username
    if user.discriminator and user.discriminator ~= '0' then
        displayName = displayName .. '#' .. user.discriminator
    end

    Sessions[token] = {
        userId      = user.id,
        username    = displayName,
        avatar      = avatar,
        expires     = os.time() + (Config.Discord.SessionExpiry or 86400),
        loginAt     = os.time(),
    }

    print(('[d4rk_livemap][Auth] ✓ Login: %s (%s)'):format(displayName, user.id))
    return token, nil
end

-- Löscht eine Session anhand des Cookie-Headers
function Auth_Logout(cookieHeader)
    local token = ParseCookie(cookieHeader, 'dm_session')
    if token and Sessions[token] then
        local name = Sessions[token].username
        Sessions[token] = nil
        print(('[d4rk_livemap][Auth] Logout: %s'):format(name or '?'))
    end
end

-- ─────────────────────────────────────────────────────────
-- Session-Cleanup Thread
-- ─────────────────────────────────────────────────────────

CreateThread(function()
    while true do
        Wait(300000)  -- alle 5 Minuten
        local now, removed = os.time(), 0
        for t, s in pairs(Sessions) do
            if now > s.expires then
                Sessions[t] = nil
                removed = removed + 1
            end
        end
        if Config.Debug and removed > 0 then
            print(('[d4rk_livemap][Auth] %d abgelaufene Session(s) entfernt'):format(removed))
        end
    end
end)
