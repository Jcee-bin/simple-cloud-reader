import type { Locator } from "@r2-navigator-js/electron/common/locator";
import { fromReadiumLocator, toReadiumLocator } from "readium-desktop/common/simpleCloud/canonicalLocator";

describe("Readium canonical locator adapter", () => {
    const readium: Locator = {
        href: "chapter-4.xhtml",
        locations: {
            progression: 0.42,
            cfi: "/6/8!/4/2/14",
        },
    };

    it("maps standard progression into the canonical locator", () => {
        expect(fromReadiumLocator("epub", readium)).toEqual({
            format: "epub",
            progression: 0.42,
            engine: "readium",
            engineLocation: readium,
        });
    });

    it("restores the exact Readium locator", () => {
        expect(toReadiumLocator(fromReadiumLocator("epub", readium))).toEqual(readium);
    });
});
