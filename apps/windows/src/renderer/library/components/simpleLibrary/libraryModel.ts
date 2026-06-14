// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { PublicationView } from "readium-desktop/common/views/publication";
import { convertMultiLangStringToString } from "readium-desktop/common/language-string";
import { availableLanguages } from "readium-desktop/common/services/translator";

export type ReadingState = "reading" | "toRead" | "finished";
export type LibraryFilter = "all" | ReadingState;

export const getReadingState = (
    pub: Pick<PublicationView, "readingFinished" | "lastReadTimeStamp">,
): ReadingState => {
    if (pub.readingFinished) {
        return "finished";
    }
    if (pub.lastReadTimeStamp && pub.lastReadTimeStamp > 0) {
        return "reading";
    }
    return "toRead";
};

export const matchesFilter = (pub: PublicationView, filter: LibraryFilter): boolean =>
    filter === "all" || getReadingState(pub) === filter;

export const publicationSearchText = (pub: PublicationView, locale: string): string => {
    const loc = locale as keyof typeof availableLanguages;
    const title = convertMultiLangStringToString(
        pub.publicationTitle || pub.documentTitle, loc) || "";
    const authors = (pub.authorsLangString || [])
        .map((a) => convertMultiLangStringToString(a, loc) || "")
        .join(" ");
    return `${title} ${authors}`.toLowerCase();
};

export const matchesSearch = (pub: PublicationView, query: string, locale: string): boolean => {
    const q = (query || "").trim().toLowerCase();
    if (!q) {
        return true;
    }
    return publicationSearchText(pub, locale).includes(q);
};

export const filterPublications = (
    pubs: PublicationView[],
    filter: LibraryFilter,
    query: string,
    locale: string,
): PublicationView[] =>
    pubs.filter((p) => matchesFilter(p, filter) && matchesSearch(p, query, locale));

export const selectContinueReading = (
    pubs: PublicationView[],
): PublicationView | undefined =>
    pubs
        .filter((p) => getReadingState(p) === "reading")
        .sort((a, b) => (b.lastReadTimeStamp || 0) - (a.lastReadTimeStamp || 0))[0];

export const getProgress = (pub: PublicationView): number | undefined => {
    const progression = pub.lastReadingLocation?.locator?.locations?.progression;
    if (typeof progression !== "number" || progression < 0 || progression > 1) {
        return undefined;
    }
    return progression;
};
