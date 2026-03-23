local lastPos = vector3(0,0,0)
local isRunning = false

local function GetPlayerData()
    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    local inVeh = IsPedInAnyVehicle(ped, false)
    local vehName = ''
    if inVeh then
        vehName = GetDisplayNameFromVehicleModel(GetEntityModel(GetVehiclePedIsIn(ped,false))) or ''
    end
    return {
        x=math.floor(coords.x*10)/10, y=math.floor(coords.y*10)/10, z=math.floor(coords.z*10)/10,
        heading=math.floor(GetEntityHeading(ped)), inVeh=inVeh, veh=vehName,
    }
end

CreateThread(function()
    while not NetworkIsPlayerActive(PlayerId()) do Wait(500) end
    isRunning = true
    local lastSentTime = 0
    while isRunning do
        local data = GetPlayerData()
        local pos  = vector3(data.x, data.y, data.z)
        local now  = GetGameTimer()
        if #(pos-lastPos) > 0.5 or (now-lastSentTime) >= 25000 or Config.Debug then
            TriggerServerEvent('d4rk_api:updatePosition', data)
            lastPos = pos; lastSentTime = now
        end
        Wait(Config.UpdateInterval)
    end
end)

AddEventHandler('onClientResourceStop', function(res)
    if res == GetCurrentResourceName() then
        isRunning = false
        TriggerServerEvent('d4rk_api:playerLeft')
    end
end)
