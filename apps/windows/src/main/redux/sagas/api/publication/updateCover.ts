// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { call as callTyped } from "typed-redux-saga/macro";
import { PublicationView } from "readium-desktop/common/views/publication";
import { CustomCover } from "readium-desktop/common/models/custom-cover";
import { diMainGet } from "readium-desktop/main/di";
import { SagaGenerator } from "typed-redux-saga";

import { getPublication } from "./getPublication";

export function* updateCover(identifier: string, customCover: CustomCover): SagaGenerator<PublicationView> {

    const publicationRepository = diMainGet("publication-repository");

    const doc = yield* callTyped(() => publicationRepository.get(identifier));
    const newDoc = Object.assign({}, doc, { customCover });

    yield* callTyped(() => publicationRepository.save(newDoc));

    return yield* getPublication(identifier, false);
}
