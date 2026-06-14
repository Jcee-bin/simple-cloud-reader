// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as React from "react";
import * as styles from "readium-desktop/renderer/assets/styles/components/simpleLibrary.scss";
import Cover from "readium-desktop/renderer/common/components/Cover";
import { PublicationView } from "readium-desktop/common/views/publication";
import { convertMultiLangStringToString } from "readium-desktop/common/language-string";
import { availableLanguages } from "readium-desktop/common/services/translator";
import { getProgress } from "./libraryModel";

interface IProps {
    publicationView: PublicationView;
    locale: string;
    sectionLabel: string;
    resumeLabel: string;
    onResume: (identifier: string) => void;
}

const ResumeHero: React.FC<IProps> = (props) => {
    const { publicationView: pub, locale } = props;
    const loc = locale as keyof typeof availableLanguages;
    const title = convertMultiLangStringToString(pub.publicationTitle || pub.documentTitle, loc);
    const authors = (pub.authorsLangString || [])
        .map((a) => convertMultiLangStringToString(a, loc))
        .filter(Boolean)
        .join(", ");
    const progress = getProgress(pub);
    const percent = progress !== undefined ? Math.round(progress * 100) : undefined;

    return (
        <section className={styles.resume_section} aria-label={props.sectionLabel}>
            <p className={styles.resume_kicker}>{props.sectionLabel}</p>
            <div className={styles.resume_card}>
                <div className={styles.resume_cover}>
                    <Cover publicationViewMaybeOpds={pub} />
                </div>
                <div className={styles.resume_meta}>
                    <h2 className={styles.resume_title}>{title}</h2>
                    <p className={styles.resume_sub}>
                        {[authors, percent !== undefined ? `${percent}%` : undefined]
                            .filter(Boolean).join(" · ")}
                    </p>
                    {percent !== undefined ? (
                        <div className={styles.resume_progress} aria-hidden>
                            <div
                                className={styles.resume_progress_fill}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    ) : null}
                </div>
                <button
                    type="button"
                    className={styles.resume_button}
                    onClick={() => props.onResume(pub.identifier)}
                >
                    {props.resumeLabel}
                </button>
            </div>
        </section>
    );
};

export default ResumeHero;
