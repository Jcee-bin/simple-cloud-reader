local CanonicalLocator = require("apps/simplecloud/canonicallocator")

describe("Simple Cloud canonical locator", function()
    it("maps page progress into a bounded canonical locator", function()
        local locator = CanonicalLocator.fromPage("pdf", 50, 100)
        assert.are.same({
            format = "pdf",
            progression = 0.5,
            engine = "koreader",
            engineLocation = {
                page = 50,
                pageCount = 100,
            },
        }, locator)
    end)

    it("restores an exact KOReader page", function()
        local page = CanonicalLocator.toPage({
            format = "pdf",
            progression = 0.5,
            engine = "koreader",
            engineLocation = {
                page = 50,
                pageCount = 100,
            },
        })
        assert.are.equal(50, page)
    end)

    it("falls back to normalized progression", function()
        local page = CanonicalLocator.toPage({
            format = "pdf",
            progression = 0.5,
            engine = "readium",
            engineLocation = {},
        }, 200)
        assert.are.equal(100, page)
    end)
end)
