// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as fs from "fs";
import * as path from "path";
import { dialog } from "electron";
import { FORCE_PROD_DB_IN_DEV, USER_DATA_FOLDER } from "readium-desktop/common/constant";
import { getLibraryWindowFromDi, diMainGet } from "readium-desktop/main/di";
import { PublicationView } from "readium-desktop/common/views/publication";
import { SagaGenerator } from "typed-redux-saga";
import { call as callTyped } from "typed-redux-saga/macro";

import { getPublication } from "./getPublication";

declare const __TH__IS_DEV__: boolean;

const coversDir = path.join(
    USER_DATA_FOLDER,
    !FORCE_PROD_DB_IN_DEV && __TH__IS_DEV__ ? "covers-dev" : "covers",
);

export function* selectCoverImage(identifier: string): SagaGenerator<PublicationView> {

    const win = getLibraryWindowFromDi();
    const result = yield* callTyped(() => dialog.showOpenDialog(win, {
        properties: ["openFile"],
        filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "gif"] }],
    }));

    if (result.canceled || !result.filePaths.length) {
        return yield* getPublication(identifier, false);
    }

    const srcPath = result.filePaths[0];
    const ext = path.extname(srcPath).toLowerCase();
    const destPath = path.join(coversDir, `${identifier}${ext}`);

    yield* callTyped(() => {
        if (!fs.existsSync(coversDir)) {
            fs.mkdirSync(coversDir, { recursive: true });
        }
        fs.copyFileSync(srcPath, destPath);
    });

    const publicationRepository = diMainGet("publication-repository");
    const doc = yield* callTyped(() => publicationRepository.get(identifier));
    const newDoc = Object.assign({}, doc, { customCoverImagePath: destPath, customCover: undefined });
    yield* callTyped(() => publicationRepository.save(newDoc));

    return yield* getPublication(identifier, false);
}
