local logger = require("logger")
local millennium = require("millennium")
local http = require("http")

local CACHE_TTL_SECONDS = 3600
local USER_AGENT = "ProtonDB-Library-Badges/2.0"
local ERROR_BODY = '{"tier":"error"}'
local NOT_FOUND_BODY = '{"tier":"unknown","total":0}'

local cache = {}

local function cached_body(appId)
    local entry = cache[appId]
    if entry and os.time() - entry.timestamp < CACHE_TTL_SECONDS then
        return entry.body
    end
    return nil
end

local function store(appId, body)
    cache[appId] = { body = body, timestamp = os.time() }
    return body
end

local function summary_url(appId)
    return "https://www.protondb.com/api/v1/reports/summaries/" .. appId .. ".json"
end

function fetch_protondb_data(appId)
    appId = tostring(appId)
    if not appId:match("^%d+$") then
        logger:error("rejected non-numeric appId: " .. appId)
        return ERROR_BODY
    end

    local hit = cached_body(appId)
    if hit then return hit end

    local ok, response = pcall(http.get, summary_url(appId), {
        timeout = 10,
        follow_redirects = true,
        headers = { ["User-Agent"] = USER_AGENT },
    })
    if not ok or not response then
        logger:error("http.get failed for appId " .. appId .. ": " .. tostring(response))
        return ERROR_BODY
    end

    if response.status == 200 then return store(appId, response.body) end
    if response.status == 404 then return store(appId, NOT_FOUND_BODY) end

    logger:error("ProtonDB HTTP " .. tostring(response.status) .. " for appId " .. appId)
    return ERROR_BODY
end

function clear_protondb_cache()
    cache = {}
    return "ok"
end

local function on_load()
    logger:info("ProtonDB Library Badges loaded")
    millennium.ready()
end

local function on_unload() end
local function on_frontend_loaded() end

return {
    on_load = on_load,
    on_unload = on_unload,
    on_frontend_loaded = on_frontend_loaded,
}
