-- FC 27 World Expansion: career event discovery (research script)
--
-- Purpose: find out which career-mode event IDs fire around the manager job
-- market (job offers, accepting a job, being sacked), so the "manage any team"
-- feature can later be automated.
--
-- Uses ONLY the documented Live Editor Lua API v2:
--   AddEventHandler("pre__CareerModeEvent", fn)  (wiki: LUA-API-v2-Events)
--   callback signature (events_manager, event_id, event)
--   print(...)
--
-- How to use:
--   1. Load your career save with Live Editor running.
--   2. Features -> Lua Engine -> paste this file -> Execute.
--   3. Open Manager Market / accept a job offer / advance a few days.
--   4. Copy the Live Editor log and send it back so we can map the IDs.
--
-- Safe: it only prints, it changes nothing in the game.

local seen = {}

local function WorldExpansion_LogCareerEvent(events_manager, event_id, event)
    if not seen[event_id] then
        seen[event_id] = true
        print(string.format("[WorldExpansion] new career event id: %s", tostring(event_id)))
    end
end

AddEventHandler("pre__CareerModeEvent", WorldExpansion_LogCareerEvent)
print("[WorldExpansion] career event logger registered")
