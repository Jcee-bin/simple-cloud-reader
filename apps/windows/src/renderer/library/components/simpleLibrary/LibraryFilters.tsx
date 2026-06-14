// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as React from "react";
import * as styles from "readium-desktop/renderer/assets/styles/components/simpleLibrary.scss";
import classNames from "classnames";
import { LibraryFilter } from "./libraryModel";

interface IProps {
    filter: LibraryFilter;
    onFilter: (f: LibraryFilter) => void;
    query: string;
    onQuery: (q: string) => void;
    labels: Record<LibraryFilter, string>;
    searchLabel: string;
    searchPlaceholder: string;
    inputRef?: React.RefObject<HTMLInputElement>;
}

const ORDER: LibraryFilter[] = ["all", "reading", "toRead", "finished"];

const LibraryFilters: React.FC<IProps> = (props) => (
    <div className={styles.filters_row}>
        <div className={styles.search_field}>
            <label htmlFor="sc-library-search">{props.searchLabel}</label>
            <input
                id="sc-library-search"
                ref={props.inputRef}
                type="search"
                value={props.query}
                placeholder={props.searchPlaceholder}
                onChange={(e) => props.onQuery(e.target.value)}
            />
        </div>
        <div className={styles.filter_pills} role="group" aria-label={props.searchLabel}>
            {ORDER.map((f) => (
                <button
                    key={f}
                    type="button"
                    aria-pressed={props.filter === f}
                    className={classNames(
                        styles.filter_pill,
                        { [styles.filter_pill_on]: props.filter === f },
                    )}
                    onClick={() => props.onFilter(f)}
                >
                    {props.labels[f]}
                </button>
            ))}
        </div>
    </div>
);

export default LibraryFilters;
