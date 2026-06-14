// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as React from "react";
import * as styles from "readium-desktop/renderer/assets/styles/components/simpleLibrary.scss";
import classNames from "classnames";

export type SyncStatus = "synced" | "syncing" | "offline" | "attention";

const GLYPH: Record<SyncStatus, string> = {
    synced: "●",
    syncing: "◍",
    offline: "○",
    attention: "▲",
};

const CLASS: Record<SyncStatus, string> = {
    synced: styles.sync_synced,
    syncing: styles.sync_syncing,
    offline: styles.sync_offline,
    attention: styles.sync_attention,
};

interface IProps {
    status: SyncStatus;
    label: string;
}

const SyncStatusPill: React.FC<IProps> = ({ status, label }) => (
    <span className={classNames(styles.sync_pill, CLASS[status])} role="status">
        <span aria-hidden>{GLYPH[status]}</span>
        <span>{label}</span>
    </span>
);

export default SyncStatusPill;
