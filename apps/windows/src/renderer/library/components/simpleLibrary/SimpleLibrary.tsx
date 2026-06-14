// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as React from "react";
import { useDispatch } from "react-redux";
import * as styles from "readium-desktop/renderer/assets/styles/components/simpleLibrary.scss";
import { PublicationView } from "readium-desktop/common/views/publication";
import { readerActions } from "readium-desktop/common/redux/actions";
import { apiAction } from "readium-desktop/renderer/library/apiAction";
import { apiSubscribe } from "readium-desktop/renderer/library/apiSubscribe";
import { TApiMethodName } from "readium-desktop/common/api/api.type";
import LibraryLayout from "readium-desktop/renderer/library/components/layout/LibraryLayout";
import { useTranslator } from "readium-desktop/renderer/common/hooks/useTranslator";
import { useSelector } from "readium-desktop/renderer/common/hooks/useSelector";
import { ICommonRootState } from "readium-desktop/common/redux/states/commonRootState";
import PublicationCard from "../publication/PublicationCard";
import PublicationAddButton from "../catalog/PublicationAddButton";
import {
    LibraryFilter, filterPublications, selectContinueReading,
} from "./libraryModel";
import ResumeHero from "./ResumeHero";
import LibraryFilters from "./LibraryFilters";
import SyncStatusPill from "./SyncStatusPill";
import CoverPicker from "./CoverPicker";
import { CustomCover } from "readium-desktop/common/models/custom-cover";

const SUBSCRIBE_CHANNELS: TApiMethodName[] = [
    "publication/importFromFs",
    "publication/delete",
    "publication/importFromLink",
    "publication/updateTags",
    "publication/updateCover",
    "publication/findAllRefresh",
    "publication/recover",
];

const SimpleLibrary: React.FC = () => {
    const [__] = useTranslator();
    const dispatch = useDispatch();
    const locale = useSelector((state: ICommonRootState) => state.i18n.locale);

    const [pubs, setPubs] = React.useState<PublicationView[] | undefined>(undefined);
    const [filter, setFilter] = React.useState<LibraryFilter>("all");
    const [query, setQuery] = React.useState("");
    const [pickerOpen, setPickerOpen] = React.useState<string | null>(null);

    React.useEffect(() => {
        const refresh = () => {
            apiAction("publication/findAll")
                .then((views) => setPubs(views))
                .catch((e) => console.error("simpleLibrary findAll error", e));
        };
        const unsubscribe = apiSubscribe(SUBSCRIBE_CHANNELS, refresh);
        return () => { if (unsubscribe) { unsubscribe(); } };
    }, []);

    const openReader = React.useCallback(
        (identifier: string) => dispatch(readerActions.openRequest.build(identifier)),
        [dispatch],
    );

    const applycover = React.useCallback(
        (identifier: string, cover: CustomCover) => {
            apiAction("publication/updateCover", identifier, cover)
                .catch((e) => console.error("simpleLibrary updateCover error", e));
        },
        [],
    );

    // All filter labels use existing Thorium en.json keys — no new strings added.
    const filterLabels: Record<LibraryFilter, string> = {
        all: __("catalog.allBooks"),          // "All publications"
        reading: __("publication.onGoing"),   // "In Progress"
        toRead: __("publication.notStarted"), // "Not Started"
        finished: __("publication.read"),     // "Finished"
    };

    const all = pubs || [];
    const resume = selectContinueReading(all);
    const visible = filterPublications(all, filter, query, locale);

    const secondaryHeader = (
        <span style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", height: "53px" }}>
            <PublicationAddButton />
        </span>
    );

    return (
        <LibraryLayout title={__("header.homeTitle")} secondaryHeader={secondaryHeader}>
            <div className={styles.library_root}>
                <div className={styles.top_row}>
                    <SyncStatusPill
                        status="offline"
                        label={__("catalog.noPublicationHelpL2", { importTitle: __("header.importTitle") })}
                    />
                </div>

                {resume ? (
                    <ResumeHero
                        publicationView={resume}
                        locale={locale}
                        sectionLabel={__("catalog.entry.continueReading")}
                        resumeLabel={__("catalog.readBook")}
                        onResume={openReader}
                    />
                ) : null}

                <LibraryFilters
                    filter={filter}
                    onFilter={setFilter}
                    query={query}
                    onQuery={setQuery}
                    labels={filterLabels}
                    searchLabel={__("header.searchTitle")}
                    searchPlaceholder={__("header.searchPlaceholder")}
                />

                {pubs === undefined ? null
                    : all.length === 0 ? (
                        <div className={styles.empty_state}>
                            <h2>{__("catalog.myBooks")}</h2>
                            <p>{__("catalog.noPublicationHelpL1")}</p>
                            <div className={styles.empty_actions}><PublicationAddButton /></div>
                        </div>
                    ) : (
                        <div className={styles.cover_grid}>
                            {visible.map((pub) => (
                                <div key={pub.identifier} className={styles.cover_wrap}>
                                    <PublicationCard
                                        publicationViewMaybeOpds={pub}
                                        isReading={false}
                                    />
                                    <button
                                        type="button"
                                        className={styles.cover_edit_btn}
                                        aria-label="Change cover color"
                                        onClick={(e) => { e.stopPropagation(); setPickerOpen(pub.identifier); }}
                                    >
                                        ✎
                                    </button>
                                    {pickerOpen === pub.identifier ? (
                                        <CoverPicker
                                            identifier={pub.identifier}
                                            onSelect={applycover}
                                            onClose={() => setPickerOpen(null)}
                                        />
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
            </div>
        </LibraryLayout>
    );
};

export default SimpleLibrary;
