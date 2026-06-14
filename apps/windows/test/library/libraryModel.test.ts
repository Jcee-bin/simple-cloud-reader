import {
    getReadingState,
    matchesFilter,
    matchesSearch,
    filterPublications,
    selectContinueReading,
    getProgress,
} from "readium-desktop/renderer/library/components/simpleLibrary/libraryModel";
import { PublicationView } from "readium-desktop/common/views/publication";

const pub = (over: Partial<PublicationView>): PublicationView => ({
    identifier: "id",
    isOpenable: true,
    readingFinished: false,
    documentTitle: "Untitled",
    publicationTitle: "Untitled",
    publicationSubTitle: "",
    authorsLangString: [],
    ...over,
} as PublicationView);

describe("getReadingState", () => {
    it("returns finished when readingFinished is true", () => {
        expect(getReadingState(pub({ readingFinished: true }))).toBe("finished");
    });
    it("returns reading when started but not finished", () => {
        expect(getReadingState(pub({ lastReadTimeStamp: 123 }))).toBe("reading");
    });
    it("returns toRead when never opened", () => {
        expect(getReadingState(pub({}))).toBe("toRead");
    });
    it("treats a zero timestamp as never opened", () => {
        expect(getReadingState(pub({ lastReadTimeStamp: 0 }))).toBe("toRead");
    });
});

describe("matchesFilter", () => {
    it("'all' matches everything", () => {
        expect(matchesFilter(pub({ readingFinished: true }), "all")).toBe(true);
    });
    it("matches the exact reading state", () => {
        expect(matchesFilter(pub({ lastReadTimeStamp: 9 }), "reading")).toBe(true);
        expect(matchesFilter(pub({ lastReadTimeStamp: 9 }), "finished")).toBe(false);
    });
});

describe("matchesSearch", () => {
    it("empty query matches all", () => {
        expect(matchesSearch(pub({ publicationTitle: "Dune" }), "  ", "en")).toBe(true);
    });
    it("matches title case-insensitively", () => {
        expect(matchesSearch(pub({ publicationTitle: "Dune" }), "dun", "en")).toBe(true);
    });
    it("matches author", () => {
        expect(matchesSearch(
            pub({ publicationTitle: "Dune", authorsLangString: ["Frank Herbert"] }),
            "herbert", "en")).toBe(true);
    });
    it("non-match returns false", () => {
        expect(matchesSearch(pub({ publicationTitle: "Dune" }), "sapiens", "en")).toBe(false);
    });
});

describe("filterPublications", () => {
    const list = [
        pub({ identifier: "a", publicationTitle: "Dune", lastReadTimeStamp: 100 }),
        pub({ identifier: "b", publicationTitle: "Sapiens", readingFinished: true }),
        pub({ identifier: "c", publicationTitle: "Educated" }),
    ];
    it("filters by state then search", () => {
        const res = filterPublications(list, "reading", "", "en");
        expect(res.map((p) => p.identifier)).toEqual(["a"]);
    });
    it("combines filter and query", () => {
        const res = filterPublications(list, "all", "edu", "en");
        expect(res.map((p) => p.identifier)).toEqual(["c"]);
    });
});

describe("selectContinueReading", () => {
    it("returns the most recently read in-progress book", () => {
        const list = [
            pub({ identifier: "a", lastReadTimeStamp: 100 }),
            pub({ identifier: "b", lastReadTimeStamp: 300 }),
            pub({ identifier: "c", readingFinished: true, lastReadTimeStamp: 999 }),
        ];
        expect(selectContinueReading(list)?.identifier).toBe("b");
    });
    it("returns undefined when nothing is in progress", () => {
        expect(selectContinueReading([pub({ readingFinished: true })])).toBeUndefined();
    });
});

describe("getProgress", () => {
    it("reads progression from the last reading location", () => {
        const p = pub({ lastReadingLocation: { locator: { href: "x", locations: { progression: 0.42 } } } } as Partial<PublicationView>);
        expect(getProgress(p)).toBeCloseTo(0.42);
    });
    it("returns undefined when absent or out of range", () => {
        expect(getProgress(pub({}))).toBeUndefined();
        const bad = pub({ lastReadingLocation: { locator: { href: "x", locations: { progression: 5 } } } } as Partial<PublicationView>);
        expect(getProgress(bad)).toBeUndefined();
    });
});
