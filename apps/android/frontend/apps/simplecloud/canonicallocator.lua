local CanonicalLocator = {}

local function clamp(value)
    return math.max(0, math.min(1, value))
end

function CanonicalLocator.fromPage(format, page, page_count)
    assert(page_count and page_count > 0, "page_count must be positive")
    return {
        format = format,
        progression = clamp(page / page_count),
        engine = "koreader",
        engineLocation = {
            page = page,
            pageCount = page_count,
        },
    }
end

function CanonicalLocator.toPage(locator, fallback_page_count)
    if locator.engine == "koreader"
        and locator.engineLocation
        and locator.engineLocation.page then
        return locator.engineLocation.page
    end
    assert(fallback_page_count and fallback_page_count > 0,
        "fallback_page_count must be positive")
    return math.max(1,
        math.floor(locator.progression * fallback_page_count + 0.5))
end

return CanonicalLocator
