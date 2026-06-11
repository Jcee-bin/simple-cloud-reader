import type { Locator } from "@r2-navigator-js/electron/common/locator";
import type { CanonicalLocator } from "@simple-cloud-reader/sync-contract";

export function fromReadiumLocator(
    format: string,
    locator: Locator,
): CanonicalLocator {
    return {
        format,
        progression: locator.locations.progression ?? 0,
        engine: "readium",
        engineLocation: JSON.parse(
            JSON.stringify(locator),
        ) as Record<string, unknown>,
    };
}

export function toReadiumLocator(locator: CanonicalLocator): Locator {
    if (locator.engine !== "readium") {
        throw new Error(`Expected readium locator, received ${locator.engine}`);
    }

    return locator.engineLocation as unknown as Locator;
}
