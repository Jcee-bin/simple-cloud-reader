// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { CustomCover } from "readium-desktop/common/models/custom-cover";

export const COVER_PRESETS: CustomCover[] = [
    { topColor: "#5b6b8c", bottomColor: "#3a4a64" }, // slate  (default for our theme)
    { topColor: "#4a7c6f", bottomColor: "#2d5247" }, // teal
    { topColor: "#7c5b8c", bottomColor: "#4f3a64" }, // plum
    { topColor: "#8c6b3a", bottomColor: "#5c4020" }, // amber
    { topColor: "#8c3a4a", bottomColor: "#5c2030" }, // rose
    { topColor: "#3a5c8c", bottomColor: "#1e3a5f" }, // navy
    { topColor: "#4a6b3a", bottomColor: "#2d4a20" }, // forest
    { topColor: "#6b6b6b", bottomColor: "#3a3a3a" }, // charcoal
];
