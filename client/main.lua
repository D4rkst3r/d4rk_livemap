--[[
    d4rk_livemap – client/main.lua
    Sendet Spielerposition regelmäßig an den Server
]]

local lastPos   = vector3(0, 0, 0)
local isRunning = false

local function GetPlayerData()
    local ped     = PlayerPedId()
    local coords  = GetEntityCoords(ped)
    local heading = GetEntityHeading(ped)
    local inVeh   = IsPedInAnyVehicle(ped, false)
    local vehName = ''

    if inVeh then
        local veh = GetVehiclePedIsIn(ped, false)
        local hash = GetEntityModel(veh)
        vehName = GetDisplayNameFromVehicleModel(hash) or ''
    end

    return {
        x       = math.floor(coords.x * 10) / 10,
        y       = math.floor(coords.y * 10) / 10,
        z       = math.floor(coords.z * 10) / 10,
        heading = math.floor(heading),
        inVeh   = inVeh,
        veh     = vehName,
    }
end

CreateThread(function()
    while not NetworkIsPlayerActive(PlayerId()) do
        Wait(500)
    end

    isRunning = true
    local lastSentTime = 0

    while isRunning do
        local data    = GetPlayerData()
        local pos     = vector3(data.x, data.y, data.z)
        local now     = GetGameTimer()
        local moved   = #(pos - lastPos) > 0.5
        -- Heartbeat alle 25s damit Server-Timeout (30s) nicht greift
        local timeout = (now - lastSentTime) >= 25000

        if moved or timeout or Config.Debug then
            TriggerServerEvent('d4rk_livemap:updatePosition', data)
            lastPos      = pos
            lastSentTime = now
        end

        Wait(Config.UpdateInterval)
    end
end)

-- Beim Disconnect aufräumen
AddEventHandler('onClientResourceStop', function(res)
    if res == GetCurrentResourceName() then
        isRunning = false
        TriggerServerEvent('d4rk_livemap:playerLeft')
    end
end)
